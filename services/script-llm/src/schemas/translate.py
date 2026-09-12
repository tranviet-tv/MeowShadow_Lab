"""Pydantic schemas for translation requests and responses."""

from typing import Optional
from pydantic import BaseModel, Field


class TranslateRequest(BaseModel):
    """Request payload for single text translation."""

    text: str = Field(..., min_length=1, description="Input text to translate")
    source_lang: str = Field(default="vi", pattern="^(vi|en|ja)$", description="Source language code")
    target_lang: str = Field(default="en", pattern="^(vi|en|ja)$", description="Target language code")
    model: Optional[str] = Field(default=None, description="Optional override for Ollama model name")


class TranslateResponse(BaseModel):
    """Response payload returning translated text."""

    success: bool = Field(default=True, description="Operation success flag")
    source_text: str = Field(..., description="Original input text")
    translated_text: str = Field(..., description="Translated output text")
    source_lang: str = Field(..., description="Source language")
    target_lang: str = Field(..., description="Target language")
    model: str = Field(..., description="Model identifier used for translation")
