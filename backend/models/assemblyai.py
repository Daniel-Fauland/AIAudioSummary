from pydantic import BaseModel, Field


class TranscriptUtterance(BaseModel):
    speaker: str = Field(..., description="Speaker label", examples=["Speaker A"])
    text: str = Field(..., description="Utterance text")
    start_ms: int = Field(..., description="Start time in milliseconds")
    end_ms: int = Field(..., description="End time in milliseconds")


class CreateTranscriptResponse(BaseModel):
    transcript: str = Field(..., description="The transcript of the provided audio file", examples=[
                            "Speaker A: How are you?\nSpeaker B: I'm fine thanks"])
    utterances: list[TranscriptUtterance] = Field(default_factory=list, description="Per-utterance data with timestamps")
