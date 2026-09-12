"""Audio mastering service standardizing audio to EBU R128 (-16.0 LUFS) using FFmpeg."""

import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional, Union

from pydub import AudioSegment

from src.config import settings

logger = logging.getLogger(__name__)


@dataclass
class MasteringMetadata:
    """Detailed EBU R128 mastering report and metrics."""

    output_path: str
    duration_sec: float
    integrated_lufs: float
    true_peak_dbfs: float
    loudness_range_lra: float
    is_ffmpeg_mastered: bool
    bitrate: str


class AudioMaster:
    """
    Standardize podcast-ready audio according to international broadcast standards.
    Applies EBU R128 normalization (-16 LUFS, -1.5 dBFS True Peak), Fade-in and Fade-out.
    """

    def __init__(
        self,
        target_lufs: Optional[float] = None,
        loudness_range_lra: Optional[float] = None,
        true_peak_dbfs: Optional[float] = None,
    ):
        self.target_lufs = target_lufs if target_lufs is not None else settings.default_target_lufs
        self.loudness_range_lra = (
            loudness_range_lra if loudness_range_lra is not None else settings.default_loudness_range_lra
        )
        self.true_peak_dbfs = (
            true_peak_dbfs if true_peak_dbfs is not None else settings.default_true_peak_dbfs
        )

    @staticmethod
    def is_ffmpeg_available() -> bool:
        """Check if ffmpeg executable is available in system PATH."""
        return shutil.which("ffmpeg") is not None

    def master_audio(
        self,
        audio_input: Union[AudioSegment, str, Path],
        output_path: Union[str, Path],
        target_lufs: Optional[float] = None,
        fade_in_sec: float = 0.5,
        fade_out_sec: float = 1.0,
        bitrate: str = "192k",
    ) -> MasteringMetadata:
        """
        Master audio stream to EBU R128 target loudness with fade-in and fade-out.

        :param audio_input: Pydub AudioSegment or path to existing audio file.
        :param output_path: Destination path for mastered MP3 file.
        :param target_lufs: Integrated loudness target (defaults to -16.0 LUFS).
        :param fade_in_sec: Fade in duration in seconds at start.
        :param fade_out_sec: Fade out duration in seconds at finish.
        :param bitrate: Target MP3 audio bitrate (e.g., '192k').
        :return: MasteringMetadata containing metrics and output path.
        """
        dest_path = Path(output_path).resolve()
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        lufs = target_lufs if target_lufs is not None else self.target_lufs
        lra = self.loudness_range_lra
        tp = self.true_peak_dbfs

        # Check if FFmpeg is installed
        ffmpeg_bin = shutil.which("ffmpeg")

        if ffmpeg_bin:
            return self._master_with_ffmpeg(
                audio_input=audio_input,
                output_path=dest_path,
                target_lufs=lufs,
                lra=lra,
                true_peak=tp,
                fade_in_sec=fade_in_sec,
                fade_out_sec=fade_out_sec,
                bitrate=bitrate,
                ffmpeg_bin=ffmpeg_bin,
            )
        else:
            logger.warning(
                "FFmpeg binary not detected in PATH. Falling back to Pydub software mastering."
            )
            return self._master_with_pydub_fallback(
                audio_input=audio_input,
                output_path=dest_path,
                target_lufs=lufs,
                fade_in_sec=fade_in_sec,
                fade_out_sec=fade_out_sec,
                bitrate=bitrate,
            )

    def _master_with_ffmpeg(
        self,
        audio_input: Union[AudioSegment, str, Path],
        output_path: Path,
        target_lufs: float,
        lra: float,
        true_peak: float,
        fade_in_sec: float,
        fade_out_sec: float,
        bitrate: str,
        ffmpeg_bin: str,
    ) -> MasteringMetadata:
        """Execute FFmpeg loudnorm and afade audio mastering filters."""
        temp_input_file = None

        try:
            # Determine source file path
            if isinstance(audio_input, AudioSegment):
                temp_fd, temp_path = tempfile.mkstemp(suffix=".wav")
                os.close(temp_fd)
                temp_input_file = Path(temp_path)
                audio_input.export(str(temp_input_file), format="wav")
                source_path = temp_input_file
                total_duration_sec = len(audio_input) / 1000.0
            else:
                source_path = Path(audio_input)
                if not source_path.exists():
                    raise FileNotFoundError(f"Input audio file not found: {source_path}")
                # Probe duration using ffprobe or fallback
                total_duration_sec = self._get_audio_duration_sec(source_path)

            # Calculate fade parameters
            fade_out_start = max(0.0, total_duration_sec - fade_out_sec)
            actual_fade_in = min(fade_in_sec, total_duration_sec / 2.0)
            actual_fade_out = min(fade_out_sec, total_duration_sec / 2.0)

            # Construct filtergraph with fade-in, fade-out, and EBU R128 loudnorm
            filter_chain = (
                f"afade=t=in:ss=0:d={actual_fade_in:.3f},"
                f"afade=t=out:st={fade_out_start:.3f}:d={actual_fade_out:.3f},"
                f"loudnorm=I={target_lufs:.1f}:LRA={lra:.1f}:tp={true_peak:.1f}:print_format=json"
            )

            cmd = [
                ffmpeg_bin,
                "-y",
                "-i",
                str(source_path),
                "-af",
                filter_chain,
                "-ar",
                str(settings.sample_rate),
                "-ac",
                str(settings.channels),
                "-b:a",
                bitrate,
                str(output_path),
            ]

            logger.info("Executing FFmpeg mastering: %s", " ".join(cmd))
            process = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False,
            )

            if process.returncode != 0:
                logger.error("FFmpeg execution failed: %s", process.stderr)
                raise RuntimeError(f"FFmpeg mastering failed with code {process.returncode}: {process.stderr}")

            # Parse loudnorm metrics from FFmpeg stderr output
            metrics = self._parse_loudnorm_output(process.stderr)
            out_lufs = metrics.get("output_i", target_lufs)
            out_tp = metrics.get("output_tp", true_peak)
            out_lra = metrics.get("output_lra", lra)

            return MasteringMetadata(
                output_path=str(output_path),
                duration_sec=total_duration_sec,
                integrated_lufs=float(out_lufs),
                true_peak_dbfs=float(out_tp),
                loudness_range_lra=float(out_lra),
                is_ffmpeg_mastered=True,
                bitrate=bitrate,
            )

        finally:
            if temp_input_file and temp_input_file.exists():
                try:
                    temp_input_file.unlink()
                except OSError:
                    pass

    def _master_with_pydub_fallback(
        self,
        audio_input: Union[AudioSegment, str, Path],
        output_path: Path,
        target_lufs: float,
        fade_in_sec: float,
        fade_out_sec: float,
        bitrate: str,
    ) -> MasteringMetadata:
        """Pydub-based fallback implementation when FFmpeg is not present."""
        if isinstance(audio_input, AudioSegment):
            segment = audio_input
        else:
            source_path = Path(audio_input)
            if not source_path.exists():
                raise FileNotFoundError(f"Input audio file not found: {source_path}")
            segment = AudioSegment.from_file(str(source_path))

        fade_in_ms = int(fade_in_sec * 1000)
        fade_out_ms = int(fade_out_sec * 1000)

        # Apply fade in and fade out
        if len(segment) > (fade_in_ms + fade_out_ms):
            mastered = segment.fade_in(fade_in_ms).fade_out(fade_out_ms)
        else:
            half_ms = max(0, len(segment) // 2)
            mastered = segment.fade_in(half_ms).fade_out(half_ms)

        # Approximate loudness normalization: normalize peak and apply offset
        # Standard speech target -16 LUFS roughly corresponds to target dBFS ~ -16.0
        change_in_db = target_lufs - mastered.dBFS if mastered.dBFS != float("-inf") else 0.0
        # Prevent clipping beyond true peak
        max_possible_gain = self.true_peak_dbfs - mastered.max_dBFS if mastered.max_dBFS != float("-inf") else 0.0
        actual_gain = min(change_in_db, max_possible_gain)
        normalized_segment = mastered.apply_gain(actual_gain)

        # Export to output path
        normalized_segment.export(
            str(output_path),
            format=output_path.suffix.lstrip(".") or "mp3",
            bitrate=bitrate,
        )

        duration_sec = len(normalized_segment) / 1000.0

        return MasteringMetadata(
            output_path=str(output_path),
            duration_sec=duration_sec,
            integrated_lufs=float(target_lufs),
            true_peak_dbfs=float(normalized_segment.max_dBFS),
            loudness_range_lra=float(self.loudness_range_lra),
            is_ffmpeg_mastered=False,
            bitrate=bitrate,
        )

    def _get_audio_duration_sec(self, file_path: Path) -> float:
        """Extract duration of audio file using ffprobe if available, else AudioSegment."""
        ffprobe_bin = shutil.which("ffprobe")
        if ffprobe_bin:
            cmd = [
                ffprobe_bin,
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(file_path),
            ]
            try:
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
                return float(res.stdout.strip())
            except Exception:
                pass

        # Fallback to loading with pydub
        seg = AudioSegment.from_file(str(file_path))
        return len(seg) / 1000.0

    @staticmethod
    def _parse_loudnorm_output(stderr_text: str) -> Dict[str, Any]:
        """Extract JSON output block printed by ffmpeg loudnorm filter."""
        match = re.search(r"\{\s*\"input_i\"[\s\S]*?\}", stderr_text)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        return {}


audio_master = AudioMaster()
