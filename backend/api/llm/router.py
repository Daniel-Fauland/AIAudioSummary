from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import StreamingResponse
from service.llm.core import LLMService
from models.llm import CreateSummaryRequest, CreateSummaryResponse, ExtractKeyPointsRequest, ExtractKeyPointsResponse, TokenUsage
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
            # Eagerly fetch the first chunk to catch connection/auth errors
            # before committing to a 200 StreamingResponse.
            gen = generator.__aiter__()
            try:
                first_chunk = await gen.__anext__()
            except StopAsyncIteration:
                return StreamingResponse(iter([]), media_type="text/plain")

            async def _with_first():
                yield first_chunk
                async for chunk in gen:
                    yield chunk

            return StreamingResponse(_with_first(), media_type="text/plain")

        output, usage = await service.generate_summary(request)
        token_usage = None
        try:
            token_usage = TokenUsage(
                input_tokens=usage.request_tokens or 0,
                output_tokens=usage.response_tokens or 0,
                total_tokens=(usage.request_tokens or 0) + (usage.response_tokens or 0),
            )
        except Exception:
            pass
        return CreateSummaryResponse(summary=output, usage=token_usage)

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


@llm_router.post(
    "/extractKeyPoints",
    status_code=200,
    response_model=ExtractKeyPointsResponse
)
async def extract_key_points(
    request: ExtractKeyPointsRequest = Body(...)
):
    """Extract key point summaries per speaker from a transcript using the specified LLM."""
    try:
        result = await service.extract_key_points(request)
        return result

    except Exception as e:
        error_msg = str(e).lower()
        provider_name = request.provider.value

        if "auth" in error_msg or "api key" in error_msg or "unauthorized" in error_msg or "invalid x-api-key" in error_msg or "invalid api key" in error_msg:
            raise HTTPException(
                status_code=401,
                detail=f"Invalid API key for {provider_name}"
            )

        if "model" in error_msg and ("not found" in error_msg or "does not exist" in error_msg or "not exist" in error_msg):
            raise HTTPException(
                status_code=400,
                detail=f"Model '{request.model}' not found for provider {provider_name}"
            )

        logger.error(f"LLM provider error ({provider_name}): {e}")
        raise HTTPException(
            status_code=502,
            detail=f"LLM provider error ({provider_name}): {str(e)}"
        )
