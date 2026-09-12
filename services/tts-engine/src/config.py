"""Application configuration management using Pydantic Settings."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration settings for tts-engine service."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Service metadata
    app_name: str = "msl-tts-engine"
    app_version: str = "1.0.0"
    debug: bool = False

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8002

    # Storage paths (defaults to /app/storage in Docker or ./storage locally)
    storage_dir: str = os.getenv("STORAGE_DIR", "./storage")

    # Redis broker address
    redis_addr: str = os.getenv("REDIS_ADDR", "localhost:6379")

    # Default speech synthesis options
    default_engine: str = "edge-tts"
    default_voice_vi: str = "vi-VN-HoaiMyNeural"
    default_voice_en: str = "en-US-JennyNeural"
    default_voice_ja: str = "ja-JP-NanamiNeural"
    default_rate: str = "+0%"
    default_pitch: str = "+0Hz"
    default_volume: str = "+0%"

    # Concurrency control for async batch synthesis
    concurrency_limit: int = 5

    def get_storage_path(self) -> Path:
        """Resolve base storage directory and ensure it exists."""
        path = Path(self.storage_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    def get_cache_dir(self) -> Path:
        """Resolve and ensure cache directory exists."""
        cache_path = self.get_storage_path() / "cache"
        cache_path.mkdir(parents=True, exist_ok=True)
        return cache_path

    def get_audio_dir(self) -> Path:
        """Resolve and ensure audio output directory exists."""
        audio_path = self.get_storage_path() / "audio"
        audio_path.mkdir(parents=True, exist_ok=True)
        return audio_path


settings = Settings()
