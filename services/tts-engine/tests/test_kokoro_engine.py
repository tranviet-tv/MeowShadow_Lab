"""Unit and integration tests for SP12-04: Local AI TTS Engine (Kokoro-82M)."""

import os
from pathlib import Path
import tempfile
import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.schemas.tts import TTSChunkRequest, SynthesizePreviewRequest, BatchTTSRequest
from src.services.kokoro_engine import KokoroEngine, export_kokoro_engine as kokoro_engine
from src.schemas.voice import get_all_voices, find_voice_by_id

client = TestClient(app)


def test_kokoro_engine_metadata():
    """Verify engine name and voice catalog integration."""
    assert kokoro_engine.engine_name == "kokoro"
    voices = kokoro_engine.list_supported_voices()
    assert len(voices) >= 6

    # Verify English and Japanese voice entries
    en_voices = [v for v in voices if v.language == "en"]
    ja_voices = [v for v in voices if v.language == "ja"]
    assert len(en_voices) >= 4
    assert len(ja_voices) >= 2

    # Check specific voice attributes
    bella = find_voice_by_id("kokoro-en-female-bella")
    assert bella is not None
    assert bella.gender == "Female"
    assert bella.engine == "kokoro"

    sakura = find_voice_by_id("kokoro-ja-female-sakura")
    assert sakura is not None
    assert sakura.language == "ja"


@pytest.mark.asyncio
async def test_kokoro_synthesize_to_bytes():
    """Verify offline raw audio waveform generation."""
    audio_bytes = await kokoro_engine.synthesize_to_bytes(
        text="Welcome to local AI speech synthesis with Kokoro.",
        voice_id="kokoro-en-female-bella",
        rate="+0%",
    )
    assert len(audio_bytes) > 1000
    # Verify standard WAV header RIFF
    assert audio_bytes[:4] == b"RIFF"
    assert audio_bytes[8:12] == b"WAVE"


@pytest.mark.asyncio
async def test_kokoro_synthesize_to_file():
    """Verify saving to output file and duration computation."""
    with tempfile.TemporaryDirectory() as tmpdir:
        out_path = Path(tmpdir) / "test_kokoro.wav"
        saved_path, duration = await kokoro_engine.synthesize_to_file(
            text="Testing file export duration.",
            voice_id="kokoro-en-male-adam",
            output_path=out_path,
        )
        assert saved_path.exists()
        assert saved_path.stat().st_size > 0
        assert duration > 0.5


@pytest.mark.asyncio
async def test_kokoro_batch_synthesis():
    """Verify concurrent batch dialogue synthesis."""
    with tempfile.TemporaryDirectory() as tmpdir:
        chunks = [
            TTSChunkRequest(
                id="chunk_1",
                order=1,
                text="First offline sentence.",
                voice_id="kokoro-en-female-bella",
            ),
            TTSChunkRequest(
                id="chunk_2",
                order=2,
                text="Second offline sentence with Japanese context.",
                voice_id="kokoro-ja-female-sakura",
            ),
        ]

        response = await kokoro_engine.synthesize_batch(
            chunks=chunks,
            output_dir=tmpdir,
            concurrency=2,
        )

        assert response.success is True
        assert response.total_chunks == 2
        assert response.successful_chunks == 2
        assert response.total_duration_sec > 1.0
        assert len(response.clips) == 2
        assert response.clips[0].file_path != ""


def test_api_endpoint_synthesize_preview_kokoro():
    """Verify HTTP API endpoint routes to Kokoro engine."""
    payload = {
        "text": "Testing API preview with Kokoro engine.",
        "voice_id": "kokoro-en-female-bella",
        "engine": "kokoro",
    }
    response = client.post("/api/v1/synthesize", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert len(response.content) > 1000
    assert response.content[:4] == b"RIFF"


def test_api_endpoint_synthesize_batch_kokoro():
    """Verify batch synthesis HTTP API endpoint with Kokoro engine."""
    payload = {
        "lesson_id": "test_kokoro_lesson",
        "engine": "kokoro",
        "chunks": [
            {
                "id": "c1",
                "order": 1,
                "text": "Hello world from Kokoro offline.",
                "voice_id": "kokoro-en-female-bella",
            },
            {
                "id": "c2",
                "order": 2,
                "text": "Practicing English shadowing daily.",
                "voice_id": "kokoro-en-male-adam",
            },
        ],
    }
    response = client.post("/api/v1/synthesize/batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["successful_chunks"] == 2
    assert data["total_duration_sec"] > 0
    assert len(data["clips"]) == 2
