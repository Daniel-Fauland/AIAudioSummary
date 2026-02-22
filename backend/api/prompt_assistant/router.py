from fastapi import APIRouter, Body, HTTPException

from models.prompt_assistant import (
    AnalyzeRequest,
    AnalyzeResponse,
    GenerateRequest,
    GenerateResponse,
)
from service.prompt_assistant.core import PromptAssistantService
from utils.logging import logger

prompt_assistant_router = APIRouter()
service = PromptAssistantService()


@prompt_assistant_router.post(
    "/prompt-assistant/analyze",
    response_model=AnalyzeResponse,
    status_code=200,
)
async def analyze_prompt(request: AnalyzeRequest = Body(...)):
    """Analyze an optional base prompt and return structured questions for refinement."""
    try:
        result = await service.analyze(request)
        return result
    except Exception as e:
        error_msg = str(e).lower()
        provider_name = request.provider.value

        if (
            "auth" in error_msg
            or "api key" in error_msg
            or "unauthorized" in error_msg
            or "invalid x-api-key" in error_msg
            or "invalid api key" in error_msg
        ):
            raise HTTPException(
                status_code=401,
                detail=f"Invalid API key for {provider_name}",
            )

        if "model" in error_msg and (
            "not found" in error_msg
            or "does not exist" in error_msg
            or "not exist" in error_msg
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Model '{request.model}' not found for provider {provider_name}",
            )

        logger.error(f"Prompt assistant analyze error ({provider_name}): {e}")
        raise HTTPException(
            status_code=502,
            detail=f"LLM provider error ({provider_name}): {str(e)}",
        )


@prompt_assistant_router.post(
    "/prompt-assistant/generate",
    response_model=GenerateResponse,
    status_code=200,
)
async def generate_prompt(request: GenerateRequest = Body(...)):
    """Generate a final system prompt based on user answers and preferences."""
    try:
        result = await service.generate(request)
        return result
    except Exception as e:
        error_msg = str(e).lower()
        provider_name = request.provider.value

        if (
            "auth" in error_msg
            or "api key" in error_msg
            or "unauthorized" in error_msg
            or "invalid x-api-key" in error_msg
            or "invalid api key" in error_msg
        ):
            raise HTTPException(
                status_code=401,
                detail=f"Invalid API key for {provider_name}",
            )

        if "model" in error_msg and (
            "not found" in error_msg
            or "does not exist" in error_msg
            or "not exist" in error_msg
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Model '{request.model}' not found for provider {provider_name}",
            )

        logger.error(f"Prompt assistant generate error ({provider_name}): {e}")
        raise HTTPException(
            status_code=502,
            detail=f"LLM provider error ({provider_name}): {str(e)}",
        )
