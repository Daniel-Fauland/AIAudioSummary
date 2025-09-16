import os
import tempfile
import assemblyai as aai
from fastapi import UploadFile
from config import config
from utils.logging import logger

aai.settings.base_url = "https://api.eu.assemblyai.com"
api_key = config.api_key_assemblyai


class AssemblyAIService:
    async def save_uploaded_file_to_temp(self, uploaded_file: UploadFile) -> str:
        """Save uploaded file to a temporary location and return the file path.
        
        Args:
            uploaded_file (UploadFile): The uploaded file from FastAPI
            
        Returns:
            str: Path to the temporary file
        """
        # Create a temporary file with the same extension as the uploaded file
        file_extension = os.path.splitext(uploaded_file.filename)[1] if uploaded_file.filename else ""
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
        
        try:
            # Write the uploaded file content to the temporary file
            content = uploaded_file.file.read()
            temp_file.write(content)
            temp_file.flush()
            return temp_file.name
        finally:
            temp_file.close()

    async def get_transcript(self, path_to_file: str,
                             lang_code: str = None,
                             min_speaker: int = 1,
                             max_speaker: int = 10):
        aai.settings.api_key = api_key

        if not lang_code:
            language_detection = True
            language_code = None
        else:
            language_detection = False
            language_code = lang_code

        config = aai.TranscriptionConfig(
            speech_model=aai.SpeechModel.best,
            language_detection=language_detection,
            language_code=language_code,
            speaker_labels=True,
            speaker_options={"min_sepakers_expected": min_speaker, "max_speakers_expected": max_speaker})
        transcript = aai.Transcriber(config=config).transcribe(path_to_file)

        if transcript.status == "error":
            logger.error(
                f"AssemblyAI transcription failed: {transcript.error}")
            raise RuntimeError()

        transcript_text = ""
        for utterance in transcript.utterances:
            transcript_text += f"Speaker {utterance.speaker}: {utterance.text}\n"
        return transcript_text
