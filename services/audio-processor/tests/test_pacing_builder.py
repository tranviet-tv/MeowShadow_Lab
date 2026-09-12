"""Unit tests for PacingBuilder audio assembly and timeline generation."""

import tempfile
from pathlib import Path
import pytest
from pydub import AudioSegment
from pydub.generators import Sine

from src.schemas.pacing_params import PacingParams
from src.schemas.process_request import AudioClipItem
from src.services.pacing_builder import (
    PacingBuilder,
    SegmentType,
    pacing_builder,
)


def create_tone(duration_ms: int, freq: int = 440) -> AudioSegment:
    """Helper to generate in-memory synthetic audio tone."""
    return Sine(freq).to_audio_segment(duration=duration_ms).set_channels(2).set_frame_rate(44100)


class TestPacingBuilder:
    """Test suite for pacing builder algorithm and timeline synchronicity."""

    @pytest.fixture
    def builder(self) -> PacingBuilder:
        """Provide global pacing builder instance."""
        return pacing_builder

    def test_single_pair_without_chime(self, builder: PacingBuilder):
        """Verify timeline and audio duration for single pair without cue sound."""
        vi_audio = create_tone(1000, 400)
        target_audio = create_tone(2000, 600)

        config = PacingParams(
            silence_after_vi_sec=1.5,
            silence_after_target_sec=3.5,
            silence_between_sentences_sec=0.5,
            insert_cue_sound=False,
        )

        res = builder.build_pacing_from_segments(
            pairs=[(vi_audio, target_audio)],
            pacing_config=config,
            metadata=[({"id": "c1", "text": "Xin chao"}, {"id": "c2", "text": "Hello"})],
        )

        # Expected: 1000 (VI) + 1500 (VI silence) + 2000 (Target) + 3500 (Target silence) = 8000ms
        expected_duration = 1000 + 1500 + 2000 + 3500
        assert res.total_duration_ms == expected_duration
        assert len(res.combined_audio) == expected_duration
        assert res.pairs_count == 1
        assert res.chunks_count == 2

        # Verify timeline structure
        tl = res.timeline
        assert len(tl) == 4
        assert tl[0].segment_type == SegmentType.SOURCE_SENTENCE
        assert (tl[0].start_ms, tl[0].end_ms) == (0, 1000)
        assert tl[0].text == "Xin chao"

        assert tl[1].segment_type == SegmentType.VI_SILENCE
        assert (tl[1].start_ms, tl[1].end_ms) == (1000, 2500)

        assert tl[2].segment_type == SegmentType.TARGET_SENTENCE
        assert (tl[2].start_ms, tl[2].end_ms) == (2500, 4500)
        assert tl[2].text == "Hello"

        assert tl[3].segment_type == SegmentType.TARGET_SILENCE
        assert (tl[3].start_ms, tl[3].end_ms) == (4500, 8000)

    def test_single_pair_with_chime(self, builder: PacingBuilder):
        """Verify chime insertion in sequence: VI -> Silence -> Chime -> Target -> Silence."""
        vi_audio = create_tone(1000)
        target_audio = create_tone(2000)

        config = PacingParams(
            silence_after_vi_sec=1.5,
            silence_after_target_sec=3.5,
            insert_cue_sound=True,
            cue_sound_type="chime",
        )

        res = builder.build_pacing_from_segments(
            pairs=[(vi_audio, target_audio)],
            pacing_config=config,
        )

        # Chime is 400ms
        chime_dur = 400
        expected_duration = 1000 + 1500 + chime_dur + 2000 + 3500
        assert res.total_duration_ms == expected_duration
        assert len(res.combined_audio) == expected_duration

        tl = res.timeline
        assert len(tl) == 5
        assert tl[1].segment_type == SegmentType.VI_SILENCE
        assert tl[2].segment_type == SegmentType.CUE_CHIME
        assert tl[2].duration_ms == chime_dur
        assert tl[3].segment_type == SegmentType.TARGET_SENTENCE

        # Ensure timeline continuous ordering
        for i in range(len(tl) - 1):
            assert tl[i].end_ms == tl[i + 1].start_ms

    def test_multiple_pairs_with_inter_chunk_pause(self, builder: PacingBuilder):
        """Verify multi-pair assembly with inter-chunk pauses."""
        pair1 = (create_tone(1000), create_tone(1500))
        pair2 = (create_tone(1200), create_tone(1800))

        config = PacingParams(
            silence_after_vi_sec=1.5,
            silence_after_target_sec=3.5,
            silence_between_sentences_sec=0.5,
            insert_cue_sound=True,
        )

        res = builder.build_pacing_from_segments(
            pairs=[pair1, pair2],
            pacing_config=config,
        )

        chime = 400
        dur_pair1 = 1000 + 1500 + chime + 1500 + 3500  # 7900
        pause = 500  # between pair 1 and pair 2
        dur_pair2 = 1200 + 1500 + chime + 1800 + 3500  # 8400
        total_expected = dur_pair1 + pause + dur_pair2  # 16800

        assert res.total_duration_ms == total_expected
        assert res.pairs_count == 2
        assert res.chunks_count == 4

        # Verify pause segment exists between pair 1 and pair 2
        types = [s.segment_type for s in res.timeline]
        assert SegmentType.INTER_CHUNK_PAUSE in types

    def test_build_pacing_from_clip_files(self, builder: PacingBuilder, tmp_path: Path):
        """Verify end-to-end build_pacing loading audio from disk."""
        vi_path = tmp_path / "vi_clip.wav"
        en_path = tmp_path / "en_clip.wav"

        create_tone(800).export(str(vi_path), format="wav")
        create_tone(1200).export(str(en_path), format="wav")

        clips = [
            AudioClipItem(
                id="clip-vi-1",
                order=0,
                lang="vi",
                text="Tôi là lập trình viên",
                audio_path=str(vi_path),
            ),
            AudioClipItem(
                id="clip-en-1",
                order=1,
                lang="en",
                text="I am a software engineer",
                audio_path=str(en_path),
            ),
        ]

        config = PacingParams(
            silence_after_vi_sec=1.5,
            silence_after_target_sec=3.5,
            insert_cue_sound=False,
        )

        res = builder.build_pacing(clips=clips, pacing_config=config)

        expected = 800 + 1500 + 1200 + 3500
        assert res.total_duration_ms == expected
        assert res.pairs_count == 1
        assert res.timeline[0].chunk_id == "clip-vi-1"
        assert res.timeline[2].chunk_id == "clip-en-1"

    def test_empty_clips_raises_error(self, builder: PacingBuilder):
        """Verify ValueError when clips list is empty."""
        with pytest.raises(ValueError, match="No audio clips provided"):
            builder.build_pacing(clips=[])

    def test_missing_audio_file_raises_error(self, builder: PacingBuilder):
        """Verify FileNotFoundError when referenced audio clip file does not exist."""
        clips = [
            AudioClipItem(
                id="missing-clip",
                order=0,
                lang="vi",
                text="Not existing",
                audio_path="storage/non_existent_audio_file_12345.wav",
            )
        ]
        with pytest.raises(FileNotFoundError, match="not found"):
            builder.build_pacing(clips=clips)
