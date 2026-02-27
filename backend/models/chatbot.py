from enum import Enum
from pydantic import BaseModel, Field
from models.llm import LLMProvider, AzureConfig, LangdockConfig


class ChatRole(str, Enum):
    user = "user"
    assistant = "assistant"


class ChatMessage(BaseModel):
    role: ChatRole
    content: str


class ActionProposal(BaseModel):
    action_id: str
    description: str
    params: dict


class PromptTemplateInfo(BaseModel):
    """Prompt template summary for the chatbot context."""
    id: str
    name: str
    content: str


class FormTemplateFieldInfo(BaseModel):
    """Form template field info for the chatbot context."""
    label: str
    type: str
    description: str | None = None
    options: list[str] | None = None


class FormTemplateInfo(BaseModel):
    """Form template summary for the chatbot context."""
    id: str
    name: str
    fields: list[FormTemplateFieldInfo]


class AppContext(BaseModel):
    """Current user settings and app state, injected into the system prompt."""
    selected_provider: str | None = None
    selected_model: str | None = None
    app_mode: str | None = None
    theme: str | None = None
    app_version: str | None = None
    changelog: str | None = None
    user_timestamp: str | None = None
    last_visit_timestamp: str | None = None
    custom_templates: list[PromptTemplateInfo] | None = None
    form_templates: list[FormTemplateInfo] | None = None


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
    provider: LLMProvider = Field(..., description="Which LLM provider to use")
    model: str = Field(..., min_length=1)
    api_key: str = Field(..., min_length=1)
    azure_config: AzureConfig | None = None
    langdock_config: LangdockConfig = Field(default_factory=LangdockConfig)
    qa_enabled: bool = True
    transcript_enabled: bool = True
    actions_enabled: bool = True
    transcript: str | None = None
    confirmed_action: ActionProposal | None = None
    stream: bool = True
    app_context: AppContext | None = None


class ChatResponse(BaseModel):
    content: str
    action: ActionProposal | None = None
