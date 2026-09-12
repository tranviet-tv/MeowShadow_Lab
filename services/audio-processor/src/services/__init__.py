"""Audio processing core services exports."""

from .silence_generator import SilenceGenerator, silence_generator
from .cue_sound import CueSoundService, cue_sound_service
from .audio_master import AudioMaster, audio_master, MasteringMetadata
from .pacing_builder import (
    PacingBuilder,
    pacing_builder,
    PacingBuildResult,
    TimelineSegment,
    SegmentType,
)

__all__ = [
    "SilenceGenerator",
    "silence_generator",
    "CueSoundService",
    "cue_sound_service",
    "PacingBuilder",
    "pacing_builder",
    "PacingBuildResult",
    "TimelineSegment",
    "SegmentType",
    "AudioMaster",
    "audio_master",
    "MasteringMetadata",
]

