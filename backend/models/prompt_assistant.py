from enum import Enum
from typing import Union

from pydantic import BaseModel, Field

from models.llm import LLMProvider, AzureConfig, LangdockConfig


class QuestionType(str, Enum):
    SINGLE_SELECT = "single_select"
    MULTI_SELECT = "multi_select"
    FREE_TEXT = "free_text"


class AssistantQuestion(BaseModel):
    id: str = Field(..., description="Unique identifier for the question")
    question: str = Field(..., description="The question text shown to the user")
    type: QuestionType = Field(..., description="Type of input field to render")
    options: list[str] | None = Field(None, description="Options for single_select and multi_select types")
    default: Union[str, list[str], None] = Field(None, description="Pre-selected default value(s)")
    placeholder: str | None = Field(None, description="Placeholder text for free_text type")
    inferred: bool = Field(False, description="True if the answer was derived from the base prompt")
    inferred_reason: str | None = Field(None, description="Explanation of why the answer was inferred")


class AnalyzeRequest(BaseModel):
    provider: LLMProvider = Field(..., description="Which LLM provider to use")
    api_key: str = Field(..., min_length=1, description="Provider API key (sent per-request)")
    model: str = Field(..., min_length=1, description="Model identifier")
    azure_config: AzureConfig | None = Field(None, description="Required only when provider is 'azure_openai'")
    langdock_config: LangdockConfig | None = Field(None, description="Langdock region config")
    base_prompt: str | None = Field(None, description="Optional existing prompt to analyze and refine")


class AnalyzeResponse(BaseModel):
    questions: list[AssistantQuestion] = Field(..., description="Structured questions for the user to answer")


class GenerateRequest(BaseModel):
    provider: LLMProvider = Field(..., description="Which LLM provider to use")
    api_key: str = Field(..., min_length=1, description="Provider API key (sent per-request)")
    model: str = Field(..., min_length=1, description="Model identifier")
    azure_config: AzureConfig | None = Field(None, description="Required only when provider is 'azure_openai'")
    langdock_config: LangdockConfig | None = Field(None, description="Langdock region config")
    base_prompt: str | None = Field(None, description="Optional base prompt to build upon")
    answers: dict[str, Union[str, list[str]]] = Field(..., description="User answers keyed by question id")
    additional_notes: str | None = Field(None, description="Any additional instructions from the user")


class GenerateResponse(BaseModel):
    generated_prompt: str = Field(..., description="The fully generated system prompt ready for use")
