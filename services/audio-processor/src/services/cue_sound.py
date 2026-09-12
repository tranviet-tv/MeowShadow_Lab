"""Audio cue sound service for language transition chimes."""

import io
import math
from pathlib import Path
from typing import Dict, Optional, Tuple
import numpy as np
from pydub import AudioSegment
from src.config import settings


class CueSoundService:
    """Service responsible for loading, synthesizing, and caching transition cue sounds."""

    def __init__(self):
        # In-memory cache for audio segments keyed by (cue_name, sample_rate, channels)
        self._cache: Dict[Tuple[str, int, int], AudioSegment] = {}

    def synthesize_chime(
        self,
        duration_ms: int = 400,
        freq1: float = 880.0,
        freq2: float = 1320.0,
        sample_rate: Optional[int] = None,
        channels: Optional[int] = None,
        decay_rate: float = 8.5,
    ) -> AudioSegment:
        """
        Synthesize a gentle, harmonic bell chime with smooth attack and exponential decay.

        :param duration_ms: Length of the chime in milliseconds.
        :param freq1: Fundamental frequency in Hz (default: 880 Hz - A5).
        :param freq2: Harmonic overtone in Hz (default: 1320 Hz - E6).
        :param sample_rate: Audio sample rate (defaults to configured 44100 Hz).
        :param channels: Number of channels (defaults to configured 2 / Stereo).
        :param decay_rate: Exponential decay rate factor.
        :return: Pydub AudioSegment.
        """
        sr = sample_rate or settings.sample_rate
        ch = channels or settings.channels

        num_samples = int(sr * (duration_ms / 1000.0))
        t = np.linspace(0.0, duration_ms / 1000.0, num_samples, endpoint=False)

        # Dual harmonic sine wave (60% fundamental + 40% overtone)
        wave = 0.6 * np.sin(2.0 * np.pi * freq1 * t) + 0.4 * np.sin(2.0 * np.pi * freq2 * t)

        # Smooth attack envelope (first 5ms) to eliminate initial click
        attack_samples = max(1, int(sr * 0.005))
        attack_env = np.ones(num_samples)
        if attack_samples < num_samples:
            attack_env[:attack_samples] = np.linspace(0.0, 1.0, attack_samples)

        # Exponential decay envelope
        decay_env = np.exp(-decay_rate * t)
        envelope = attack_env * decay_env

        # Apply envelope and scale to soft audible range (-14 dBFS peak ~ 6500 in 16-bit)
        scaled_signal = wave * envelope * 6500.0
        int16_samples = np.int16(np.clip(scaled_signal, -32768, 32767))

        # Handle stereo duplication
        if ch == 2:
            stereo_samples = np.empty((num_samples * 2,), dtype=np.int16)
            stereo_samples[0::2] = int16_samples
            stereo_samples[1::2] = int16_samples
            raw_data = stereo_samples.tobytes()
        else:
            raw_data = int16_samples.tobytes()

        return AudioSegment(
            data=raw_data,
            sample_width=settings.sample_width_bytes,
            frame_rate=sr,
            channels=ch,
        )

    def get_cue_sound(
        self,
        cue_name: str = "chime",
        sample_rate: Optional[int] = None,
        channels: Optional[int] = None,
    ) -> AudioSegment:
        """
        Retrieve audio cue segment from cache, filesystem asset, or fallback synthesis.

        :param cue_name: Asset identifier (e.g., 'chime').
        :param sample_rate: Desired sample rate.
        :param channels: Desired channel count.
        :return: Prepared AudioSegment ready for sequence concatenation.
        """
        sr = sample_rate or settings.sample_rate
        ch = channels or settings.channels
        cache_key = (cue_name, sr, ch)

        if cache_key in self._cache:
            return self._cache[cache_key]

        # Search candidates in assets and storage
        candidate_paths = [
            Path(f"assets/audio/{cue_name}.wav"),
            Path(f"assets/audio/{cue_name}.mp3"),
            Path(settings.storage_dir) / f"cues/{cue_name}.wav",
            Path(settings.storage_dir) / f"cues/{cue_name}.mp3",
        ]

        segment: Optional[AudioSegment] = None
        for path in candidate_paths:
            if path.exists() and path.is_file():
                try:
                    loaded = AudioSegment.from_file(str(path))
                    # Standardize format
                    if loaded.frame_rate != sr:
                        loaded = loaded.set_frame_rate(sr)
                    if loaded.channels != ch:
                        loaded = loaded.set_channels(ch)
                    if loaded.sample_width != settings.sample_width_bytes:
                        loaded = loaded.set_sample_width(settings.sample_width_bytes)
                    segment = loaded
                    break
                except Exception:
                    # Continue searching if file reading encounters format issues
                    continue

        # If not found on disk, synthesize and optionally save master asset
        if segment is None:
            segment = self.synthesize_chime(sample_rate=sr, channels=ch)
            self._save_default_asset(cue_name, segment)

        self._cache[cache_key] = segment
        return segment

    def _save_default_asset(self, cue_name: str, segment: AudioSegment) -> None:
        """Persist default synthesized cue asset to standard asset folders."""
        for target_dir in [Path("assets/audio"), Path(settings.storage_dir) / "cues"]:
            try:
                target_dir.mkdir(parents=True, exist_ok=True)
                out_path = target_dir / f"{cue_name}.wav"
                if not out_path.exists():
                    segment.export(str(out_path), format="wav")
            except Exception:
                # Do not block runtime if filesystem write fails
                pass

    def clear_cache(self) -> None:
        """Clear cached audio segments."""
        self._cache.clear()


# Default singleton instance
cue_sound_service = CueSoundService()
