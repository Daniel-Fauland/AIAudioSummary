import asyncio
import json

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from models.chatbot import ChatRequest, ChatResponse
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
            return StreamingResponse(result, media_type="text/plain")
        else:
            return ChatResponse(content=result)
    except Exception as e:
        error_msg = str(e).lower()
        logger.error(f"Chatbot error: {e}")
        if "auth" in error_msg or "api key" in error_msg or "api_key" in error_msg or "unauthorized" in error_msg or "invalid x-api-key" in error_msg or "invalid api key" in error_msg:
            raise HTTPException(status_code=401, detail="Invalid API key")
        elif "model" in error_msg and ("not found" in error_msg or "does not exist" in error_msg or "not exist" in error_msg):
            raise HTTPException(status_code=400, detail="Model not found")
        else:
            raise HTTPException(status_code=502, detail="Chat provider error")


@chatbot_router.get("/knowledge")
async def knowledge_status():
    """Return the loaded status of the knowledge base."""
    return service.get_knowledge_status()


@chatbot_router.websocket("/ws/voice")
async def chatbot_voice(ws: WebSocket):
    """Simplified voice-to-text relay for chatbot input.

    Protocol:
    1. Client sends init JSON: {"api_key": "...", "sample_rate": 16000}
    2. Client sends binary audio frames
    3. Server relays to AssemblyAI and returns transcript events:
       {"type": "turn", "transcript": "...", "is_final": true/false}
    4. Client sends {"type": "stop"} to end
    """
    await ws.accept()

    aai_ws = None

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

        # Connect to AssemblyAI
        try:
            aai_ws = await realtime_service.connect(api_key, sample_rate)
        except Exception as e:
            error_msg = str(e).lower()
            if "401" in error_msg or "auth" in error_msg:
                await ws.send_json({"type": "error", "message": "Invalid AssemblyAI API key"})
            else:
                await ws.send_json({"type": "error", "message": f"Failed to connect to AssemblyAI: {e}"})
            await ws.close()
            return

        await ws.send_json({"type": "ready"})

        stop_event = asyncio.Event()

        async def browser_to_aai():
            """Forward audio from browser to AssemblyAI."""
            try:
                while not stop_event.is_set():
                    message = await ws.receive()

                    if message.get("type") == "websocket.disconnect":
                        stop_event.set()
                        return

                    if "bytes" in message and message["bytes"]:
                        try:
                            await realtime_service.send_audio(aai_ws, message["bytes"])
                        except Exception:
                            stop_event.set()
                            return

                    elif "text" in message and message["text"]:
                        data = json.loads(message["text"])
                        if data.get("type") == "stop":
                            stop_event.set()
                            return
            except WebSocketDisconnect:
                stop_event.set()
            except Exception as e:
                logger.error(f"chatbot voice browser_to_aai error: {e}")
                stop_event.set()

        async def aai_to_browser():
            """Forward transcript events from AssemblyAI to browser."""
            try:
                while not stop_event.is_set():
                    try:
                        raw = await aai_ws.recv()
                    except Exception as e:
                        if stop_event.is_set():
                            return
                        logger.warning(f"Chatbot voice AAI connection lost: {e}")
                        stop_event.set()
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

            except Exception as e:
                if not stop_event.is_set():
                    logger.error(f"chatbot voice aai_to_browser error: {e}")
                    stop_event.set()

        task_b2a = asyncio.create_task(browser_to_aai())
        task_a2b = asyncio.create_task(aai_to_browser())

        try:
            _, pending = await asyncio.wait(
                [task_b2a, task_a2b],
                return_when=asyncio.FIRST_COMPLETED,
            )
            stop_event.set()
            for task in pending:
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass
        except Exception:
            stop_event.set()
            task_b2a.cancel()
            task_a2b.cancel()

    except WebSocketDisconnect:
        logger.info("Chatbot voice WebSocket disconnected")
    except Exception as e:
        logger.error(f"Chatbot voice error: {e}")
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        if aai_ws:
            try:
                await realtime_service.terminate(aai_ws)
            except Exception:
                pass
        try:
            await ws.close()
        except Exception:
            pass
