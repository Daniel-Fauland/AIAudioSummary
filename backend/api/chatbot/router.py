import asyncio
import json

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from models.chatbot import ChatRequest, ChatResponse
from models.llm import TokenUsage
from service.chatbot.core import ChatbotService
from service.realtime.core import RealtimeTranscriptionService
from utils.logging import logger

chatbot_router = APIRouter(prefix="/chatbot")
service = ChatbotService()
realtime_service = RealtimeTranscriptionService()


@chatbot_router.post("/chat", response_model=ChatResponse, status_code=200)
async def chat(request: ChatRequest):
    """Chat with the AI assistant. Supports streaming."""
    try:
        result = await service.chat(request)
        if request.stream:
            # Eagerly fetch the first chunk to catch connection/auth errors
            # before committing to a 200 StreamingResponse.
            gen = result.__aiter__()
            try:
                first_chunk = await gen.__anext__()
            except StopAsyncIteration:
                return StreamingResponse(iter([]), media_type="text/plain")

            async def _with_first():
                yield first_chunk
                async for chunk in gen:
                    yield chunk

            return StreamingResponse(_with_first(), media_type="text/plain")
        else:
            output, usage = result
            token_usage = None
            try:
                token_usage = TokenUsage(
                    input_tokens=usage.request_tokens or 0,
                    output_tokens=usage.response_tokens or 0,
                    total_tokens=(usage.request_tokens or 0) + (usage.response_tokens or 0),
                )
            except Exception:
                pass
            return ChatResponse(content=output, usage=token_usage)
    except Exception as e:
        error_msg = str(e).lower()
        print(f"[CHATBOT ERROR] {type(e).__name__}: {e}", flush=True)
        if "auth" in error_msg or "api key" in error_msg or "api_key" in error_msg or "unauthorized" in error_msg or "invalid x-api-key" in error_msg or "invalid api key" in error_msg:
            raise HTTPException(status_code=401, detail="Invalid API key")
        elif "model" in error_msg and ("not found" in error_msg or "does not exist" in error_msg or "not exist" in error_msg):
            raise HTTPException(status_code=400, detail="Model not found")
        elif "429" in error_msg or "rate limit" in error_msg or "rate_limit" in error_msg or "tokens per minute" in error_msg:
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait a moment and try again.")
        elif (
            "context_length" in error_msg
            or "context window" in error_msg
            or "too long" in error_msg
            or "max_tokens" in error_msg
            or "maximum context length" in error_msg
            or "token limit" in error_msg
        ):
            raise HTTPException(status_code=413, detail="Message too long for model context window. Try clearing chat history or disabling the transcript.")
        else:
            raise HTTPException(status_code=502, detail="Chat provider error")


@chatbot_router.get("/knowledge")
async def knowledge_status():
    """Return the loaded status of the knowledge base."""
    return service.get_knowledge_status()


@chatbot_router.websocket("/ws/voice")
async def chatbot_voice(ws: WebSocket):
    """Persistent voice-to-text relay for chatbot input.

    The WebSocket stays open across multiple recording sessions so that
    subsequent mic-presses start transcribing almost instantly (no AAI
    handshake delay).

    Protocol:
    1. Client sends init JSON: {"api_key": "...", "sample_rate": 16000}
    2. Server responds with {"type": "ready"}
    3. Client sends {"type": "start"} to begin a recording session
    4. Server connects to AssemblyAI, responds {"type": "recording"}
    5. Client sends binary audio frames, server relays and returns
       {"type": "turn", "transcript": "...", "is_final": true/false}
    6. Client sends {"type": "stop"} to end the session
    7. Steps 3-6 can repeat for multiple sessions
    8. WebSocket close triggers full teardown
    """
    await ws.accept()

    aai_ws = None
    aai_relay_task = None
    disconnect_event = asyncio.Event()

    try:
        # Wait for init message
        init_raw = await ws.receive_text()
        init_msg = json.loads(init_raw)

        api_key = init_msg.get("api_key")
        sample_rate = init_msg.get("sample_rate", 16000)

        if not api_key:
            await ws.send_json({"type": "error", "message": "API key required"})
            await ws.close()
            return

        await ws.send_json({"type": "ready"})

        async def relay_aai_to_browser(aai_conn):
            """Relay transcript events from one AAI session to the browser."""
            try:
                while not disconnect_event.is_set():
                    try:
                        raw = await aai_conn.recv()
                    except Exception as e:
                        if disconnect_event.is_set():
                            return
                        logger.warning(f"Chatbot voice AAI connection lost: {e}")
                        try:
                            await ws.send_json({"type": "session_ended"})
                        except Exception:
                            pass
                        return

                    event = json.loads(raw)
                    msg_type = event.get("type", "")

                    if msg_type == "Turn":
                        transcript = event.get("transcript", "")
                        is_eos = event.get("end_of_turn", False)
                        is_formatted = event.get("turn_is_formatted", False)

                        # Skip unformatted end-of-turn (AAI sends two events)
                        if is_eos and not is_formatted:
                            continue

                        if is_formatted and transcript:
                            await ws.send_json({
                                "type": "turn",
                                "transcript": transcript,
                                "is_final": True,
                            })
                        elif not is_eos and transcript:
                            await ws.send_json({
                                "type": "turn",
                                "transcript": transcript,
                                "is_final": False,
                            })

                    elif msg_type == "Error":
                        error_msg = event.get("error", "Unknown AssemblyAI error")
                        logger.error(f"Chatbot voice AAI error: {error_msg}")
                        await ws.send_json({"type": "error", "message": error_msg})

                    elif msg_type == "Termination":
                        break
            except asyncio.CancelledError:
                pass
            except Exception as e:
                if not disconnect_event.is_set():
                    logger.error(f"chatbot voice aai relay error: {e}")

        async def stop_session():
            """Terminate current AAI session if active."""
            nonlocal aai_ws, aai_relay_task
            if aai_relay_task:
                aai_relay_task.cancel()
                try:
                    await aai_relay_task
                except (asyncio.CancelledError, Exception):
                    pass
                aai_relay_task = None
            if aai_ws:
                try:
                    await realtime_service.terminate(aai_ws)
                except Exception:
                    pass
                aai_ws = None

        # Main message loop — stays open for the lifetime of the chatbot
        while True:
            message = await ws.receive()

            if message.get("type") == "websocket.disconnect":
                break

            if "bytes" in message and message["bytes"]:
                # Forward audio to AAI if a session is active
                if aai_ws:
                    try:
                        await realtime_service.send_audio(aai_ws, message["bytes"])
                    except Exception:
                        await stop_session()
                        try:
                            await ws.send_json({"type": "session_ended"})
                        except Exception:
                            pass

            elif "text" in message and message["text"]:
                data = json.loads(message["text"])
                cmd = data.get("type")

                if cmd == "start":
                    # Stop any lingering session first
                    await stop_session()
                    try:
                        aai_ws = await realtime_service.connect(api_key, sample_rate)
                        aai_relay_task = asyncio.create_task(
                            relay_aai_to_browser(aai_ws)
                        )
                        await ws.send_json({"type": "recording"})
                    except Exception as e:
                        aai_ws = None
                        error_msg = str(e).lower()
                        if "401" in error_msg or "auth" in error_msg:
                            await ws.send_json({"type": "error", "message": "Invalid AssemblyAI API key"})
                        else:
                            await ws.send_json({"type": "error", "message": f"Failed to connect to AssemblyAI: {e}"})

                elif cmd == "stop":
                    await stop_session()

    except WebSocketDisconnect:
        logger.info("Chatbot voice WebSocket disconnected")
    except Exception as e:
        logger.error(f"Chatbot voice error: {e}")
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        disconnect_event.set()
        if aai_relay_task:
            aai_relay_task.cancel()
            try:
                await aai_relay_task
            except (asyncio.CancelledError, Exception):
                pass
        if aai_ws:
            try:
                await realtime_service.terminate(aai_ws)
            except Exception:
                pass
        try:
            await ws.close()
        except Exception:
            pass
