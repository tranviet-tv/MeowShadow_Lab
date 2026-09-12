"""Pydantic schemas for duration and pacing estimation."""

from typing import List, Optional
from pydantic import BaseModel, Field
from src.schemas.chunk import ScriptChunk


class ChunkMetric(BaseModel):
    """Detailed audio timing metrics for an individual chunk."""

    chunk_id: str = Field(..., description="Unique identifier of the chunk")
    order: int = Field(..., ge=0, description="Sequential ordering index")
    lang: str = Field(..., description="Language of chunk")
    words_or_chars: int = Field(..., ge=0, description="Word count (VI/EN) or character count (JA)")
    speech_duration_sec: float = Field(..., ge=0.0, description="Estimated pure speech reading time")
    silence_duration_sec: float = Field(..., ge=0.0, description="Pacing silence allocated after chunk")
    total_duration_sec: float = Field(..., ge=0.0, description="Speech duration plus silence pause")


class EstimateRequest(BaseModel):
    """Request payload for audio duration estimation."""

    raw_text: Optional[str] = Field(default=None, description="Optional raw or tagged text to estimate")
    chunks: Optional[List[ScriptChunk]] = Field(default=None, description="Optional pre-parsed list of chunks")
    target_lang: str = Field(default="en", pattern="^(en|ja)$", description="Target language context")
    silence_after_vi_sec: Optional[float] = Field(default=None, ge=0.0, description="Silence after Vietnamese chunk")
    silence_after_target_sec: Optional[float] = Field(default=None, ge=0.0, description="Silence after target chunk")
    silence_between_sentences_sec: Optional[float] = Field(default=None, ge=0.0, description="Silence between sentences")


class EstimateResponse(BaseModel):
    """Response payload returning comprehensive audio duration metrics."""

    success: bool = Field(default=True, description="Operation success flag")
    total_words: int = Field(..., ge=0, description="Total word count across all chunks")
    speech_duration_sec: float = Field(..., ge=0.0, description="Total spoken duration in seconds")
    silence_duration_sec: float = Field(..., ge=0.0, description="Total silence pauses in seconds")
    total_estimated_duration_sec: float = Field(..., ge=0.0, description="Total timeline duration in seconds")
    chunks_metrics: List[ChunkMetric] = Field(default=[], description="Granular metrics per chunk")
