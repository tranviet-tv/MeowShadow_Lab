"""Unit tests for millisecond-accurate digital silence generator."""

import io
import pytest
from pydub import AudioSegment
from src.services.silence_generator import SilenceGenerator


class TestSilenceGenerator:
    """Test suite verifying silence generation accuracy, audio properties, and edge cases."""

    def test_generate_silence_ms_exact_duration(self, generator: SilenceGenerator):
        """Verify that duration in milliseconds matches exactly."""
        durations = [1, 50, 500, 1500, 3500]
        for dur in durations:
            segment = generator.generate_silence_ms(dur)
            assert len(segment) == dur, f"Expected {dur}ms, got {len(segment)}ms"

    def test_generate_silence_sec_conversions(self, generator: SilenceGenerator):
        """Verify seconds to milliseconds conversion and rounding."""
        # 1.5 seconds -> 1500 ms (VI silence)
        vi_segment = generator.generate_silence_sec(1.5)
        assert len(vi_segment) == 1500

        # 3.5 seconds -> 3500 ms (EN/JA target silence)
        target_segment = generator.generate_silence_sec(3.5)
        assert len(target_segment) == 3500

        # 0.5 seconds -> 500 ms (Inter-chunk silence)
        pause_segment = generator.generate_silence_sec(0.5)
        assert len(pause_segment) == 500

        # Fractional second rounding
        frac_segment = generator.generate_silence_sec(0.1256)
        assert len(frac_segment) == 126

    def test_pacing_preset_helpers(self, generator: SilenceGenerator):
        """Verify dedicated Shadowing preset generation helper methods."""
        vi_silence = generator.generate_vi_silence()
        assert len(vi_silence) == 1500

        target_silence = generator.generate_target_silence()
        assert len(target_silence) == 3500

        inter_chunk_silence = generator.generate_inter_chunk_silence()
        assert len(inter_chunk_silence) == 500

    def test_custom_durations_in_presets(self, generator: SilenceGenerator):
        """Verify override duration arguments in preset helper methods."""
        custom_vi = generator.generate_vi_silence(duration_sec=2.0)
        assert len(custom_vi) == 2000

        custom_target = generator.generate_target_silence(duration_sec=4.0)
        assert len(custom_target) == 4000

        custom_pause = generator.generate_inter_chunk_silence(duration_sec=1.0)
        assert len(custom_pause) == 1000

    def test_zero_duration(self, generator: SilenceGenerator):
        """Verify handling of zero duration returns empty segment."""
        empty_ms = generator.generate_silence_ms(0)
        assert len(empty_ms) == 0

        empty_sec = generator.generate_silence_sec(0.0)
        assert len(empty_sec) == 0

    def test_negative_duration_raises_error(self, generator: SilenceGenerator):
        """Verify that negative duration raises a ValueError."""
        with pytest.raises(ValueError, match="Duration cannot be negative"):
            generator.generate_silence_ms(-100)

        with pytest.raises(ValueError, match="Duration cannot be negative"):
            generator.generate_silence_sec(-0.5)

    def test_audio_properties(self, generator: SilenceGenerator):
        """Verify sample rate, channels, and sample width adhere to specification."""
        segment = generator.generate_silence_ms(1000, sample_rate=44100, channels=2)

        assert segment.frame_rate == 44100
        assert segment.channels == 2
        assert segment.sample_width == 2  # 16-bit PCM

        mono_segment = generator.generate_silence_ms(500, sample_rate=22050, channels=1)
        assert mono_segment.frame_rate == 22050
        assert mono_segment.channels == 1

    def test_absolute_silence_amplitude(self, generator: SilenceGenerator):
        """Verify generated segment is pure digital silence with 0 RMS and 0 peak."""
        segment = generator.generate_silence_sec(1.5)

        assert segment.rms == 0
        assert segment.max == 0
        assert generator.is_absolute_silence(segment) is True

    def test_export_silence_wav_bytes(self, generator: SilenceGenerator):
        """Verify exporting to in-memory WAV byte stream."""
        wav_bytes = generator.export_silence_wav_bytes(duration_ms=800)
        assert len(wav_bytes) > 0

        # Read back exported WAV and verify duration
        reconstructed = AudioSegment.from_file(io.BytesIO(wav_bytes), format="wav")
        assert len(reconstructed) == 800
        assert reconstructed.rms == 0

    def test_raw_pcm_silence_buffer(self, generator: SilenceGenerator):
        """Verify that the underlying raw audio frame data consists strictly of zero bytes."""
        segment = generator.generate_silence_ms(100, sample_rate=44100, channels=2)
        expected_byte_count = int(44100 * (100 / 1000.0) * 2 * 2)  # rate * sec * ch * width
        raw_bytes = segment.raw_data

        assert len(raw_bytes) == expected_byte_count
        assert raw_bytes == b"\x00" * expected_byte_count

    def test_rapid_silence_generation_performance(self, generator: SilenceGenerator):
        """Verify that generating multiple silence segments executes with high performance."""
        segments = [generator.generate_silence_ms(1500) for _ in range(50)]
        assert len(segments) == 50
        assert all(len(s) == 1500 for s in segments)

    def test_millisecond_precision_tolerance(self, generator: SilenceGenerator):
        """Verify that generated silence duration has zero drift (within 1ms tolerance)."""
        test_durations = [17, 333, 1499, 1500, 3500]
        for dur in test_durations:
            segment = generator.generate_silence_ms(dur)
            actual_len = len(segment)
            assert abs(actual_len - dur) <= 1, f"Drift exceeded 1ms: expected {dur}, got {actual_len}"
