import datetime
from enum import Enum
from pydantic import BaseModel, Field, model_validator


class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    AZURE_OPENAI = "azure_openai"


class AzureConfig(BaseModel):
    api_version: str = Field(..., description="Azure OpenAI API version", examples=["2024-02-15-preview"])
    azure_endpoint: str = Field(..., description="Azure OpenAI endpoint URL", examples=["https://my-resource.openai.azure.com/"])
    deployment_name: str = Field(..., description="Azure OpenAI deployment name", examples=["gpt-4-deployment"])


class CreateSummaryRequest(BaseModel):
    provider: LLMProvider = Field(..., description="Which LLM provider to use")
    api_key: str = Field(..., min_length=1, description="Provider API key (sent per-request)")
    model: str = Field(..., min_length=1, description="Model identifier", examples=["gpt-4.1-mini", "claude-sonnet-4-5", "gemini-2.0-flash"])
    azure_config: AzureConfig | None = Field(None, description="Required only when provider is 'azure_openai'")
    stream: bool = Field(True, description="Whether to stream the response")
    system_prompt: str = Field(..., min_length=1, description="The system prompt (selected/edited template)")
    text: str = Field(..., min_length=1, description="The transcript text to summarize")
    target_language: str = Field("English", description="Output language", examples=["English", "German", "French", "Spanish"])
    informal_german: bool = Field(True, description="Use informal German pronouns (du/ihr instead of Sie)")
    date: datetime.date | None = Field(None, description="Meeting date for date formatting in prompt")

    @model_validator(mode="after")
    def validate_azure_config(self):
        if self.provider == LLMProvider.AZURE_OPENAI and self.azure_config is None:
            raise ValueError("azure_config is required when provider is 'azure_openai'")
        return self


class CreateSummaryResponse(BaseModel):
    summary: str = Field(..., description="The AI summary of the transcription")
