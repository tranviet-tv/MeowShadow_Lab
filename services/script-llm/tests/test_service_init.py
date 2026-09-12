"""Unit tests for SP06-01: Framework initialization, config, and Pydantic schemas."""

import uuid
import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.config import settings
from src.schemas.chunk import ScriptChunk, ChunkPair
from src.schemas.parse import ParseRequest, ParseResponse
from src.schemas.translate import TranslateRequest, TranslateResponse
from src.schemas.script_response import (
    AutoChunkTranslateRequest,
    AutoChunkTranslateResponse,
)
from src.schemas.metrics import ChunkMetric, EstimateRequest, EstimateResponse

client = TestClient(app)


def test_settings_initialization():
    """Verify default configuration settings for script-llm service."""
    assert settings.app_name == "msl-script-llm"
    assert settings.port == 8001
    assert settings.llm_model == "qwen3:8b"
    assert "11434" in settings.ollama_host
    assert settings.default_wpm_vi == 150
    assert settings.default_wpm_en == 140
    assert settings.default_cpm_ja == 320


def test_root_endpoints():
    """Verify top-level identification and health endpoints."""
    res_root = client.get("/")
    assert res_root.status_code == 200
    data_root = res_root.json()
    assert data_root["service"] == "msl-script-llm"
    assert data_root["status"] == "running"
    assert data_root["model"] == "qwen3:8b"

    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"


def test_api_v1_health_endpoint():
    """Verify /api/v1/health endpoint response structure."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "msl-script-llm"
    assert "ollama_reachable" in data
    assert "available_models" in data


def test_script_chunk_and_pair_schema():
    """Verify ScriptChunk and ChunkPair schema validation."""
    chunk_vi = ScriptChunk(
        id=str(uuid.uuid4()),
        order=0,
        lang="vi",
        text="Xin chào các bạn.",
    )
    chunk_en = ScriptChunk(
        id=str(uuid.uuid4()),
        order=1,
        lang="en",
        text="Hello everyone.",
    )
    pair = ChunkPair(
        order=0,
        target_lang="en",
        vi_chunk=chunk_vi,
        target_chunk=chunk_en,
    )
    assert pair.vi_chunk.lang == "vi"
    assert pair.target_chunk.lang == "en"

    # Verify invalid language raises error
    with pytest.raises(Exception):
        ScriptChunk(id="1", order=0, lang="fr", text="Bonjour")


def test_parse_schemas():
    """Verify ParseRequest and ParseResponse schemas."""
    req = ParseRequest(raw_text="[VI] Xin chào [EN] Hello", target_lang="en")
    assert req.target_lang == "en"

    resp = ParseResponse(
        total_chunks=2,
        total_pairs=1,
        chunks=[],
        pairs=[],
        raw_char_count=23,
    )
    assert resp.success is True
    assert resp.total_chunks == 2


def test_translate_schemas():
    """Verify TranslateRequest and TranslateResponse schemas."""
    req = TranslateRequest(text="Kiên trì là chìa khóa", source_lang="vi", target_lang="en")
    assert req.source_lang == "vi"
    assert req.target_lang == "en"

    resp = TranslateResponse(
        source_text="Kiên trì là chìa khóa",
        translated_text="Persistence is key",
        source_lang="vi",
        target_lang="en",
        model="qwen3:8b",
    )
    assert resp.model == "qwen3:8b"


def test_auto_chunk_and_metrics_schemas():
    """Verify AutoChunk and Metrics estimation schemas."""
    chunk_metric = ChunkMetric(
        chunk_id="chunk-1",
        order=0,
        lang="vi",
        words_or_chars=10,
        speech_duration_sec=4.0,
        silence_duration_sec=1.5,
        total_duration_sec=5.5,
    )
    estimate_resp = EstimateResponse(
        total_words=10,
        speech_duration_sec=4.0,
        silence_duration_sec=1.5,
        total_estimated_duration_sec=5.5,
        chunks_metrics=[chunk_metric],
    )
    assert estimate_resp.total_words == 10
    assert len(estimate_resp.chunks_metrics) == 1
