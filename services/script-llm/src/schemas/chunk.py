"""Pydantic schemas for script chunks and bilingual shadowing pairs."""

from typing import Optional
from pydantic import BaseModel, Field


class ScriptChunk(BaseModel):
    """A single sentence chunk within a shadowing script."""

    id: str = Field(..., description="Unique chunk identifier (UUIDv4)")
    order: int = Field(..., ge=0, description="Sequential ordering index in the script")
    lang: str = Field(..., pattern="^(vi|en|ja)$", description="Language code ('vi', 'en', 'ja')")
    text: str = Field(..., min_length=1, description="Sanitized sentence text")
    voice_id: Optional[str] = Field(default=None, description="Assigned TTS voice identifier")
    speed_rate: Optional[float] = Field(default=None, description="Playback speed modifier (e.g. 1.0, 1.1)")


class ChunkPair(BaseModel):
    """A logical pairing of a Vietnamese cue chunk and a target shadowing chunk."""

    order: int = Field(..., ge=0, description="Sequential order of the pair")
    target_lang: str = Field(..., pattern="^(en|ja)$", description="Target language ('en' or 'ja')")
    vi_chunk: ScriptChunk = Field(..., description="Vietnamese comprehension cue chunk")
    target_chunk: ScriptChunk = Field(..., description="Target language chunk for shadowing practice")
