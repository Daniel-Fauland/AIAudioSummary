import os
from pathlib import Path
from fastapi import APIRouter
from utils.logging import logger
from config import config
from models.config import (
    ConfigResponse, ProviderInfo, PromptTemplate, LanguageOption,
    UpdatedTranscriptResponse, UpdatedTranscriptRequest,
    GetSpeakersRequest, GetSpeakersResponse
)
from service.misc.core import MiscService
from utils.helper import Helper

misc_router = APIRouter()
service = MiscService()
helper = Helper()

PROVIDERS = [
    ProviderInfo(
        id="openai",
        name="OpenAI",
        models=["gpt-5.2", "gpt-5-mini", "gpt-5-nano", "gpt-4.1-mini"],
        model_context_windows={
            "gpt-5.2": 1_000_000,
            "gpt-5-mini": 1_000_000,
            "gpt-5-nano": 1_000_000,
            "gpt-4.1-mini": 1_000_000,
        },
    ),
    ProviderInfo(
        id="anthropic",
        name="Anthropic",
        models=["claude-opus-4-6", "claude-sonnet-4-5", "claude-haiku-4-5"],
        model_context_windows={
            "claude-opus-4-6": 200_000,
            "claude-sonnet-4-5": 200_000,
            "claude-haiku-4-5": 200_000,
        },
    ),
    ProviderInfo(
        id="gemini",
        name="Google Gemini",
        models=["gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.5-flash"],
        model_context_windows={
            "gemini-3-pro-preview": 1_000_000,
            "gemini-3-flash-preview": 1_000_000,
            "gemini-2.5-flash": 1_000_000,
        },
    ),
    ProviderInfo(
        id="azure_openai",
        name="Azure OpenAI",
        models=[],
        requires_azure_config=True,
    ),
    ProviderInfo(
        id="langdock",
        name="Langdock",
        models=[
            # OpenAI-compatible — disabled due to Langdock proxy bug:
            # Langdock ignores max_completion_tokens and auto-computes an invalid
            # value (~14M), causing 400 errors. See user_stories/langdock_openai_bug_report.md
            # "gpt-5.2", "gpt-5.2-pro",
            # Anthropic-compatible
            "claude-sonnet-4-6-default", "claude-opus-4-6-default",
            # Google-compatible — temporarily disabled
            # "gemini-2.5-pro", "gemini-2.5-flash",
        ],
        model_context_windows={
            "claude-sonnet-4-6-default": 200_000,
            "claude-opus-4-6-default": 200_000,
        },
    ),
]

LANGUAGES = [
    LanguageOption(code="en", name="English"),
    LanguageOption(code="de", name="German"),
    LanguageOption(code="fr", name="French"),
    LanguageOption(code="es", name="Spanish"),
    LanguageOption(code="hr", name="Croatian"),
    LanguageOption(code="tr", name="Turkish"),
]


@misc_router.get("/getConfig", response_model=ConfigResponse, status_code=200)
async def get_config():
    """Return full application config: providers, prompt templates, and languages."""
    list_of_files = await helper.list_files(config.prompt_template_directory)
    logger.info(f"list_of_files: {list_of_files}")

    templates = []
    for f in sorted(list_of_files):
        file_path = os.path.join(config.prompt_template_directory, f)
        file_content: str = await helper.file_to_str(file_path)
        if file_content is None:
            continue
        stem = Path(f).stem
        display_name = stem.replace("_", " ").title()
        templates.append(PromptTemplate(id=stem, name=display_name, content=file_content))

    return ConfigResponse(
        providers=PROVIDERS,
        prompt_templates=templates,
        languages=LANGUAGES,
    )


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
