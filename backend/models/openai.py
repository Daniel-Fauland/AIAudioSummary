from pydantic import BaseModel, Field
from config import config

system_prompt = config.openai_api_system_prompt


class CreateSummaryRequest(BaseModel):
    stream: bool = Field(True,
                         description="Wheter to stream the answer or not", examples=[True])
    system_prompt: str = Field(..., description="The system prompt for the LLM", examples=[
                               system_prompt])
    text: str = Field(..., description="To prompt for the LLM",
                      examples=["Hello there."])


class CreateSummaryResponse(BaseModel):
    summary: str
