"""Pydantic schemas for TTS synthesis requests and responses."""

from typing import List, Optional
from pydantic import BaseModel, Field


class TTSChunkRequest(BaseModel):
    """A single text chunk to be synthesized into speech."""

    id: str = Field(default="", description="Unique identifier for the chunk")
    order: int = Field(default=0, description="Sequential ordering index of the chunk")
    text: str = Field(..., min_length=1, description="Raw or formatted text sentence to synthesize")
    voice_id: Optional[str] = Field(default=None, description="Voice identifier, e.g. vi-VN-HoaiMyNeural")
    lang: Optional[str] = Field(default=None, description="Language code ('vi', 'en', 'ja') if voice_id not specified")
    rate: str = Field(default="+0%", description="Speech speed adjustment (e.g. +0%, +10%, -15%)")
    pitch: str = Field(default="+0Hz", description="Voice pitch adjustment (e.g. +0Hz, +5Hz, -5Hz)")
    volume: str = Field(default="+0%", description="Volume adjustment (e.g. +0%, +10%)")


class SynthesizePreviewRequest(BaseModel):
    """Request to synthesize a single sentence for previewing."""

    text: str = Field(..., min_length=1, description="Sentence to preview")
    voice_id: str = Field(default="vi-VN-HoaiMyNeural", description="Voice identifier")
    engine: Optional[str] = Field(default="edge-tts", description="TTS engine name ('edge-tts' or 'kokoro')")
    rate: str = Field(default="+0%", description="Speed adjustment")
    pitch: str = Field(default="+0Hz", description="Pitch adjustment")
    volume: str = Field(default="+0%", description="Volume adjustment")


class BatchTTSRequest(BaseModel):
    """Batch synthesis request for multiple chunks of a lesson."""

    lesson_id: str = Field(..., min_length=1, description="Associated lesson unique identifier")
    chunks: List[TTSChunkRequest] = Field(..., min_length=1, description="List of text chunks to synthesize")
    engine: Optional[str] = Field(default="edge-tts", description="TTS engine name ('edge-tts' or 'kokoro')")
    default_voice_vi: Optional[str] = Field(default=None, description="Default voice for Vietnamese chunks")
    default_voice_target: Optional[str] = Field(default=None, description="Default voice for target language chunks")
    concurrency: Optional[int] = Field(default=5, ge=1, le=20, description="Max concurrent synthesis tasks")


class TTSClipResult(BaseModel):
    """Synthesis result metadata for a single chunk."""

    clip_id: str = Field(..., description="Chunk ID")
    order: int = Field(default=0, description="Sequential index")
    file_path: str = Field(..., description="Relative or absolute path to generated audio clip")
    duration_sec: float = Field(default=0.0, description="Audio duration in seconds")
    cached: bool = Field(default=False, description="Whether clip was resolved from MD5 cache")
    md5_hash: str = Field(default="", description="MD5 cache key hash")
    error: Optional[str] = Field(default=None, description="Error message if synthesis failed")


class BatchTTSResponse(BaseModel):
    """Response payload returning all synthesized clips in batch."""

    success: bool = True
    lesson_id: str
    total_chunks: int
    successful_chunks: int
    total_duration_sec: float = 0.0
    cache_hits: int = 0
    clips: List[TTSClipResult] = []
