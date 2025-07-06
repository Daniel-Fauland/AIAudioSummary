from pydantic import BaseModel


class ConfigResponse(BaseModel):
    system_prompt: str
