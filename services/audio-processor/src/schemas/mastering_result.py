"""Schemas for audio mastering and pacing assembly results."""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SubtitleItem(BaseModel):
    """Timestamp entry for synchronized subtitles."""

    model_config = ConfigDict(populate_by_name=True)

    id: int = Field(..., ge=1, description="Sequential subtitle index.")
    start_time_sec: float = Field(..., ge=0.0, description="Start timestamp in seconds.")
    end_time_sec: float = Field(..., ge=0.0, description="End timestamp in seconds.")
    lang: str = Field(..., description="Spoken language code for segment.")
    text: str = Field(..., description="Subtitle text line.")


class MasteringResult(BaseModel):
    """Result of pacing assembly, mastering, and subtitle alignment."""

    model_config = ConfigDict(populate_by_name=True)

    task_id: Optional[str] = Field(default=None, description="Task identifier if queued.")
    lesson_id: Optional[str] = Field(default=None, description="Lesson identifier.")
    audio_path: str = Field(..., description="Filesystem path to the exported master audio file.")
    srt_path: Optional[str] = Field(default=None, description="Path to generated SRT subtitle file.")
    vtt_path: Optional[str] = Field(default=None, description="Path to generated WebVTT subtitle file.")
    duration_sec: float = Field(..., ge=0.0, description="Total audio duration in seconds.")
    waveform_peaks: List[float] = Field(
        default_factory=list,
        description="Downsampled waveform peaks (0.0 to 1.0) for visualizer.",
    )
    subtitles: List[SubtitleItem] = Field(
        default_factory=list,
        description="List of synchronized subtitle markers.",
    )
    loudness_lufs: Optional[float] = Field(
        default=None,
        description="Measured integrated loudness in LUFS after mastering.",
    )
