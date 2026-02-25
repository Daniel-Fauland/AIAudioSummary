import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Body, HTTPException, WebSocket, WebSocketDisconnect
from langdetect import LangDetectException, detect
from pydantic_ai import Agent
from pydantic_ai.settings import ModelSettings

from models.realtime import IncrementalSummaryRequest, IncrementalSummaryResponse
from service.llm.core import LLMService
from service.realtime.core import RealtimeTranscriptionService
from service.realtime.session import SessionManager
from utils.logging import logger

# --- Language detection ---

_LANG_CODE_MAP: dict[str, str] = {
    "en": "English",
    "de": "German",
    "fr": "French",
    "es": "Spanish",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "pl": "Polish",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "tr": "Turkish",
    "sv": "Swedish",
    "da": "Danish",
    "fi": "Finnish",
    "cs": "Czech",
    "sk": "Slovak",
    "hu": "Hungarian",
    "ro": "Romanian",
    "uk": "Ukrainian",
    "zh-cn": "Chinese",
    "zh-tw": "Chinese (Traditional)",
}


def _detect_language(text: str) -> str:
    try:
        code = detect(text)
        return _LANG_CODE_MAP.get(code, "English")
    except LangDetectException:
        return "English"


realtime_router = APIRouter()
service = RealtimeTranscriptionService()
session_manager = SessionManager()
llm_service = LLMService()

MAX_RECONNECT_ATTEMPTS = 3
RECONNECT_BASE_DELAY = 1  # seconds


@realtime_router.post(
    "/createIncrementalSummary",
    status_code=200,
    response_model=IncrementalSummaryResponse,
)
async def create_incremental_summary(
    request: IncrementalSummaryRequest = Body(...),
):
    """Generate or update a summary incrementally from a realtime transcript."""
    try:
        from models.llm import LLMProvider

        model_name = request.model
        if request.provider == LLMProvider.AZURE_OPENAI and request.azure_config:
            model_name = request.azure_config.deployment_name

        model = llm_service._create_model(
            provider=request.provider,
            model_name=model_name,
            api_key=request.api_key,
            azure_config=request.azure_config,
            langdock_config=request.langdock_config,
        )

        # Detect language from the transcript; substitute {language} in the prompt
        language = _detect_language(request.full_transcript)
        system_prompt = request.system_prompt.replace("{language}", language)

        # Build user prompt based on mode
        if request.is_full_recompute or request.previous_summary is None:
            user_prompt = (
                f"Create a structured summary of the following transcript:\n\n"
                f"{request.full_transcript}"
            )
        else:
            user_prompt = (
                f"Current summary:\n{request.previous_summary}\n\n"
                f"New transcript (only update sections directly relevant to this):\n"
                f"{request.new_transcript_chunk}\n\n"
                f"Update the summary. Preserve all unchanged sections verbatim."
            )

        agent = Agent(
            model,
            system_prompt=system_prompt,
            model_settings=ModelSettings(temperature=0.1),
        )

        result = await agent.run(user_prompt)

        return IncrementalSummaryResponse(
            summary=result.output,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )

    except Exception as e:
        error_msg = str(e).lower()
        provider_name = request.provider.value

        if "auth" in error_msg or "api key" in error_msg or "unauthorized" in error_msg or "invalid x-api-key" in error_msg or "invalid api key" in error_msg:
            raise HTTPException(
                status_code=401,
                detail=f"Invalid API key for {provider_name}",
            )

        if "model" in error_msg and ("not found" in error_msg or "does not exist" in error_msg or "not exist" in error_msg):
            raise HTTPException(
                status_code=400,
                detail=f"Model '{request.model}' not found for provider {provider_name}",
            )

        logger.error(f"LLM provider error ({provider_name}): {e}")
        raise HTTPException(
            status_code=502,
            detail=f"LLM provider error ({provider_name}): {str(e)}",
        )


@realtime_router.websocket("/ws/realtime")
async def realtime_transcription(ws: WebSocket):
    await ws.accept()

    aai_ws = None
    session_id = None

    try:
        # Step 1: Receive init message with api_key and session_id
        init_raw = await ws.receive_text()
        init_msg = json.loads(init_raw)

        api_key = init_msg.get("api_key")
        session_id = init_msg.get("session_id")
        sample_rate = init_msg.get("sample_rate", 16000)

        if not api_key or not session_id:
            await ws.send_json({"type": "error", "message": "api_key and session_id are required"})
            await ws.close()
            return

        # Step 2: Create session
        await session_manager.create_session(session_id)

        # Step 3: Connect to AssemblyAI
        try:
            aai_ws = await service.connect(api_key, sample_rate)
        except Exception as e:
            error_msg = str(e).lower()
            if "401" in error_msg or "auth" in error_msg:
                await ws.send_json({"type": "error", "message": "Invalid AssemblyAI API key"})
            else:
                await ws.send_json({"type": "error", "message": f"Failed to connect to AssemblyAI: {e}"})
            await session_manager.remove_session(session_id)
            await ws.close()
            return

        # Step 4: Notify browser
        await ws.send_json({"type": "session_started", "session_id": session_id})
        logger.info(f"Realtime session started: {session_id}")

        # Step 5: Run concurrent relay tasks
        await _run_relay(ws, aai_ws, session_id, api_key, sample_rate)

    except WebSocketDisconnect:
        logger.info(f"Browser disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"Realtime session error: {e}")
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        # Cleanup
        if aai_ws:
            try:
                await service.terminate(aai_ws)
            except Exception:
                pass
        if session_id:
            await session_manager.remove_session(session_id)
            logger.info(f"Realtime session cleaned up: {session_id}")
        try:
            await ws.send_json({"type": "session_ended"})
        except Exception:
            pass


async def _run_relay(
    ws: WebSocket,
    aai_ws,
    session_id: str,
    api_key: str,
    sample_rate: int,
):
    stop_event = asyncio.Event()

    async def browser_to_aai():
        """Receive audio/control messages from browser and forward to AAI."""
        nonlocal aai_ws
        try:
            while not stop_event.is_set():
                message = await ws.receive()

                if message.get("type") == "websocket.disconnect":
                    stop_event.set()
                    return

                if "bytes" in message and message["bytes"]:
                    # Binary audio frame
                    try:
                        await service.send_audio(aai_ws, message["bytes"])
                    except Exception:
                        # AAI connection lost — will be handled by aai_to_browser
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
            logger.error(f"browser_to_aai error: {e}")
            stop_event.set()

    async def aai_to_browser():
        """Receive transcript events from AAI and forward to browser."""
        nonlocal aai_ws
        try:
            while not stop_event.is_set():
                try:
                    raw = await aai_ws.recv()
                except Exception as e:
                    if stop_event.is_set():
                        return
                    # Attempt reconnect
                    logger.warning(f"AAI connection lost: {e}")
                    reconnected = await _attempt_reconnect(
                        ws, api_key, sample_rate, session_id
                    )
                    if reconnected:
                        aai_ws = reconnected
                        continue
                    else:
                        await ws.send_json({
                            "type": "error",
                            "message": "Lost connection to AssemblyAI and reconnect failed"
                        })
                        stop_event.set()
                        return

                event = json.loads(raw)
                await _handle_aai_event(ws, event, session_id)

        except Exception as e:
            if not stop_event.is_set():
                logger.error(f"aai_to_browser error: {e}")
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


async def _handle_aai_event(ws: WebSocket, event: dict, session_id: str):
    """Parse AAI event and forward structured message to browser."""
    msg_type = event.get("type", "")

    if msg_type == "Turn":
        transcript = event.get("transcript", "")
        is_eos = event.get("end_of_turn", False)
        is_formatted = event.get("turn_is_formatted", False)

        # With format_turns=true, AAI sends two events when a turn ends:
        # 1. Unformatted final (end_of_turn=True, turn_is_formatted=False) — skip it
        # 2. Formatted final (turn_is_formatted=True) — use this as the real final
        # Partials (end_of_turn=False) are always passed through.
        if is_eos and not is_formatted:
            return

        if is_formatted and transcript:
            await session_manager.append_final_text(session_id, transcript + "\n")
            await session_manager.update_partial(session_id, "")
        elif not is_eos and transcript:
            await session_manager.update_partial(session_id, transcript)

        await ws.send_json({
            "type": "turn",
            "transcript": transcript,
            "is_final": is_formatted,
        })

    elif msg_type == "Error":
        error_msg = event.get("error", "Unknown AssemblyAI error")
        logger.error(f"AAI error for session {session_id}: {error_msg}")
        await ws.send_json({"type": "error", "message": error_msg})

    elif msg_type == "Begin":
        logger.info(f"AAI session confirmed for {session_id}")
        await ws.send_json({"type": "session_ready"})

    elif msg_type == "Termination":
        logger.info(f"AAI session terminated for {session_id}")


async def _attempt_reconnect(
    ws: WebSocket,
    api_key: str,
    sample_rate: int,
    session_id: str,
):
    """Attempt to reconnect to AAI with exponential backoff."""
    for attempt in range(1, MAX_RECONNECT_ATTEMPTS + 1):
        delay = RECONNECT_BASE_DELAY * (2 ** (attempt - 1))
        logger.info(
            f"Reconnect attempt {attempt}/{MAX_RECONNECT_ATTEMPTS} in {delay}s for session {session_id}")

        try:
            await ws.send_json({"type": "reconnecting", "attempt": attempt})
        except Exception:
            return None

        await asyncio.sleep(delay)

        try:
            new_ws = await service.connect(api_key, sample_rate)
            logger.info(f"Reconnected to AAI for session {session_id}")
            return new_ws
        except Exception as e:
            logger.warning(f"Reconnect attempt {attempt} failed: {e}")

    return None
