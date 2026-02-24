from enum import Enum

from pydantic import BaseModel, Field

from models.llm import AzureConfig, LangdockConfig, LLMProvider


class FormFieldType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    DATE = "date"
    BOOLEAN = "boolean"
    LIST_STR = "list_str"
    ENUM = "enum"
    MULTI_SELECT = "multi_select"


class FormFieldDefinition(BaseModel):
    id: str = Field(..., description="Unique field identifier (UUID)")
    label: str = Field(..., min_length=1, description="Human-readable field label")
    type: FormFieldType = Field(..., description="Field data type")
    description: str | None = Field(None, description="Optional hint for the LLM about what this field expects")
    options: list[str] | None = Field(None, description="Allowed values for enum and multi_select fields")


class FillFormRequest(BaseModel):
    provider: LLMProvider = Field(..., description="Which LLM provider to use")
    api_key: str = Field(..., min_length=1, description="Provider API key (sent per-request)")
    model: str = Field(..., min_length=1, description="Model identifier")
    azure_config: AzureConfig | None = Field(None, description="Required only when provider is 'azure_openai'")
    langdock_config: LangdockConfig | None = Field(None, description="Langdock region config")
    transcript: str = Field(..., min_length=1, description="Transcript text to extract values from")
    fields: list[FormFieldDefinition] = Field(..., min_length=1, description="Form field definitions")
    previous_values: dict[str, object] | None = Field(None, description="Previously filled values for incremental updates")


class FillFormResponse(BaseModel):
    values: dict[str, object] = Field(..., description="Mapping of field_id to extracted value (or null)")
