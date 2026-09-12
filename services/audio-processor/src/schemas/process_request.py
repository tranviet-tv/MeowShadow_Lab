"""Schemas representing audio processing request inputs."""

from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field
from .pacing_params import PacingParams


class AudioClipItem(BaseModel):
    """Metadata and filesystem location of a synthesized audio clip."""

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Unique chunk or clip identifier.")
    order: int = Field(..., ge=0, description="Sequential ordering in script.")
    lang: Literal["vi", "en", "ja"] = Field(..., description="Language code of this clip.")
    text: str = Field(..., description="Spoken textual sentence content.")
    audio_path: str = Field(..., description="Filesystem path to clip audio (WAV or MP3).")
    duration_ms: Optional[int] = Field(
        default=None,
        ge=0,
        description="Measured duration of audio clip in milliseconds, if known beforehand.",
    )


class ProcessRequest(BaseModel):
    """Payload to trigger pacing assembly and audio mastering."""

    model_config = ConfigDict(populate_by_name=True)

    task_id: Optional[str] = Field(default=None, description="Optional background queue task UUID.")
    lesson_id: Optional[str] = Field(default=None, description="Target lesson UUID.")
    title: Optional[str] = Field(default="Shadowing Lesson", description="Lesson title.")
    clips: List[AudioClipItem] = Field(
        ...,
        min_length=1,
        description="Chronological collection of synthesized audio clips to pace and assemble.",
    )
    pacing_config: PacingParams = Field(
        default_factory=PacingParams,
        description="Configurable pacing and silence durations.",
    )
    output_filename: Optional[str] = Field(
        default=None,
        description="Desired output filename without extension.",
    )
