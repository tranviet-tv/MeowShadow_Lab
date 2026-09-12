"""Pydantic data schemas for tts-engine service."""

from src.schemas.voice import VoiceMetadata, VoiceListResponse
from src.schemas.tts import (
    TTSChunkRequest,
    BatchTTSRequest,
    TTSClipResult,
    BatchTTSResponse,
    SynthesizePreviewRequest,
)

__all__ = [
    "VoiceMetadata",
    "VoiceListResponse",
    "TTSChunkRequest",
    "BatchTTSRequest",
    "TTSClipResult",
    "BatchTTSResponse",
    "SynthesizePreviewRequest",
]
