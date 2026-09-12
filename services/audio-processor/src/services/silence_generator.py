"""Millisecond-accurate digital silence generator service using Pydub."""

import io
import math
from typing import Optional
from pydub import AudioSegment
from src.config import settings


class SilenceGenerator:
    """Service responsible for synthesizing exact digital silence audio segments."""

    def __init__(
        self,
        default_sample_rate: Optional[int] = None,
        default_channels: Optional[int] = None,
        default_sample_width: Optional[int] = None,
    ):
        self.sample_rate = default_sample_rate or settings.sample_rate
        self.channels = default_channels or settings.channels
        self.sample_width = default_sample_width or settings.sample_width_bytes

    def generate_silence_ms(
        self,
        duration_ms: int,
        sample_rate: Optional[int] = None,
        channels: Optional[int] = None,
    ) -> AudioSegment:
        """
        Generate a digital silence AudioSegment with millisecond accuracy.

        :param duration_ms: Duration of silence in milliseconds.
        :param sample_rate: Sample rate in Hz (defaults to configured 44100 Hz).
        :param channels: Channel count (1 for mono, 2 for stereo).
        :return: Pydub AudioSegment containing zero-amplitude PCM audio.
        :raises ValueError: If duration_ms is negative.
        """
        if duration_ms < 0:
            raise ValueError(f"Duration cannot be negative, got {duration_ms}ms")

        sr = sample_rate or self.sample_rate
        ch = channels or self.channels

        if duration_ms == 0:
            return AudioSegment.empty()

        # AudioSegment.silent creates 16-bit mono silence at specified frame rate
        segment = AudioSegment.silent(duration=duration_ms, frame_rate=sr)

        # Match stereo / multi-channel configuration if requested
        if ch != 1:
            segment = segment.set_channels(ch)

        # Enforce exact 16-bit sample width (2 bytes)
        if segment.sample_width != self.sample_width:
            segment = segment.set_sample_width(self.sample_width)

        return segment

    def generate_silence_sec(
        self,
        duration_sec: float,
        sample_rate: Optional[int] = None,
        channels: Optional[int] = None,
    ) -> AudioSegment:
        """
        Generate digital silence from seconds, rounding to the nearest millisecond.

        :param duration_sec: Duration in seconds (e.g., 1.5, 3.5, 0.5).
        :param sample_rate: Sample rate in Hz.
        :param channels: Channel count.
        :return: AudioSegment of exact duration.
        """
        if duration_sec < 0.0:
            raise ValueError(f"Duration cannot be negative, got {duration_sec}s")

        duration_ms = int(math.floor(duration_sec * 1000.0 + 0.5))
        return self.generate_silence_ms(
            duration_ms=duration_ms,
            sample_rate=sample_rate,
            channels=channels,
        )

    def generate_vi_silence(
        self,
        duration_sec: Optional[float] = None,
        sample_rate: Optional[int] = None,
        channels: Optional[int] = None,
    ) -> AudioSegment:
        """Generate standardized silence after Vietnamese sentence (default: 1.5s)."""
        dur = duration_sec if duration_sec is not None else settings.default_silence_after_vi_sec
        return self.generate_silence_sec(dur, sample_rate=sample_rate, channels=channels)

    def generate_target_silence(
        self,
        duration_sec: Optional[float] = None,
        sample_rate: Optional[int] = None,
        channels: Optional[int] = None,
    ) -> AudioSegment:
        """Generate standardized shadowing repetition silence after target sentence (default: 3.5s)."""
        dur = duration_sec if duration_sec is not None else settings.default_silence_after_target_sec
        return self.generate_silence_sec(dur, sample_rate=sample_rate, channels=channels)

    def generate_inter_chunk_silence(
        self,
        duration_sec: Optional[float] = None,
        sample_rate: Optional[int] = None,
        channels: Optional[int] = None,
    ) -> AudioSegment:
        """Generate standardized inter-chunk pause between sentence blocks (default: 0.5s)."""
        dur = duration_sec if duration_sec is not None else settings.default_silence_between_sentences_sec
        return self.generate_silence_sec(dur, sample_rate=sample_rate, channels=channels)

    def export_silence_wav_bytes(
        self,
        duration_ms: int,
        sample_rate: Optional[int] = None,
        channels: Optional[int] = None,
    ) -> bytes:
        """Export generated silence segment as in-memory WAV byte stream."""
        segment = self.generate_silence_ms(duration_ms, sample_rate=sample_rate, channels=channels)
        buffer = io.BytesIO()
        segment.export(buffer, format="wav")
        return buffer.getvalue()

    @staticmethod
    def is_absolute_silence(segment: AudioSegment) -> bool:
        """
        Verify whether an AudioSegment represents absolute digital silence.

        Checks that RMS amplitude is strictly zero and peak amplitude is zero.
        """
        if len(segment) == 0:
            return True
        return segment.rms == 0 and segment.max == 0


# Default global service singleton
silence_generator = SilenceGenerator()
