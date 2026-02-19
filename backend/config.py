from pydantic import Field, field_validator
from pydantic_settings import SettingsConfigDict, BaseSettings


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

    # --- Prompt Template Settings ---
    prompt_template_directory: str = Field(
        default="./prompt_templates",
        description="The directory where the prompt templates are stored within the backend"
    )

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


config = Settings()
