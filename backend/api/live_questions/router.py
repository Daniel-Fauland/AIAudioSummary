from fastapi import APIRouter, HTTPException

from models.live_questions import EvaluateQuestionsRequest, EvaluateQuestionsResponse
from service.live_questions.core import LiveQuestionsService
from utils.logging import logger

live_questions_router = APIRouter()
service = LiveQuestionsService()


@live_questions_router.post(
    "/live-questions/evaluate",
    response_model=EvaluateQuestionsResponse,
    status_code=200,
)
async def evaluate_live_questions(request: EvaluateQuestionsRequest) -> EvaluateQuestionsResponse:
    if not request.questions:
        return EvaluateQuestionsResponse(evaluations=[])

    try:
        return await service.evaluate(request)
    except Exception as e:
        error_msg = str(e).lower()
        logger.error(f"Live questions evaluation failed: {e}")
        if "auth" in error_msg or "api key" in error_msg or "unauthorized" in error_msg:
            raise HTTPException(status_code=401, detail="Invalid API key")
        elif "model" in error_msg and ("not found" in error_msg or "does not exist" in error_msg):
            raise HTTPException(status_code=400, detail="Model not found")
        elif "context" in error_msg and "length" in error_msg or "token" in error_msg and "limit" in error_msg:
            raise HTTPException(status_code=400, detail="Transcript too long for the selected model's context window")
        else:
            raise HTTPException(status_code=502, detail="LLM provider error during question evaluation")
