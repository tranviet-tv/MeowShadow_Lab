"""Waveform peaks extraction service for audio visualizer rendering."""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np
from pydub import AudioSegment

logger = logging.getLogger(__name__)


class WaveformBuilder:
    """Extract downsampled, normalized amplitude peaks for waveform visualizers."""

    def __init__(self, default_peaks_count: int = 150):
        self.default_peaks_count = default_peaks_count

    def generate_peaks(
        self,
        audio_input: Union[AudioSegment, str, Path],
        target_peaks: Optional[int] = None,
        normalize: bool = True,
    ) -> List[float]:
        """
        Extract downsampled amplitude peak values normalized between 0.0 and 1.0.

        :param audio_input: AudioSegment or filesystem path to an audio file.
        :param target_peaks: Number of peak points desired (typically 100 to 200).
        :param normalize: Whether to scale max amplitude to 1.0.
        :return: List of float values representing amplitude peaks.
        """
        num_peaks = target_peaks if target_peaks is not None else self.default_peaks_count
        if num_peaks <= 0:
            raise ValueError("target_peaks must be greater than 0")

        # Load AudioSegment if path was provided
        if isinstance(audio_input, AudioSegment):
            segment = audio_input
        else:
            path = Path(audio_input)
            if not path.exists():
                raise FileNotFoundError(f"Audio file not found for waveform extraction: {path}")
            segment = AudioSegment.from_file(str(path))

        # Handle empty audio
        if len(segment) == 0:
            return [0.0] * num_peaks

        # Convert audio to mono 16-bit PCM numpy array
        mono_segment = segment.set_channels(1)
        samples = np.array(mono_segment.get_array_of_samples(), dtype=np.float32)

        total_samples = len(samples)
        if total_samples == 0:
            return [0.0] * num_peaks

        # Compute absolute values
        abs_samples = np.abs(samples)

        # Handle case where total samples are fewer than requested peaks
        if total_samples < num_peaks:
            padded = np.pad(abs_samples, (0, num_peaks - total_samples), mode="constant")
            max_val = np.max(padded)
            if normalize and max_val > 0:
                padded = padded / max_val
            return [round(float(v), 4) for v in padded]

        # Partition samples into bucket windows and extract maximum peak per bucket
        bucket_size = total_samples / float(num_peaks)
        peaks: List[float] = []

        for i in range(num_peaks):
            start_idx = int(i * bucket_size)
            end_idx = int((i + 1) * bucket_size)
            if start_idx >= end_idx:
                end_idx = start_idx + 1
            chunk = abs_samples[start_idx:min(end_idx, total_samples)]

            if len(chunk) > 0:
                peaks.append(float(np.max(chunk)))
            else:
                peaks.append(0.0)

        # Normalize peaks to [0.0, 1.0] range
        peaks_array = np.array(peaks, dtype=np.float32)
        max_amplitude = np.max(peaks_array)

        if normalize and max_amplitude > 0:
            peaks_array = peaks_array / max_amplitude

        return [round(float(p), 4) for p in peaks_array]

    def export_waveform_json(
        self,
        peaks: List[float],
        duration_sec: float,
        output_path: Union[str, Path],
    ) -> Path:
        """
        Export waveform peaks array and duration to JSON file.

        :param peaks: Array of normalized peak floats.
        :param duration_sec: Overall duration of the track in seconds.
        :param output_path: Destination JSON filepath.
        :return: Path to the generated JSON file.
        """
        dest = Path(output_path)
        dest.parent.mkdir(parents=True, exist_ok=True)

        payload: Dict[str, Any] = {
            "peaks": peaks,
            "durationSec": round(duration_sec, 3),
            "totalPoints": len(peaks),
        }

        dest.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return dest


waveform_builder = WaveformBuilder()
