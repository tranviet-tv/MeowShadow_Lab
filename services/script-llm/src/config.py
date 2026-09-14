"""Application configuration management using Pydantic Settings."""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration settings for script-llm service."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Service metadata
    app_name: str = "msl-script-llm"
    app_version: str = "1.0.0"
    debug: bool = False

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8001

    # Ollama LLM settings
    # In Docker, OLLAMA_HOST should point to http://host.docker.internal:11434
    ollama_host: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    llm_model: str = os.getenv("LLM_MODEL", "qwen3:8b")
    llm_temperature: float = 0.3
    llm_timeout_seconds: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "120.0"))

    # Redis broker settings
    redis_addr: str = os.getenv("REDIS_ADDR", "localhost:6379")

    # Audio pacing default constants
    default_wpm_vi: int = 150
    default_wpm_en: int = 140
    default_cpm_ja: int = 320
    default_silence_after_vi_sec: float = 1.5
    default_silence_after_target_sec: float = 3.5
    default_silence_between_sentences_sec: float = 0.5


settings = Settings()
