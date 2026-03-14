from pydantic import BaseModel


class WebhookFireRequest(BaseModel):
    webhook_url: str
    webhook_secret: str | None = None
    payload: dict


class WebhookFireResponse(BaseModel):
    success: bool
    status_code: int | None = None
    error: str | None = None
