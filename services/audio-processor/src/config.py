"""Application configuration management using Pydantic Settings."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration settings for audio-processor service."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Service identification
    app_name: str = "msl-audio-processor"
    app_version: str = "1.0.0"
    debug: bool = False

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8003

    # Storage paths (defaults to /app/storage in Docker, or local ./storage)
    storage_dir: str = os.getenv("STORAGE_DIR", "./storage")

    # Redis messaging & cache broker
    redis_addr: str = os.getenv("REDIS_ADDR", "localhost:6379")

    # Standard audio mastering parameters
    default_target_lufs: float = -16.0
    default_loudness_range_lra: float = 7.0
    default_true_peak_dbfs: float = -1.5

    # Standard Shadowing pacing durations (in seconds)
    default_silence_after_vi_sec: float = 1.5
    default_silence_after_target_sec: float = 3.5
    default_silence_between_sentences_sec: float = 0.5

    # Audio synthesis and encoding defaults
    sample_rate: int = 44100
    channels: int = 2
    sample_width_bytes: int = 2  # 16-bit PCM
    default_export_format: str = "mp3"
    default_audio_bitrate: str = "192k"

    def get_storage_path(self) -> Path:
        """Resolve and ensure storage directory exists."""
        path = Path(self.storage_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
