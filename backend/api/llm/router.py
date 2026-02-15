from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import StreamingResponse
from service.llm.core import LLMService
from models.llm import CreateSummaryRequest, CreateSummaryResponse
from utils.logging import logger

llm_router = APIRouter()
service = LLMService()


@llm_router.post(
    "/createSummary",
    status_code=200,
    response_model=CreateSummaryResponse
)
async def create_summary(
    request: CreateSummaryRequest = Body(...)
):
    """Generate a summary using the specified LLM provider. Supports streaming."""
    try:
        if request.stream:
            generator = await service.generate_summary(request)
            return StreamingResponse(generator, media_type="text/plain")

        summary = await service.generate_summary(request)
        return CreateSummaryResponse(summary=summary)

    except Exception as e:
        error_msg = str(e).lower()
        provider_name = request.provider.value

        # Authentication errors
        if "auth" in error_msg or "api key" in error_msg or "unauthorized" in error_msg or "invalid x-api-key" in error_msg or "invalid api key" in error_msg:
            raise HTTPException(
                status_code=401,
                detail=f"Invalid API key for {provider_name}"
            )

        # Model not found errors
        if "model" in error_msg and ("not found" in error_msg or "does not exist" in error_msg or "not exist" in error_msg):
            raise HTTPException(
                status_code=400,
                detail=f"Model '{request.model}' not found for provider {provider_name}"
            )

        # All other errors
        logger.error(f"LLM provider error ({provider_name}): {e}")
        raise HTTPException(
            status_code=502,
            detail=f"LLM provider error ({provider_name}): {str(e)}"
        )
