"""TTS engine abstract interfaces and base classes."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Tuple, Union
from src.schemas.voice import VoiceMetadata


class BaseTTSEngine(ABC):
    """Abstract base class establishing the contract for speech synthesis engines."""

    @property
    @abstractmethod
    def engine_name(self) -> str:
        """Return the unique engine identifier."""
        pass

    @abstractmethod
    async def synthesize_to_bytes(
        self,
        text: str,
        voice_id: str,
        rate: str = "+0%",
        pitch: str = "+0Hz",
        volume: str = "+0%",
    ) -> bytes:
        """Synthesize text into raw audio bytes (MP3/WAV)."""
        pass

    @abstractmethod
    async def synthesize_to_file(
        self,
        text: str,
        voice_id: str,
        output_path: Union[str, Path],
        rate: str = "+0%",
        pitch: str = "+0Hz",
        volume: str = "+0%",
    ) -> Tuple[Path, float]:
        """Synthesize text and save to destination file, returning path and estimated duration."""
        pass

    @abstractmethod
    def list_supported_voices(self) -> List[VoiceMetadata]:
        """Return collection of voices supported by this engine."""
        pass
