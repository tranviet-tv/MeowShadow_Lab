"""Unit tests for SubtitleEngine producing accurate SRT and WebVTT subtitles."""

from pathlib import Path
import pytest
from pydub.generators import Sine

from src.schemas.pacing_params import PacingParams
from src.schemas.process_request import AudioClipItem
from src.services.pacing_builder import (
    PacingBuilder,
    SegmentType,
    TimelineSegment,
)
from src.services.subtitle_engine import (
    SubtitleEngine,
    SubtitleItem,
    format_timestamp_srt,
    format_timestamp_vtt,
    subtitle_engine,
)


class TestSubtitleFormatting:
    """Tests for subtitle timestamp conversion functions."""

    def test_format_timestamp_srt(self):
        """Verify standard SubRip timestamp format: HH:MM:SS,mmm."""
        assert format_timestamp_srt(0) == "00:00:00,000"
        assert format_timestamp_srt(500) == "00:00:00,500"
        assert format_timestamp_srt(65432) == "00:01:05,432"
        # 1 hour, 2 minutes, 3 seconds, 456 ms = 3723456 ms
        assert format_timestamp_srt(3723456) == "01:02:03,456"

    def test_format_timestamp_vtt(self):
        """Verify standard WebVTT timestamp format: HH:MM:SS.mmm."""
        assert format_timestamp_vtt(0) == "00:00:00.000"
        assert format_timestamp_vtt(500) == "00:00:00.500"
        assert format_timestamp_vtt(65432) == "00:01:05.432"
        assert format_timestamp_vtt(3723456) == "01:02:03.456"

    def test_negative_timestamp_handling(self):
        """Negative timestamps should clamp safely to 0."""
        assert format_timestamp_srt(-100) == "00:00:00,000"
        assert format_timestamp_vtt(-50) == "00:00:00.000"


class TestSubtitleEngine:
    """Test suite for subtitle extraction and export logic."""

    @pytest.fixture
    def mock_timeline(self):
        """Build sample timeline with mixed spoken and silence segments."""
        return [
            TimelineSegment(
                segment_type=SegmentType.SOURCE_SENTENCE,
                start_ms=0,
                end_ms=2500,
                duration_ms=2500,
                lang="vi",
                text="Chào bạn hôm nay thế nào?",
                chunk_id="chk-1",
            ),
            TimelineSegment(
                segment_type=SegmentType.VI_SILENCE,
                start_ms=2500,
                end_ms=4000,
                duration_ms=1500,
            ),
            TimelineSegment(
                segment_type=SegmentType.CUE_CHIME,
                start_ms=4000,
                end_ms=4250,
                duration_ms=250,
            ),
            TimelineSegment(
                segment_type=SegmentType.TARGET_SENTENCE,
                start_ms=4250,
                end_ms=7000,
                duration_ms=2750,
                lang="en",
                text="Hello, how are you today?",
                chunk_id="chk-1",
            ),
            TimelineSegment(
                segment_type=SegmentType.TARGET_SILENCE,
                start_ms=7000,
                end_ms=10500,
                duration_ms=3500,
            ),
            TimelineSegment(
                segment_type=SegmentType.INTER_CHUNK_PAUSE,
                start_ms=10500,
                end_ms=11000,
                duration_ms=500,
            ),
        ]

    def test_extract_subtitles_exact_duration(self, mock_timeline):
        """Verify extraction retains spoken duration without extending into silence."""
        engine = SubtitleEngine()
        subtitles = engine.extract_subtitles_from_timeline(mock_timeline, hold_during_silence=False)

        assert len(subtitles) == 2

        vi_sub = subtitles[0]
        assert vi_sub.id == 1
        assert vi_sub.lang == "vi"
        assert vi_sub.text == "Chào bạn hôm nay thế nào?"
        assert vi_sub.start_ms == 0
        assert vi_sub.end_ms == 2500
        assert vi_sub.start_time_sec == 0.0
        assert vi_sub.end_time_sec == 2.5

        en_sub = subtitles[1]
        assert en_sub.id == 2
        assert en_sub.lang == "en"
        assert en_sub.text == "Hello, how are you today?"
        assert en_sub.start_ms == 4250
        assert en_sub.end_ms == 7000
        assert en_sub.start_time_sec == 4.25
        assert en_sub.end_time_sec == 7.0

    def test_extract_subtitles_hold_during_silence(self, mock_timeline):
        """Verify hold_during_silence extends display time through the subsequent silence."""
        engine = SubtitleEngine()
        subtitles = engine.extract_subtitles_from_timeline(mock_timeline, hold_during_silence=True)

        assert len(subtitles) == 2
        # First subtitle should extend through the 1.5s VI silence (up to 4000 ms)
        assert subtitles[0].start_ms == 0
        assert subtitles[0].end_ms == 4000

        # Second subtitle should extend through the 3.5s target silence (up to 10500 ms)
        assert subtitles[1].start_ms == 4250
        assert subtitles[1].end_ms == 10500

    def test_generate_srt_output_structure(self, mock_timeline):
        """Verify SRT string follows standard syntax."""
        engine = SubtitleEngine()
        subtitles = engine.extract_subtitles_from_timeline(mock_timeline)
        srt_content = engine.generate_srt(subtitles, include_lang_tag=True)

        assert "1\n00:00:00,000 --> 00:00:02,500\n[VI] Chào bạn hôm nay thế nào?" in srt_content
        assert "2\n00:00:04,250 --> 00:00:07,000\n[EN] Hello, how are you today?" in srt_content

    def test_generate_vtt_output_structure(self, mock_timeline):
        """Verify WebVTT output begins with WEBVTT and uses dot milliseconds."""
        engine = SubtitleEngine()
        subtitles = engine.extract_subtitles_from_timeline(mock_timeline)
        vtt_content = engine.generate_vtt(subtitles, include_lang_tag=True)

        assert vtt_content.startswith("WEBVTT")
        assert "00:00:00.000 --> 00:00:02.500" in vtt_content
        assert "[VI] Chào bạn hôm nay thế nào?" in vtt_content
        assert "00:00:04.250 --> 00:00:07.000" in vtt_content

    def test_export_subtitle_files(self, mock_timeline, tmp_path):
        """Verify physical file generation with UTF-8 encoding."""
        engine = SubtitleEngine()
        subtitles = engine.extract_subtitles_from_timeline(mock_timeline)

        srt_file = tmp_path / "lesson.srt"
        vtt_file = tmp_path / "lesson.vtt"

        engine.export_srt_file(subtitles, srt_file)
        engine.export_vtt_file(subtitles, vtt_file)

        assert srt_file.exists()
        assert vtt_file.exists()
        assert "Chào bạn" in srt_file.read_text(encoding="utf-8")
        assert "WEBVTT" in vtt_file.read_text(encoding="utf-8")

    def test_integration_with_pacing_builder(self, tmp_path):
        """End-to-end integration test with PacingBuilder and SubtitleEngine."""
        # Create 2 sample audio files
        audio_vi = Sine(440).to_audio_segment(duration=1000)
        audio_en = Sine(880).to_audio_segment(duration=1500)

        path_vi = tmp_path / "vi_clip.wav"
        path_en = tmp_path / "en_clip.wav"
        audio_vi.export(str(path_vi), format="wav")
        audio_en.export(str(path_en), format="wav")

        clips = [
            AudioClipItem(
                id="clip-vi-01",
                lang="vi",
                text="Tôi yêu ngôn ngữ.",
                audio_path=str(path_vi),
                order=1,
            ),
            AudioClipItem(
                id="clip-en-01",
                lang="en",
                text="I love languages.",
                audio_path=str(path_en),
                order=2,
            ),
        ]

        pacing_result = PacingBuilder().build_pacing(
            clips=clips,
            pacing_config=PacingParams(silence_after_vi_sec=1.0, silence_after_target_sec=2.0, insert_cue_sound=False),
        )

        subtitles = subtitle_engine.extract_subtitles_from_timeline(pacing_result.timeline)
        assert len(subtitles) == 2
        assert subtitles[0].text == "Tôi yêu ngôn ngữ."
        assert subtitles[1].text == "I love languages."
        # Spoken timestamps should match accurately
        assert subtitles[0].start_ms == 0
        assert subtitles[0].end_ms == 1000
        assert subtitles[1].start_ms == 2000  # 1000ms speech + 1000ms silence
        assert subtitles[1].end_ms == 3500    # 2000ms + 1500ms speech
