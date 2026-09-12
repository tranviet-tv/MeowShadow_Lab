"""Unit tests for AudioMaster service and EBU R128 mastering."""

import os
import shutil
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from pydub import AudioSegment
from pydub.generators import Sine

from src.services.audio_master import AudioMaster, MasteringMetadata, audio_master


@pytest.fixture
def sample_sine_audio() -> AudioSegment:
    """Generate a clean 2-second 440Hz sine wave tone."""
    tone = Sine(440).to_audio_segment(duration=2000)
    return tone.set_frame_rate(44100).set_channels(2).set_sample_width(2)


class TestAudioMaster:
    """Test suite for AudioMaster class."""

    def test_singleton_initialization(self):
        """Verify default initialization parameters."""
        master = AudioMaster()
        assert master.target_lufs == -16.0
        assert master.loudness_range_lra == 7.0
        assert master.true_peak_dbfs == -1.5

    def test_parse_loudnorm_output(self):
        """Test extraction of loudnorm JSON block from stderr."""
        stderr_sample = """
        Input #0, wav, from '/tmp/test.wav':
        [Parsed_loudnorm_2 @ 0x12345] 
        {
            "input_i" : "-22.34",
            "input_tp" : "-4.12",
            "input_lra" : "6.80",
            "input_thresh" : "-32.50",
            "output_i" : "-16.02",
            "output_tp" : "-1.50",
            "output_lra" : "5.40",
            "output_thresh" : "-26.40",
            "normalization_type" : "dynamic",
            "target_offset" : "0.02"
        }
        Output #0, mp3, to 'output.mp3':
        """
        metrics = AudioMaster._parse_loudnorm_output(stderr_sample)
        assert metrics["input_i"] == "-22.34"
        assert metrics["output_i"] == "-16.02"
        assert metrics["output_tp"] == "-1.50"
        assert metrics["output_lra"] == "5.40"

    def test_master_with_pydub_fallback(self, sample_sine_audio, tmp_path):
        """Test mastering audio using pydub fallback pipeline."""
        output_file = tmp_path / "mastered_fallback.wav"
        master = AudioMaster()

        result = master._master_with_pydub_fallback(
            audio_input=sample_sine_audio,
            output_path=output_file,
            target_lufs=-16.0,
            fade_in_sec=0.2,
            fade_out_sec=0.2,
            bitrate="192k",
        )

        assert output_file.exists()
        assert output_file.stat().st_size > 0
        assert isinstance(result, MasteringMetadata)
        assert result.duration_sec == pytest.approx(2.0, abs=0.05)
        assert result.is_ffmpeg_mastered is False

    def test_master_audio_nonexistent_file_raises(self, tmp_path):
        """Verify error when passing a nonexistent file path."""
        master = AudioMaster()
        non_existent = tmp_path / "missing.wav"
        output_file = tmp_path / "out.mp3"

        with pytest.raises(FileNotFoundError):
            master.master_audio(audio_input=non_existent, output_path=output_file)

    def test_master_audio_end_to_end(self, sample_sine_audio, tmp_path):
        """Test master_audio with direct AudioSegment."""
        output_file = tmp_path / "lesson_test.wav"
        master = AudioMaster()

        result = master.master_audio(
            audio_input=sample_sine_audio,
            output_path=output_file,
            target_lufs=-16.0,
            fade_in_sec=0.1,
            fade_out_sec=0.1,
        )

        assert Path(result.output_path).exists()
        assert Path(result.output_path).stat().st_size > 0
        assert result.duration_sec > 0

    @patch("shutil.which")
    @patch("subprocess.run")
    def test_master_with_ffmpeg_mocked(self, mock_subprocess, mock_which, sample_sine_audio, tmp_path):
        """Test FFmpeg invocation and parameter verification when FFmpeg is detected."""
        mock_which.return_value = "/usr/bin/ffmpeg"

        # Mock successful FFmpeg run with loudnorm JSON output
        mock_process = MagicMock()
        mock_process.returncode = 0
        mock_process.stderr = """
        {
            "output_i" : "-16.0",
            "output_tp" : "-1.5",
            "output_lra" : "6.9"
        }
        """
        mock_subprocess.return_value = mock_process

        output_file = tmp_path / "mocked_ffmpeg.mp3"
        master = AudioMaster()

        result = master.master_audio(
            audio_input=sample_sine_audio,
            output_path=output_file,
            target_lufs=-16.0,
            fade_in_sec=0.5,
            fade_out_sec=1.0,
            bitrate="192k",
        )

        assert mock_subprocess.called
        call_args = mock_subprocess.call_args[0][0]
        assert "/usr/bin/ffmpeg" in call_args
        assert "-af" in call_args
        # Verify loudnorm and fade filters in command arguments
        af_arg = call_args[call_args.index("-af") + 1]
        assert "afade=t=in" in af_arg
        assert "afade=t=out" in af_arg
        assert "loudnorm=I=-16.0" in af_arg

        assert result.is_ffmpeg_mastered is True
        assert result.integrated_lufs == -16.0
        assert result.true_peak_dbfs == -1.5
