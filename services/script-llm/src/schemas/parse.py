"""Pydantic schemas for tag parser request and response payloads."""

from typing import List, Optional
from pydantic import BaseModel, Field
from src.schemas.chunk import ScriptChunk, ChunkPair


class ParseRequest(BaseModel):
    """Request payload for parsing tagged script text."""

    raw_text: str = Field(..., min_length=1, description="Raw script containing [VI], [EN], or [JA] tags")
    target_lang: Optional[str] = Field(default="en", pattern="^(en|ja)$", description="Target language if ambiguous")
    generate_pairs: bool = Field(default=True, description="Whether to automatically synthesize bilingual pairs")


class ParseResponse(BaseModel):
    """Response payload returning extracted chunks and synthesized pairs."""

    success: bool = Field(default=True, description="Operation success flag")
    total_chunks: int = Field(..., ge=0, description="Total number of valid sentence chunks extracted")
    total_pairs: int = Field(..., ge=0, description="Total number of bilingual pairs formed")
    chunks: List[ScriptChunk] = Field(default=[], description="List of sequential sentence chunks")
    pairs: List[ChunkPair] = Field(default=[], description="List of synthesized cue-shadowing pairs")
    raw_char_count: int = Field(..., ge=0, description="Total character count of the input text")
