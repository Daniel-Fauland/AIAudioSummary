import os
from fastapi import APIRouter
from utils.logging import logger
from config import config
from models.config import ConfigResponse, UpdatedTranscriptResponse, UpdatedTranscriptRequest, GetSpeakersRequest, GetSpeakersResponse
from service.misc.core import MiscService
from utils.helper import Helper

misc_router = APIRouter()
service = MiscService()
helper = Helper()

@misc_router.get("/getConfig", response_model=ConfigResponse, status_code=200)
async def get_config():
    list_of_files = await helper.list_files(config.prompt_template_directory)
    logger.info(f"list_of_files: {list_of_files}")
    templates = {}
    for f in list_of_files:
        file_path = os.path.join(config.prompt_template_directory, f)
        file_content: str = await helper.file_to_str(file_path)
        templates[f] = file_content
    return ConfigResponse(prompt_templates=templates)


@misc_router.post("/getSpeakers", response_model=GetSpeakersResponse, status_code=201)
async def get_speakers(request: GetSpeakersRequest):
    """Identify all speakers in the transcript and return them as a list of strings

    Args:
        request (GetSpeakersRequest): The transcript to identify the speakers from

    Returns:
        GetSpeakersResponse: A response containing the list of identified speakers
    """
    speakers = await service.get_speakers(request.transcript)
    return GetSpeakersResponse(speakers=speakers)


@misc_router.post("/updateSpeakers", response_model=UpdatedTranscriptResponse, status_code=201)
async def update_speakers(request: UpdatedTranscriptRequest):
    """Update the speakers of the transcript

    Args:
        request (UpdatedTranscriptRequest): The request containing the transcript and the speakers

    Returns:
        UpdateTranscriptResponse: The response containing the updated transcript
    """
    transcript = request.transcript
    speakers = request.speakers

    for key, value in speakers.items():
        transcript = transcript.replace(key, value)
    return UpdatedTranscriptResponse(transcript=transcript)