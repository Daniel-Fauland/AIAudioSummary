from fastapi import APIRouter, Body
from service.openai.core import OpenAIService
from fastapi.responses import StreamingResponse
from models.openai import CreateSummaryRequest, CreateSummaryResponse

openai_router = APIRouter()
service = OpenAIService()


@openai_router.post(
    "/createSummary",
    status_code=200,
    response_model=CreateSummaryResponse
)
async def create_summary(
    request: CreateSummaryRequest = Body(...)
):
    """Generate a summary of the provided text using OpenAI. Supports streaming."""
    if request.stream:
        generator = await service.generate_summary(request.text, request.system_prompt, request.target_language, request.openai_key, request.date, stream=True)
        return StreamingResponse(generator, media_type="text/plain")
    summary = await service.generate_summary(request.text, request.system_prompt, request.target_language, request.openai_key, request.date, stream=False)
    return {"summary": summary}
