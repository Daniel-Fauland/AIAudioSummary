import datetime
from pydantic import BaseModel, Field


class CreateSummaryRequest(BaseModel):
    stream: bool = Field(True,
                         description="Wheter to stream the answer or not", examples=[True])
    system_prompt: str = Field(..., description="The system prompt for the LLM", examples=[
                               "You are a helpful assistant"])
    text: str = Field(..., description="To prompt for the LLM",
                      examples=["Hello there."])
    date: datetime.date = Field(..., description="The date of the transcription")
    


class CreateSummaryResponse(BaseModel):
    summary: str = Field(..., description="The AI summary of the transcription", examples=["John asked Jane about the weather"])
