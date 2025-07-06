from pydantic import BaseModel, Field


class CreateTranscriptResponse(BaseModel):
    transcript: str = Field(..., description="The transcript of the provided audio file", examples=[
                            "Speaker A: How are you?\nSpeaker B: I'm fine thanks"])
