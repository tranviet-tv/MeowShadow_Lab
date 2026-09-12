"""Unit tests for CueSoundService and transition chime generation."""

import pytest
from pydub import AudioSegment
from src.services.cue_sound import CueSoundService


class TestCueSoundService:
    """Test suite for cue sound retrieval, synthesis, and caching."""

    @pytest.fixture
    def cue_service(self) -> CueSoundService:
        """Provide a fresh CueSoundService instance."""
        service = CueSoundService()
        service.clear_cache()
        return service

    def test_synthesize_chime_properties(self, cue_service: CueSoundService):
        """Verify synthesized chime audio characteristics."""
        chime = cue_service.synthesize_chime(duration_ms=400, sample_rate=44100, channels=2)

        assert len(chime) == 400
        assert chime.frame_rate == 44100
        assert chime.channels == 2
        assert chime.sample_width == 2

        # Audible signal presence check
        assert chime.rms > 0
        assert chime.max > 0

    def test_get_cue_sound_caching(self, cue_service: CueSoundService):
        """Verify that repeated calls return cached instances."""
        sound1 = cue_service.get_cue_sound("chime")
        sound2 = cue_service.get_cue_sound("chime")

        assert sound1 is sound2

    def test_custom_duration_and_sample_rate(self, cue_service: CueSoundService):
        """Verify custom synthesis parameters."""
        custom_chime = cue_service.synthesize_chime(
            duration_ms=250,
            sample_rate=22050,
            channels=1,
        )

        assert len(custom_chime) == 250
        assert custom_chime.frame_rate == 22050
        assert custom_chime.channels == 1
