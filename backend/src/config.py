"""
Configuration management for AI Planning Assistant backend
Loads settings from environment variables using pydantic-settings
"""

from functools import lru_cache
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    app_env: str = Field(default="development", alias="APP_ENV")
    app_name: str = "AI Planning Assistant API"
    app_version: str = "0.1.0"
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # CORS
    cors_origins: List[str] = Field(
        default=["http://localhost:5173"], alias="CORS_ORIGINS"
    )

    # Database
    database_url: str = Field(
        default="sqlite:///./planning_assistant.db", alias="DATABASE_URL"
    )

    # Azure OpenAI (via Azure AI Foundry)
    azure_openai_endpoint: str = Field(default="", alias="AZURE_OPENAI_ENDPOINT")
    azure_openai_api_key: str = Field(default="", alias="AZURE_OPENAI_API_KEY")
    azure_openai_model: str = Field(default="o1-mini", alias="AZURE_OPENAI_MODEL")
    azure_openai_api_version: str = Field(
        default="2024-02-01", alias="AZURE_OPENAI_API_VERSION"
    )

    # File Storage
    upload_dir: str = Field(default="./uploads", alias="UPLOAD_DIR")
    max_upload_size_mb: int = Field(default=10, alias="MAX_UPLOAD_SIZE_MB")

    # Performance
    plan_generation_timeout_seconds: int = Field(default=300, alias="PLAN_GENERATION_TIMEOUT")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance
    Use lru_cache to create singleton pattern
    """
    return Settings()
