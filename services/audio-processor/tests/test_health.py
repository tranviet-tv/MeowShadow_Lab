"""Unit tests for FastAPI endpoints and schema validation."""

from fastapi.testclient import TestClient
from src.main import app
from src.schemas import PacingParams, AudioClipItem, ProcessRequest, MasteringResult


def test_root_endpoint():
    """Verify root status endpoint."""
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "msl-audio-processor"
        assert data["status"] == "running"


def test_health_endpoint():
    """Verify health endpoint response structure."""
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "msl-audio-processor"
        assert "storage_writable" in data


def test_schema_serialization():
    """Verify Pydantic schemas instantiation and defaults."""
    pacing = PacingParams()
    assert pacing.silence_after_vi_sec == 1.5
    assert pacing.silence_after_target_sec == 3.5
    assert pacing.silence_between_sentences_sec == 0.5
    assert pacing.insert_cue_sound is True

    clip = AudioClipItem(
        id="chunk-1",
        order=0,
        lang="vi",
        text="Xin chao cac ban",
        audio_path="storage/temp/clip_1.wav",
        duration_ms=1200,
    )
    assert clip.id == "chunk-1"
    assert clip.lang == "vi"

    request = ProcessRequest(
        clips=[clip],
        pacing_config=pacing,
    )
    assert len(request.clips) == 1
    assert request.pacing_config.silence_after_vi_sec == 1.5
