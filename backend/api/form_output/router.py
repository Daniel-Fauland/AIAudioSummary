from fastapi import APIRouter, HTTPException

from models.form_output import FillFormRequest, FillFormResponse
from service.form_output.core import FormOutputService
from utils.logging import logger

form_output_router = APIRouter()
service = FormOutputService()


@form_output_router.post(
    "/form-output/fill",
    response_model=FillFormResponse,
    status_code=200,
)
async def fill_form(request: FillFormRequest) -> FillFormResponse:
    try:
        return await service.fill_form(request)
    except Exception as e:
        error_msg = str(e).lower()
        logger.error(f"Form output fill failed: {e}")
        if "auth" in error_msg or "api key" in error_msg or "unauthorized" in error_msg:
            raise HTTPException(status_code=401, detail="Invalid API key")
        elif "model" in error_msg and ("not found" in error_msg or "does not exist" in error_msg):
            raise HTTPException(status_code=400, detail="Model not found")
        elif "context" in error_msg and "length" in error_msg or "token" in error_msg and "limit" in error_msg:
            raise HTTPException(status_code=400, detail="Transcript too long for the selected model's context window")
        else:
            raise HTTPException(status_code=502, detail="LLM provider error during form filling")
