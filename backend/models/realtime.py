from pydantic import BaseModel, Field, model_validator

from models.llm import AzureConfig, LangdockConfig, LLMProvider, TokenUsage


class IncrementalSummaryRequest(BaseModel):
    provider: LLMProvider = Field(..., description="Which LLM provider to use")
    api_key: str = Field(..., min_length=1, description="Provider API key (sent per-request)")
    model: str = Field(..., min_length=1, description="Model identifier")
    azure_config: AzureConfig | None = Field(None, description="Required only when provider is 'azure_openai'")
    langdock_config: LangdockConfig = Field(default_factory=LangdockConfig, description="Langdock region config")
    system_prompt: str = Field(..., min_length=1, description="The system prompt (selected/edited template)")
    full_transcript: str = Field(..., min_length=1, description="The full accumulated transcript so far")
    previous_summary: str | None = Field(None, description="The previous summary to update incrementally")
    new_transcript_chunk: str | None = Field(None, description="New transcript text since the last summary")
    is_full_recompute: bool = Field(False, description="Whether to recompute the summary from scratch")
    target_language: str = Field("en", description="Output language code")
    informal_german: bool = Field(False, description="Use informal German pronouns (du/ihr instead of Sie)")
    date: str | None = Field(None, description="Meeting date for prompt context")
    author: str | None = Field(None, description="Speaker selected as author/POV for the summary")

    @model_validator(mode="after")
    def validate_azure_config(self):
        if self.provider == LLMProvider.AZURE_OPENAI and self.azure_config is None:
            raise ValueError("azure_config is required when provider is 'azure_openai'")
        return self


class IncrementalSummaryResponse(BaseModel):
    summary: str = Field(..., description="The updated AI summary")
    updated_at: str = Field(..., description="ISO timestamp of when the summary was generated")
    usage: TokenUsage | None = Field(None, description="Token usage for this request")
