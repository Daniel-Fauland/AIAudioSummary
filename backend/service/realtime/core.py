import json

import websockets

from utils.logging import logger

AAI_STREAMING_URL = "wss://streaming.eu.assemblyai.com/v3/ws"


class RealtimeTranscriptionService:
    async def connect(
        self, api_key: str, sample_rate: int = 16000
    ) -> websockets.WebSocketClientProtocol:
        params = (
            f"?sample_rate={sample_rate}"
            f"&encoding=pcm_s16le"
            f"&speech_model=universal-streaming-multilingual"
            f"&format_turns=true"
        )
        url = f"{AAI_STREAMING_URL}{params}"

        ws = await websockets.connect(
            url,
            additional_headers={"Authorization": api_key},
        )
        logger.info(f"Connected to AssemblyAI streaming API (sample_rate={sample_rate})")
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
