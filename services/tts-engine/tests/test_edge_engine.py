"""Unit and integration tests for SP05-02: Async Edge-TTS engine and endpoints."""

import os
from pathlib import Path
import tempfile
import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.schemas.tts import TTSChunkRequest, SynthesizePreviewRequest, BatchTTSRequest
from src.services.edge_engine import (
    EdgeEngine,
    format_rate,
    format_pitch,
    format_volume,
    estimate_mp3_duration,
)

client = TestClient(app)


def test_format_parameters():
    """Verify rate, pitch, and volume string normalization."""
    # Rate formatting
    assert format_rate("+10%") == "+10%"
    assert format_rate("-15%") == "-15%"
    assert format_rate(1.2) == "+20%"
    assert format_rate(0.8) == "-20%"
    assert format_rate(1.0) == "+0%"
    assert format_rate(None) == "+0%"

    # Pitch formatting
    assert format_pitch("+5Hz") == "+5Hz"
    assert format_pitch("-10Hz") == "-10Hz"
    assert format_pitch(5) == "+5Hz"
    assert format_pitch(-5) == "-5Hz"
    assert format_pitch(None) == "+0Hz"

    # Volume formatting
    assert format_volume("+10%") == "+10%"
    assert format_volume(-10) == "-10%"
    assert format_volume(None) == "+0%"


def test_mp3_duration_estimation():
    """Verify duration estimation handles empty and mock frame streams."""
    assert estimate_mp3_duration(b"") == 0.0
    # 12,000 bytes at ~6,000 bytes/sec should estimate ~2 seconds
    dummy_audio = b"\x00" * 12000
    est = estimate_mp3_duration(dummy_audio)
    assert 1.5 <= est <= 2.5


@pytest.mark.asyncio
async def test_single_synthesis_multilingual():
    """Verify live synthesis for Vietnamese, English, and Japanese sentences."""
    engine = EdgeEngine()

    # 1. Vietnamese test
    vi_bytes = await engine.synthesize_to_bytes(
        text="Xin chào MeowShadow Lab",
        voice_id="vi-VN-HoaiMyNeural",
        rate="+0%",
        pitch="+0Hz",
    )
    assert len(vi_bytes) > 2000
    assert vi_bytes[:3] == b"ID3" or vi_bytes[:2] == b"\xff\xfb" or vi_bytes[:2] == b"\xff\xf3"

    # 2. English test
    en_bytes = await engine.synthesize_to_bytes(
        text="Welcome to Shadowing English practice.",
        voice_id="en-US-JennyNeural",
        rate="+10%",
    )
    assert len(en_bytes) > 2000

    # 3. Japanese test
    ja_bytes = await engine.synthesize_to_bytes(
        text="こんにちは、日本語の練習をしましょう。",
        voice_id="ja-JP-NanamiNeural",
    )
    assert len(ja_bytes) > 2000


@pytest.mark.asyncio
async def test_synthesize_to_file():
    """Verify saving synthesis output directly to disk with duration."""
    engine = EdgeEngine()
    with tempfile.TemporaryDirectory() as tmp_dir:
        dest_file = Path(tmp_dir) / "output.mp3"
        saved_path, duration = await engine.synthesize_to_file(
            text="Testing audio output to file.",
            voice_id="en-US-JennyNeural",
            output_path=dest_file,
        )
        assert saved_path.exists()
        assert saved_path.stat().st_size > 2000
        assert duration > 0.5


@pytest.mark.asyncio
async def test_batch_synthesis_concurrency():
    """Verify parallel batch synthesis bounded by concurrency limiter."""
    engine = EdgeEngine()
    chunks = [
        TTSChunkRequest(
            id="c1",
            order=0,
            text="Câu đầu tiên bằng tiếng Việt.",
            voice_id="vi-VN-HoaiMyNeural",
        ),
        TTSChunkRequest(
            id="c2",
            order=1,
            text="First sentence in English.",
            voice_id="en-US-JennyNeural",
        ),
        TTSChunkRequest(
            id="c3",
            order=2,
            text="Câu thứ hai bằng tiếng Việt.",
            voice_id="vi-VN-NamMinhNeural",
        ),
    ]

    with tempfile.TemporaryDirectory() as tmp_dir:
        output_dir = Path(tmp_dir) / "lesson_test"
        results = await engine.synthesize_batch(
            chunks=chunks,
            output_dir=output_dir,
            concurrency=3,
        )

        assert len(results) == 3
        # Check order preserved
        assert results[0].order == 0
        assert results[1].order == 1
        assert results[2].order == 2

        for r in results:
            assert r.error is None
            assert Path(r.file_path).exists()
            assert r.duration_sec > 0.3


def test_preview_endpoint_http():
    """Test POST /api/v1/synthesize HTTP audio streaming."""
    payload = {
        "text": "Hello world from FastAPI preview.",
        "voice_id": "en-US-JennyNeural",
        "rate": "+0%",
        "pitch": "+0Hz",
    }
    response = client.post("/api/v1/synthesize", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert len(response.content) > 2000


def test_batch_endpoint_http():
    """Test POST /api/v1/synthesize/batch HTTP endpoint."""
    payload = {
        "lesson_id": "test-lesson-42",
        "chunks": [
            {
                "id": "c1",
                "order": 0,
                "text": "Chào mừng bạn đến với MeowShadow.",
                "voice_id": "vi-VN-HoaiMyNeural",
            },
            {
                "id": "c2",
                "order": 1,
                "text": "Welcome to our platform.",
                "voice_id": "en-US-JennyNeural",
            },
        ],
        "concurrency": 2,
    }
    response = client.post("/api/v1/synthesize/batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_chunks"] == 2
    assert data["successful_chunks"] == 2
    assert len(data["clips"]) == 2
    assert data["total_duration_sec"] > 0
