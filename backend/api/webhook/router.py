from fastapi import APIRouter

from models.webhook import WebhookFireRequest, WebhookFireResponse
from service.webhook.core import WebhookService

webhook_router = APIRouter()
service = WebhookService()


@webhook_router.post("/webhook/fire", response_model=WebhookFireResponse, status_code=200)
async def fire_webhook(request: WebhookFireRequest) -> WebhookFireResponse:
    success, status_code, error = await service.fire(
        request.webhook_url,
        request.webhook_secret,
        request.payload,
    )
    return WebhookFireResponse(
        success=success,
        status_code=status_code,
        error=error,
    )
