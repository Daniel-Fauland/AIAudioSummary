import datetime
from pydantic import BaseModel, Field


class CreateSummaryRequest(BaseModel):
    stream: bool = Field(True,
                         description="Wheter to stream the answer or not", examples=[True])
    system_prompt: str = Field(..., description="The system prompt for the LLM", examples=[
                               "You are a helpful assistant"])
    text: str = Field(..., description="To prompt for the LLM",
                      examples=["Hello there."])
    target_language: str = Field("English", description="The Output Language of the AI answer", examples=["English"])
    informal_german: bool = Field(True, description="Wheter to use informal german ('DU' instead of 'SIE')", examples=[True])
    date: datetime.date = Field(..., description="The date of the transcription")
    openai_key: str = Field(..., description="The OpenAI key")
    


class CreateSummaryResponse(BaseModel):
    summary: str = Field(..., description="The AI summary of the transcription", examples=["John asked Jane about the weather"])
