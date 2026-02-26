import asyncio
import os
import tempfile
import threading

import assemblyai as aai
from fastapi import UploadFile
from utils.logging import logger

aai.settings.base_url = "https://api.eu.assemblyai.com"

# Lock to ensure setting aai.settings.api_key + calling transcribe() is atomic,
# preventing concurrent requests from overwriting each other's API key.
_transcribe_lock = threading.Lock()


class AssemblyAIService:
    async def save_uploaded_file_to_temp(self, uploaded_file: UploadFile) -> str:
        """Save uploaded file to a temporary location and return the file path.

        Args:
            uploaded_file (UploadFile): The uploaded file from FastAPI

        Returns:
            str: Path to the temporary file
        """
        # Create a temporary file with the same extension as the uploaded file
        file_extension = os.path.splitext(uploaded_file.filename)[
            1] if uploaded_file.filename else ""
        temp_file = tempfile.NamedTemporaryFile(
            delete=False, suffix=file_extension)

        try:
            # Use FastAPI's async read instead of synchronous file.read()
            content = await uploaded_file.read()
            temp_file.write(content)
            temp_file.flush()
            return temp_file.name
        finally:
            temp_file.close()

    async def get_transcript(self, path_to_file: str, api_key: str,
                             lang_code: str = None,
                             min_speaker: int = 1,
                             max_speaker: int = 10):
        if not lang_code:
            language_detection = True
            language_code = None
        else:
            language_detection = False
            language_code = lang_code

        config = aai.TranscriptionConfig(
            speech_models=["universal-3-pro", "universal-2"],
            language_detection=language_detection,
            language_code=language_code,
            speaker_labels=True,
            speaker_options={"min_speakers_expected": min_speaker, "max_speakers_expected": max_speaker})

        # Run the synchronous transcribe() call in a thread pool to avoid
        # blocking the event loop. The lock ensures api_key + transcribe()
        # are atomic per thread (prevents key race conditions).
        def _transcribe():
            with _transcribe_lock:
                aai.settings.api_key = api_key
                return aai.Transcriber(config=config).transcribe(path_to_file)

        transcript = await asyncio.to_thread(_transcribe)

        if transcript.status == "error":
            logger.error(
                f"AssemblyAI transcription failed: {transcript.error}")
            raise RuntimeError()

        transcript_text = ""
        for utterance in transcript.utterances:
            transcript_text += f"Speaker {utterance.speaker}: {utterance.text}\n"
        return transcript_text
