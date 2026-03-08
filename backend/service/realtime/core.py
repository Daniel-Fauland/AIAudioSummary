import json
import urllib.parse

import websockets

from utils.logging import logger

AAI_STREAMING_URL = "wss://streaming.eu.assemblyai.com/v3/ws"


class RealtimeTranscriptionService:
    async def connect(
        self, api_key: str, sample_rate: int = 16000, speech_model: str = "precise",
        keyterms_prompt: list[str] | None = None,
    ) -> websockets.WebSocketClientProtocol:
        if speech_model == "fast":
            aai_model = "universal-streaming-multilingual"
            params = (
                f"?sample_rate={sample_rate}"
                f"&encoding=pcm_s16le"
                f"&speech_model={aai_model}"
                f"&format_turns=true"
            )
        else:
            aai_model = "u3-rt-pro"
            params = (
                f"?sample_rate={sample_rate}"
                f"&encoding=pcm_s16le"
                f"&speech_model={aai_model}"
                f"&format_turns=true"
                f"&speaker_labels=true"
            )

        if keyterms_prompt:
            terms = keyterms_prompt[:100]
            encoded = urllib.parse.quote(json.dumps(terms))
            params += f"&keyterms_prompt={encoded}"

        url = f"{AAI_STREAMING_URL}{params}"

        ws = await websockets.connect(
            url,
            additional_headers={"Authorization": api_key},
        )
        logger.info(
            f"Connected to AssemblyAI streaming API (sample_rate={sample_rate})")
        return ws

    async def send_audio(
        self, ws: websockets.WebSocketClientProtocol, data: bytes
    ) -> None:
        await ws.send(data)

    async def terminate(self, ws: websockets.WebSocketClientProtocol) -> None:
        try:
            await ws.send(json.dumps({"type": "Terminate"}))
            await ws.close()
            logger.info("AssemblyAI streaming connection terminated")
        except Exception as e:
            logger.warning(f"Error terminating AAI connection: {e}")
