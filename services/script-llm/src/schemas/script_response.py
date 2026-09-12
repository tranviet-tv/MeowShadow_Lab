"""Pydantic schemas for automated LLM chunking and end-to-end script generation."""

from typing import List, Optional
from pydantic import BaseModel, Field
from src.schemas.chunk import ScriptChunk, ChunkPair


class AutoChunkTranslateRequest(BaseModel):
    """Request payload for raw text segmentation and translation via LLM."""

    raw_text: str = Field(..., min_length=1, description="Raw monolingual or mixed essay text")
    target_lang: str = Field(default="en", pattern="^(en|ja)$", description="Target translation language")
    sentences_per_chunk: int = Field(default=3, ge=1, le=5, description="Target number of sentences per block")
    model: Optional[str] = Field(default=None, description="Optional override for Ollama LLM model")


class AutoChunkTranslateResponse(BaseModel):
    """Response payload returning formatted bilingual script and chunk metadata."""

    success: bool = Field(default=True, description="Operation success flag")
    formatted_script: str = Field(..., description="Full interleaved tagged script ([VI]...[EN]...)")
    chunks: List[ScriptChunk] = Field(default=[], description="Structured sequence of all sentence chunks")
    pairs: List[ChunkPair] = Field(default=[], description="Bilingual shadowing pairs")
    word_count: int = Field(..., ge=0, description="Total word count across all chunks")
    estimated_duration_sec: float = Field(..., ge=0.0, description="Estimated total lesson audio duration in seconds")
