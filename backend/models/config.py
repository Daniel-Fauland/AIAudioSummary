from pydantic import BaseModel, Field


class ProviderInfo(BaseModel):
    id: str = Field(..., description="Provider identifier", examples=["openai"])
    name: str = Field(..., description="Display name", examples=["OpenAI"])
    models: list[str] = Field(..., description="Suggested model names")
    requires_azure_config: bool = Field(False, description="Whether Azure-specific config is required")


class PromptTemplate(BaseModel):
    id: str = Field(..., description="Template identifier (filename stem)", examples=["short_meeting_summary"])
    name: str = Field(..., description="Display name", examples=["Short Meeting Summary"])
    content: str = Field(..., description="Full markdown template content")


class LanguageOption(BaseModel):
    code: str = Field(..., description="Language code", examples=["en"])
    name: str = Field(..., description="Language display name", examples=["English"])


class ConfigResponse(BaseModel):
    providers: list[ProviderInfo]
    prompt_templates: list[PromptTemplate]
    languages: list[LanguageOption]


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
