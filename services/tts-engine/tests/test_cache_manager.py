"""Unit and performance tests for SP05-03: MD5 Smart Caching Engine."""

import time
from pathlib import Path
import tempfile
import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.services.cache_manager import CacheManager, cache_manager
from src.services.edge_engine import EdgeEngine
from src.schemas.tts import TTSChunkRequest

client = TestClient(app)


def test_compute_hash_deterministic():
    """Verify MD5 hash key generation is deterministic and cleans whitespace."""
    hash1 = CacheManager.compute_hash(
        text="Xin chào MeowShadow",
        voice_id="vi-VN-HoaiMyNeural",
        rate="+0%",
        pitch="+0Hz",
    )
    # Different spacing and rate representation
    hash2 = CacheManager.compute_hash(
        text="   Xin   chào    MeowShadow  ",
        voice_id="vi-VN-HoaiMyNeural",
        rate="+0%",
        pitch="+0Hz",
    )
    assert hash1 == hash2
    assert len(hash1) == 32

    # Different text must yield different hash
    hash3 = CacheManager.compute_hash(
        text="Tạm biệt MeowShadow",
        voice_id="vi-VN-HoaiMyNeural",
        rate="+0%",
        pitch="+0Hz",
    )
    assert hash1 != hash3

    # Different rate must yield different hash
    hash4 = CacheManager.compute_hash(
        text="Xin chào MeowShadow",
        voice_id="vi-VN-HoaiMyNeural",
        rate="+15%",
        pitch="+0Hz",
    )
    assert hash1 != hash4


def test_cache_storage_and_atomic_save():
    """Verify cache saving, existence check, and atomic write."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        cm = CacheManager(cache_dir=Path(tmp_dir))
        key = "test_md5_key_12345"

        assert cm.is_cached(key) is False
        assert cm.get_cached_bytes(key) is None

        dummy_audio = b"\xff\xfb\x90\x64" + b"\x00" * 500
        saved_path = cm.save_to_cache(key, dummy_audio)

        assert saved_path.exists()
        assert cm.is_cached(key) is True
        retrieved = cm.get_cached_bytes(key)
        assert retrieved == dummy_audio
        assert cm.hits == 1
        assert cm.misses == 1


def test_copy_to_destination():
    """Verify copying cached audio directly to output destination."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        cm = CacheManager(cache_dir=tmp_path / "cache")
        key = "sample_cache_key_999"

        dummy_audio = b"\xff\xfb\x90\x64" + b"\x00" * 6000
        cm.save_to_cache(key, dummy_audio)

        dest_file = tmp_path / "output" / "clip_01.mp3"
        success, duration = cm.copy_to_destination(key, dest_file)

        assert success is True
        assert dest_file.exists()
        assert dest_file.stat().st_size == len(dummy_audio)
        assert duration > 0.0


@pytest.mark.asyncio
async def test_cache_speedup_100x():
    """
    Verify caching eliminates network calls and delivers instant retrieval (<50ms).
    Demonstrates 10x-100x performance acceleration on repeated calls.
    """
    engine = EdgeEngine()
    text = "Thử nghiệm tốc độ truy xuất siêu nhanh với MD5 Smart Caching."
    voice = "vi-VN-HoaiMyNeural"

    # 1. First call (Cache Miss -> Network TTS)
    start_miss = time.perf_counter()
    bytes_1 = await engine.synthesize_to_bytes(text=text, voice_id=voice, use_cache=True)
    duration_miss = time.perf_counter() - start_miss

    assert len(bytes_1) > 2000

    # 2. Second call (Cache Hit -> Local Memory/Disk)
    start_hit = time.perf_counter()
    bytes_2 = await engine.synthesize_to_bytes(text=text, voice_id=voice, use_cache=True)
    duration_hit = time.perf_counter() - start_hit

    assert bytes_1 == bytes_2
    # Cache hit must be under 50ms (0.05s)
    assert duration_hit < 0.05, f"Cache hit was {duration_hit:.4f}s, expected < 0.05s"
    # Speedup ratio
    speedup = duration_miss / max(duration_hit, 0.0001)
    assert speedup > 10.0, f"Expected speedup > 10x, got {speedup:.1f}x"


@pytest.mark.asyncio
async def test_batch_synthesis_with_cache_hits():
    """Verify batch synthesis detects cached chunks and sets cached=True."""
    engine = EdgeEngine()
    text_common = "Câu lặp lại nhiều lần."
    voice = "vi-VN-HoaiMyNeural"

    with tempfile.TemporaryDirectory() as tmp_dir:
        output_dir = Path(tmp_dir) / "test_batch"

        chunks = [
            TTSChunkRequest(id="c1", order=0, text=text_common, voice_id=voice),
            TTSChunkRequest(id="c2", order=1, text=text_common, voice_id=voice),
        ]

        results = await engine.synthesize_batch(
            chunks=chunks,
            output_dir=output_dir,
            concurrency=2,
            use_cache=True,
        )

        assert len(results) == 2
        # At least the second chunk should be a cache hit
        cached_count = sum(1 for r in results if r.cached)
        assert cached_count >= 1


def test_cache_api_endpoints():
    """Test /api/v1/cache/stats and /api/v1/cache/clear HTTP endpoints."""
    resp = client.get("/api/v1/cache/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "hits" in data["data"]
    assert "total_cached_files" in data["data"]

    # Test clear
    del_resp = client.delete("/api/v1/cache/clear")
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True
