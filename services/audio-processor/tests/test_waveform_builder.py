"""Unit tests for WaveformBuilder service."""

import json
from pathlib import Path
import pytest
from pydub import AudioSegment
from pydub.generators import Sine

from src.services.waveform_builder import WaveformBuilder, waveform_builder


class TestWaveformBuilder:
    """Test suite for waveform peaks generation and JSON serialization."""

    @pytest.fixture
    def variable_amplitude_audio(self) -> AudioSegment:
        """Create a 3-second audio with high volume, silence, and low volume sections."""
        loud = Sine(440).to_audio_segment(duration=1000, volume=0.0)  # full volume (0 dBFS)
        silent = AudioSegment.silent(duration=1000)
        quiet = Sine(440).to_audio_segment(duration=1000, volume=-20.0)  # low volume (-20 dBFS)
        return loud + silent + quiet

    def test_default_peaks_count(self, variable_amplitude_audio):
        """Verify default target peaks count is 150."""
        builder = WaveformBuilder()
        peaks = builder.generate_peaks(variable_amplitude_audio)
        assert len(peaks) == 150
        assert all(0.0 <= p <= 1.0 for p in peaks)
        assert max(peaks) == 1.0

    def test_custom_peaks_count(self, variable_amplitude_audio):
        """Verify arbitrary peaks count (e.g. 100, 200)."""
        builder = WaveformBuilder()
        peaks_100 = builder.generate_peaks(variable_amplitude_audio, target_peaks=100)
        peaks_200 = builder.generate_peaks(variable_amplitude_audio, target_peaks=200)

        assert len(peaks_100) == 100
        assert len(peaks_200) == 200

    def test_absolute_silence_peaks(self):
        """Pure silence segment should return all 0.0."""
        silence = AudioSegment.silent(duration=2000)
        builder = WaveformBuilder()
        peaks = builder.generate_peaks(silence, target_peaks=50)

        assert len(peaks) == 50
        assert all(p == 0.0 for p in peaks)

    def test_amplitude_distribution(self, variable_amplitude_audio):
        """
        Verify peak heights reflect the structure of the audio:
        First third: loud (~1.0), middle third: silent (~0.0), last third: moderate (~0.1).
        """
        builder = WaveformBuilder()
        peaks = builder.generate_peaks(variable_amplitude_audio, target_peaks=30)

        first_third = peaks[:10]
        middle_third = peaks[10:20]
        last_third = peaks[20:]

        # Interior of middle section (away from 100ms boundary edges) must be silence
        assert all(p == 0.0 for p in middle_third[1:9])
        assert 0.05 <= max(last_third) < 0.5

    def test_generate_peaks_from_file_path(self, variable_amplitude_audio, tmp_path):
        """Verify loading audio from disk."""
        wav_file = tmp_path / "test_wave.wav"
        variable_amplitude_audio.export(str(wav_file), format="wav")

        builder = WaveformBuilder()
        peaks = builder.generate_peaks(wav_file, target_peaks=80)

        assert len(peaks) == 80
        assert max(peaks) == 1.0

    def test_nonexistent_file_raises_error(self, tmp_path):
        """Nonexistent audio file path should raise FileNotFoundError."""
        builder = WaveformBuilder()
        with pytest.raises(FileNotFoundError):
            builder.generate_peaks(tmp_path / "ghost.wav")

    def test_invalid_target_peaks_raises_error(self, variable_amplitude_audio):
        """Target peaks <= 0 should raise ValueError."""
        builder = WaveformBuilder()
        with pytest.raises(ValueError):
            builder.generate_peaks(variable_amplitude_audio, target_peaks=0)

    def test_export_waveform_json(self, variable_amplitude_audio, tmp_path):
        """Verify JSON export format and values."""
        builder = WaveformBuilder()
        peaks = builder.generate_peaks(variable_amplitude_audio, target_peaks=120)
        json_path = tmp_path / "waveform.json"

        builder.export_waveform_json(peaks, duration_sec=3.0, output_path=json_path)

        assert json_path.exists()
        data = json.loads(json_path.read_text(encoding="utf-8"))
        assert "peaks" in data
        assert "durationSec" in data
        assert "totalPoints" in data
        assert data["totalPoints"] == 120
        assert data["durationSec"] == 3.0
        assert len(data["peaks"]) == 120
