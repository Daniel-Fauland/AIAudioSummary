import hashlib
import hmac
import json

import httpx

from utils.logging import logger


class WebhookService:
    async def fire(
        self,
        url: str,
        secret: str | None,
        payload: dict,
    ) -> tuple[bool, int | None, str | None]:
        """Fire a webhook POST request to the given URL.

        Returns (success, status_code, error_message).
        """
        body = json.dumps(payload, ensure_ascii=False, default=str)
        headers: dict[str, str] = {"Content-Type": "application/json"}

        if secret:
            signature = hmac.new(
                secret.encode("utf-8"),
                body.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            headers["X-Webhook-Signature"] = signature

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, content=body, headers=headers)
                if response.is_success:
                    logger.info(f"Webhook delivered to {url} — {response.status_code}")
                    return True, response.status_code, None
                else:
                    error = f"HTTP {response.status_code}: {response.text[:200]}"
                    logger.warning(f"Webhook failed for {url} — {error}")
                    return False, response.status_code, error
        except httpx.TimeoutException:
            logger.warning(f"Webhook timed out for {url}")
            return False, None, "Request timed out"
        except Exception as e:
            logger.error(f"Webhook error for {url}: {e}")
            return False, None, str(e)
