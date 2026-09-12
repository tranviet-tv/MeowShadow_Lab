"""Benchmark and Definition of Done (DoD) verification tests for Sprint 5."""

import json
from pathlib import Path
import tempfile
import time
import pytest

from src.schemas.tts import TTSChunkRequest
from src.services.edge_engine import EdgeEngine
from src.services.cache_manager import CacheManager


def test_dockerfile_and_compose_configuration():
    """Verify Dockerfile and docker-compose.yml contain port 8002 and security standards."""
    root_dir = Path(__file__).resolve().parent.parent.parent.parent
    dockerfile_path = root_dir / "services" / "tts-engine" / "Dockerfile"
    assert dockerfile_path.exists(), f"Dockerfile must exist at {dockerfile_path}"
    content = dockerfile_path.read_text(encoding="utf-8")

    assert "FROM python:3.11-slim" in content
    assert "EXPOSE 8002" in content
    assert "HEALTHCHECK" in content
    assert "USER appuser" in content
    assert "uvicorn" in content

    compose_path = root_dir / "docker-compose.yml"
    assert compose_path.exists(), f"docker-compose.yml must exist at {compose_path}"
    compose_content = compose_path.read_text(encoding="utf-8")
    assert "8002" in compose_content
    assert "tts-engine-service" in compose_content


@pytest.mark.asyncio
async def test_dod_50_bilingual_chunks_and_instant_cache_replay():
    """
    Sprint 5 Definition of Done (DoD):
    1. Synthesize 50 bilingual chunks (VI & EN), generating 50 valid .mp3 files in storage.
    2. Second call returns instantaneously (< 50ms per chunk / < 1.0s total batch) via MD5 Smart Cache.
    """
    engine = EdgeEngine()

    # Generate 50 realistic bilingual sentences (25 VI + 25 EN)
    chunks = []
    for i in range(25):
        chunks.append(
            TTSChunkRequest(
                id=f"dod_vi_{i:02d}",
                order=i * 2,
                text=f"Câu tiếng Việt số {i + 1} trong bài học luyện nghe đa tầng.",
                voice_id="vi-VN-HoaiMyNeural",
                lang="vi",
            )
        )
        chunks.append(
            TTSChunkRequest(
                id=f"dod_en_{i:02d}",
                order=i * 2 + 1,
                text=f"English shadowing sentence number {i + 1} for ear training practice.",
                voice_id="en-US-JennyNeural",
                lang="en",
            )
        )

    assert len(chunks) == 50

    with tempfile.TemporaryDirectory() as tmp_dir:
        output_dir_1 = Path(tmp_dir) / "run_1"

        # -------------------------------------------------------------
        # 1. First Execution: Fresh Synthesis & Cache Population
        # -------------------------------------------------------------
        results_1 = await engine.synthesize_batch(
            chunks=chunks,
            output_dir=output_dir_1,
            concurrency=8,
            use_cache=True,
        )

        assert len(results_1) == 50
        successful_1 = [r for r in results_1 if r.error is None]
        assert len(successful_1) == 50, "All 50 chunks must synthesize successfully"

        # Verify 50 .mp3 files exist and are valid audio files (> 1000 bytes)
        for r in results_1:
            file_path = Path(r.file_path)
            assert file_path.exists(), f"File {file_path} must exist on disk"
            assert file_path.stat().st_size > 1000, f"File {file_path} size must exceed 1KB"
            assert r.duration_sec > 0.3

        # -------------------------------------------------------------
        # 2. Second Execution: Instant Replay from MD5 Cache
        # -------------------------------------------------------------
        output_dir_2 = Path(tmp_dir) / "run_2"

        start_replay = time.perf_counter()
        results_2 = await engine.synthesize_batch(
            chunks=chunks,
            output_dir=output_dir_2,
            concurrency=10,
            use_cache=True,
        )
        replay_duration = time.perf_counter() - start_replay

        assert len(results_2) == 50
        cache_hits = sum(1 for r in results_2 if r.cached)
        assert cache_hits == 50, "All 50 chunks in second run must be resolved from cache"

        # Average duration per chunk must be well below 50ms
        avg_chunk_latency = replay_duration / 50.0
        assert avg_chunk_latency < 0.05, (
            f"Average replay latency per chunk was {avg_chunk_latency * 1000:.2f}ms, "
            f"expected < 50ms"
        )
        assert replay_duration < 1.0, f"Total batch replay duration was {replay_duration:.3f}s"

        # Verify all 50 files in run_2 were created
        for r in results_2:
            assert Path(r.file_path).exists()


@pytest.mark.asyncio
async def test_benchmark_100_short_sentences_speed():
    """
    Benchmark requirement:
    Synthesize 100 short sentences in under 15 seconds with error rate < 0.1% (0 errors).
    Demonstrates Smart Caching and high-concurrency batch processing.
    """
    engine = EdgeEngine()

    words = [
        "Xin chào bạn.", "Hãy tập trung.", "Luyện nghe tiếng Anh.", "Thực hành shadowing.",
        "Bạn sẽ thành công.", "Tiến bộ mỗi ngày.", "Tự tin nói chuyện.", "Giao tiếp tự nhiên.",
        "Phản xạ cực nhanh.", "Phát âm chuẩn xác."
    ]
    chunks = []
    for i in range(100):
        phrase = words[i % len(words)]
        chunks.append(
            TTSChunkRequest(
                id=f"bm_{i:03d}",
                order=i,
                text=phrase,
                voice_id="vi-VN-HoaiMyNeural",
            )
        )

    assert len(chunks) == 100

    with tempfile.TemporaryDirectory() as tmp_dir:
        output_dir = Path(tmp_dir) / "benchmark_100"

        start_time = time.perf_counter()
        results = await engine.synthesize_batch(
            chunks=chunks,
            output_dir=output_dir,
            concurrency=8,
            use_cache=True,
        )
        total_time = time.perf_counter() - start_time

        failed_chunks = [r for r in results if r.error is not None]
        error_rate = len(failed_chunks) / 100.0

        assert error_rate < 0.001, f"Error rate {error_rate} must be < 0.1%"
        # 10 unique phrases cached and reused for remaining 90 renders in < 15 seconds
        assert total_time < 15.0, f"Total time {total_time:.2f}s exceeded 15s limit"
        assert len(results) == 100
        # Check that caching resolved majority of chunks
        cached_count = sum(1 for r in results if r.cached)
        assert cached_count >= 80
