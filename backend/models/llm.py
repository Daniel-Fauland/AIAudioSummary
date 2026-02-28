import datetime
from enum import Enum
from typing import Literal
from pydantic import BaseModel, Field, model_validator


class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    AZURE_OPENAI = "azure_openai"
    LANGDOCK = "langdock"


class AzureConfig(BaseModel):
    api_version: str = Field(..., description="Azure OpenAI API version", examples=["2024-02-15-preview"])
    azure_endpoint: str = Field(..., description="Azure OpenAI endpoint URL", examples=["https://my-resource.openai.azure.com/"])
    deployment_name: str = Field(..., description="Azure OpenAI deployment name", examples=["gpt-4-deployment"])


class LangdockConfig(BaseModel):
    region: Literal["eu", "us"] = "eu"


class CreateSummaryRequest(BaseModel):
    provider: LLMProvider = Field(..., description="Which LLM provider to use")
    api_key: str = Field(..., min_length=1, description="Provider API key (sent per-request)")
    model: str = Field(..., min_length=1, description="Model identifier", examples=["gpt-4.1-mini", "claude-sonnet-4-5", "gemini-2.0-flash"])
    azure_config: AzureConfig | None = Field(None, description="Required only when provider is 'azure_openai'")
    langdock_config: LangdockConfig = Field(default_factory=LangdockConfig, description="Langdock region config")
    stream: bool = Field(True, description="Whether to stream the response")
    system_prompt: str = Field(..., min_length=1, description="The system prompt (selected/edited template)")
    text: str = Field(..., min_length=1, description="The transcript text to summarize")
    target_language: str = Field("English", description="Output language", examples=["English", "German", "French", "Spanish"])
    informal_german: bool = Field(True, description="Use informal German pronouns (du/ihr instead of Sie)")
    date: datetime.date | None = Field(None, description="Meeting date for date formatting in prompt")
    author: str | None = Field(None, description="Speaker selected as author/POV for the summary")

    @model_validator(mode="after")
    def validate_azure_config(self):
        if self.provider == LLMProvider.AZURE_OPENAI and self.azure_config is None:
            raise ValueError("azure_config is required when provider is 'azure_openai'")
        return self


class TokenUsage(BaseModel):
    input_tokens: int = Field(0, description="Number of input/prompt tokens")
    output_tokens: int = Field(0, description="Number of output/completion tokens")
    total_tokens: int = Field(0, description="Total tokens (input + output)")


class CreateSummaryResponse(BaseModel):
    summary: str = Field(..., description="The AI summary of the transcription")
    usage: TokenUsage | None = Field(None, description="Token usage for this request")


class ExtractKeyPointsRequest(BaseModel):
    provider: LLMProvider = Field(..., description="Which LLM provider to use")
    api_key: str = Field(..., min_length=1, description="Provider API key (sent per-request)")
    model: str = Field(..., min_length=1, description="Model identifier")
    azure_config: AzureConfig | None = Field(None, description="Required only when provider is 'azure_openai'")
    langdock_config: LangdockConfig = Field(default_factory=LangdockConfig, description="Langdock region config")
    transcript: str = Field(..., min_length=1, description="The transcript text to extract key points from")
    speakers: list[str] = Field(..., min_length=1, description="List of speaker labels found in the transcript")
    identify_speakers: bool = Field(False, description="When True, also attempt to identify real speaker names from the transcript")

    @model_validator(mode="after")
    def validate_azure_config(self):
        if self.provider == LLMProvider.AZURE_OPENAI and self.azure_config is None:
            raise ValueError("azure_config is required when provider is 'azure_openai'")
        return self


class ExtractKeyPointsResponse(BaseModel):
    key_points: dict[str, str] = Field(..., description="Mapping of speaker label to 1-3 sentence key point summary")
    speaker_labels: dict[str, str] = Field(default_factory=dict, description="Mapping of speaker label to identified real name (only speakers with clearly identifiable names)")
