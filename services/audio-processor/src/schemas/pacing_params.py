"""Pacing parameters schema for Shadowing audio timing."""

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class PacingParams(BaseModel):
    """Pacing and timing configuration for shadowing audio assembly."""

    model_config = ConfigDict(
        populate_by_name=True,
        validate_assignment=True,
    )

    silence_after_vi_sec: float = Field(
        default=1.5,
        ge=0.0,
        le=10.0,
        description="Duration of silence in seconds after Vietnamese sentence (context assimilation).",
    )
    silence_after_target_sec: float = Field(
        default=3.5,
        ge=0.0,
        le=15.0,
        description="Duration of silence in seconds after target sentence (golden shadowing echo interval).",
    )
    silence_between_sentences_sec: float = Field(
        default=0.5,
        ge=0.0,
        le=5.0,
        description="Duration of pause in seconds between distinct sentence chunks.",
    )
    insert_cue_sound: bool = Field(
        default=True,
        description="Whether to play a soft chime cue when transitioning between languages.",
    )
    cue_sound_type: str = Field(
        default="chime",
        description="Identifier of chime tone asset to insert.",
    )
    export_format: Literal["mp3", "wav"] = Field(
        default="mp3",
        description="Final exported audio container format.",
    )
    audio_bitrate: Literal["128k", "192k", "320k"] = Field(
        default="192k",
        description="Bitrate encoding for MP3 output.",
    )
    target_lufs: float = Field(
        default=-16.0,
        description="Target integrated loudness in LUFS according to EBU R128 standard.",
    )
