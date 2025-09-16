from pydantic import BaseModel, Field


class ConfigResponse(BaseModel):
    prompt_templates: dict

class GetSpeakersRequest(BaseModel):
    transcript: str = Field(..., description="The transcript of the provided audio file", examples=[
                            "Speaker A: How are you?\nSpeaker B: I'm fine thanks"])

class GetSpeakersResponse(BaseModel):
    speakers: list[str] = Field(..., description="The speakers of the transcript", examples=["Speaker A", "Speaker B"])

class UpdatedTranscriptResponse(BaseModel):
    transcript: str

class UpdatedTranscriptRequest(BaseModel):
    transcript: str = Field(..., description="The transcript of the provided audio file", examples=[
                            "Speaker A: How are you?\nSpeaker B: I'm fine thanks"])
    speakers: dict = Field(..., description="The speakers of the transcript", examples=[
                            {"Speaker A": "John", "Speaker B": "Jane"}])
