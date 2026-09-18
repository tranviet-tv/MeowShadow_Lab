"""Unit tests for SP05-01: Framework initialization, config, schemas, and voice catalog."""

from fastapi.testclient import TestClient
from src.main import app
from src.config import settings
from src.schemas.voice import (
    STANDARD_VOICE_CATALOG,
    get_all_voices,
    find_voice_by_id,
)
from src.schemas.tts import TTSChunkRequest, BatchTTSRequest

client = TestClient(app)


def test_settings_initialization():
    """Verify default configuration settings."""
    assert settings.app_name == "msl-tts-engine"
    assert settings.port == 8002
    assert settings.default_engine == "edge-tts"
    assert settings.concurrency_limit == 3

    # Check path resolvers
    storage_path = settings.get_storage_path()
    assert storage_path.exists()
    cache_path = settings.get_cache_dir()
    assert cache_path.exists()
    audio_path = settings.get_audio_dir()
    assert audio_path.exists()


def test_voice_catalog_presets():
    """Verify standard voice catalog contains required multilingual voices."""
    voice_ids = [v.voice_id for v in STANDARD_VOICE_CATALOG]

    # Required VI voices
    assert "vi-VN-HoaiMyNeural" in voice_ids
    assert "vi-VN-NamMinhNeural" in voice_ids

    # Required EN voices
    assert "en-US-JennyNeural" in voice_ids
    assert "en-US-GuyNeural" in voice_ids

    # Required JA voices
    assert "ja-JP-NanamiNeural" in voice_ids
    assert "ja-JP-KeitaNeural" in voice_ids


def test_voice_filtering():
    """Test filtering voices by language and gender."""
    vi_voices = get_all_voices(language="vi")
    assert len(vi_voices) == 2
    assert all(v.language == "vi" for v in vi_voices)

    female_voices = get_all_voices(gender="Female")
    assert len(female_voices) >= 3
    assert all(v.gender == "Female" for v in female_voices)

    found = find_voice_by_id("vi-VN-HoaiMyNeural")
    assert found is not None
    assert found.name == "Hoài My"
    assert found.is_default is True

    not_found = find_voice_by_id("non-existent-voice")
    assert not_found is None


def test_schemas_validation():
    """Test Pydantic model validation for TTS requests."""
    chunk = TTSChunkRequest(
        id="chunk-1",
        order=0,
        text="Xin chào MeowShadow",
        voice_id="vi-VN-HoaiMyNeural",
    )
    assert chunk.text == "Xin chào MeowShadow"
    assert chunk.rate == "+0%"

    batch = BatchTTSRequest(
        lesson_id="lesson-101",
        chunks=[chunk],
    )
    assert batch.lesson_id == "lesson-101"
    assert len(batch.chunks) == 1


def test_root_endpoint():
    """Test root and top-level health endpoints."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "msl-tts-engine"
    assert data["status"] == "running"

    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["status"] == "healthy"


def test_api_v1_health_endpoint():
    """Test /api/v1/health status and storage inspection."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "msl-tts-engine"
    assert data["storage"]["root_ok"] is True
    assert data["storage"]["cache_ok"] is True


def test_api_v1_voices_endpoint():
    """Test /api/v1/voices endpoint with query parameters."""
    response = client.get("/api/v1/voices")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total"] >= 6

    # Test filtering by language
    vi_resp = client.get("/api/v1/voices?language=vi")
    assert vi_resp.status_code == 200
    vi_data = vi_resp.json()
    assert vi_data["total"] == 2
    assert all(v["language"] == "vi" for v in vi_data["voices"])
