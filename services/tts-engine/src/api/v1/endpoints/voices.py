"""Voices catalog endpoint."""

from typing import Optional
from fastapi import APIRouter, Query
from src.schemas.voice import VoiceListResponse, get_all_voices

router = APIRouter(tags=["Voices"])


@router.get("/voices", response_model=VoiceListResponse)
async def list_voices(
    language: Optional[str] = Query(None, description="Filter by language code (vi, en, ja)"),
    gender: Optional[str] = Query(None, description="Filter by gender (Female, Male)"),
):
    """Retrieve available multilingual TTS voice catalog."""
    voices = get_all_voices(language=language, gender=gender)
    return VoiceListResponse(
        success=True,
        total=len(voices),
        voices=voices,
    )
