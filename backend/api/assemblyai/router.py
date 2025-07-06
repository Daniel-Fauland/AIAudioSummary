from fastapi import APIRouter, Query
from service.assembly_ai.core import AssemblyAIService
from models.assemblyai import CreateTranscriptResponse

assembly_ai_router = APIRouter()
service = AssemblyAIService()


@assembly_ai_router.get("/createTranscript", response_model=CreateTranscriptResponse, status_code=200)
async def create_transcript(
    file_path: str = Query(..., description="The path to the audio file"),
    lang_code: str = Query(
        None, description="Language code (e.g., 'en', 'de'). If not provided, language will be automatically detected"),
    min_speaker: int = Query(
        1, description="Minimum number of speakers expected", ge=1),
    max_speaker: int = Query(
        10, description="Maximum number of speakers expected", le=20)
):
    """Create a transcript of a provided audio file using AssemblyAI.

    Args:
        file_path (str): The path to the audio file.
        lang_code (str, optional): Language code. If not provided, language detection will be enabled.
        min_speaker (int): Minimum number of speakers expected (default: 1).
        max_speaker (int): Maximum number of speakers expected (default: 10).
    """
    transcript = await service.get_transcript(
        path_to_file=file_path,
        lang_code=lang_code,
        min_speaker=min_speaker,
        max_speaker=max_speaker
    )
    return CreateTranscriptResponse(transcript=transcript)
