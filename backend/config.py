from pydantic import Field, field_validator, ValidationError
from pydantic_settings import SettingsConfigDict, BaseSettings
import sys
from utils.helper import helper


class Settings(BaseSettings):
    """Application settings with validation."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # --- Basic Settings ---
    logging_level: str = Field(
        default="INFO",
        description="Logging level for the application"
    )

    fastapi_welcome_msg: str = Field(
        default="Access the swagger docs at '/docs'",
        description="The default message shown when opening the fastapi url in the browser"
    )

    # --- API Settings ---
    # AssemblyAI
    api_key_assemblyai: str = Field(
        description="AssemblyAI API key for audio processing"
    )

    # OpenAI
    openai_api_type: str = Field(
        default="openai",
        description="The type of OpenAI service used. Can be either 'openai' or 'azure'"
    )
    openai_api_model: str = Field(
        default="gpt-4.1-mini",
        description="The OpenAI model that should be used"
    )
    api_key_openai: str = Field(
        description="OpenAI API key for AI processing"
    )

    api_key_azure_openai: str = Field(
        description="Azure OpenAI API key for AI processing"
    )
    api_version_azure_openai: str = Field(
        description="The api version used for Azure OpenAI"
    )
    api_endpoint_azure_openai: str = Field(
        description="The endpoint url where the Azure OpenAI models are deployed"
    )
    api_deployment_name_azure_openai: str = Field(
        description="The deployment name of the Azure OpenAI model"
    )

    # --- Prompt Templates ---
    openai_api_system_prompt: str = helper.file_to_str(
        "./prompt_template_openai.md")

    # --- Validation methods ---
    @field_validator("logging_level")
    @classmethod
    def validate_logging_level(cls, v: str) -> str:
        """Validate logging level is a valid Python logging level."""
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        level = v.upper()
        if level not in valid_levels:
            raise ValueError(
                f"Invalid logging level '{v}'. Must be one of: {', '.join(valid_levels)}"
            )
        return level

    @field_validator("api_key_assemblyai")
    @classmethod
    def validate_assemblyai_key(cls, v: str) -> str:
        """Validate AssemblyAI API key is not empty."""
        if not v or not v.strip():
            raise ValueError("AssemblyAI API key cannot be empty or None")
        if len(v.strip()) < 10:  # Basic length check
            raise ValueError("AssemblyAI API key appears to be too short")
        return v.strip()

    @field_validator("api_key_openai")
    @classmethod
    def validate_openai_key(cls, v: str) -> str:
        """Validate OpenAI API key is not empty."""
        if not v or not v.strip():
            raise ValueError("OpenAI API key cannot be empty or None")
        if not v.startswith("sk-"):
            raise ValueError("OpenAI API key should start with 'sk-'")
        if len(v.strip()) < 20:  # Basic length check
            raise ValueError("OpenAI API key appears to be too short")
        return v.strip()

    def validate_all(self) -> None:
        """Validate all settings and raise ValidationError if any fail."""
        # This method is automatically called by Pydantic
        # but you can call it explicitly if needed
        pass


def get_user_friendly_error_message(error: ValidationError) -> str:
    """Convert Pydantic validation errors to user-friendly messages."""
    error_messages = []

    for error_detail in error.errors():
        field_name = error_detail.get(
            "loc", [])[-1] if error_detail.get("loc") else "unknown"
        error_type = error_detail.get("type", "")
        error_msg = error_detail.get("msg", "")

        # Map field names to user-friendly names
        field_mapping = {
            "api_key_assemblyai": "AssemblyAI API Key",
            "api_key_openai": "OpenAI API Key",
            "logging_level": "Logging Level",
            "openai_api_type": "OpenAI API Type",
            "openai_api_version": "OpenAI API Version",
            "openai_api_base": "OpenAI API Base URL",
            "openai_deployment_name": "OpenAI Deployment Name",
            "openai_api_model": "OpenAI API Model",
            "openai_api_system_prompt": "OpenAI System Prompt"
        }

        friendly_field_name = field_mapping.get(
            field_name, field_name.replace("_", " ").title())

        # Handle different error types
        if error_type == "missing":
            error_messages.append(
                f"❌ Missing: {friendly_field_name} is required")
        elif error_type == "value_error":
            error_messages.append(
                f"❌ Invalid: {friendly_field_name} - {error_msg}")
        else:
            error_messages.append(f"❌ {friendly_field_name}: {error_msg}")

    return "\n".join(error_messages)


# Create and validate config instance
try:
    config = Settings()
except ValidationError as e:
    error_message = get_user_friendly_error_message(e)
    print("\n" + "="*50)
    print("🚨 Configuration Error")
    print("="*50)
    print(error_message)
    print("\n💡 Please check your .env file and ensure all required API keys are set.")
    print("="*50)
    sys.exit(1)
except Exception as e:
    print("\n" + "="*50)
    print("🚨 Unexpected Error")
    print("="*50)
    print(f"An unexpected error occurred: {str(e)}")
    print("="*50)
    sys.exit(1)
