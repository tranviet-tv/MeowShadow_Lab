"""Unit and integration tests for SP06-03: Ollama Qwen 3 8B Prompt Engine & Pipeline."""

import json
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from src.main import app
from src.prompts.chunking import build_chunking_prompt, SYSTEM_CHUNKING_PROMPT
from src.prompts.translation import build_translation_prompt, SYSTEM_TRANSLATION_PROMPT
from src.services.ollama_client import OllamaClient
from src.services.llm_pipeline import LLMPipeline

client = TestClient(app)


def test_chunking_prompt_builder():
    """Verify prompt formatting for chunking tasks."""
    prompt = build_chunking_prompt("Đoạn văn mẫu tiếng Việt.", target_lang="en", sentences_per_chunk=3)
    assert "English" in prompt
    assert "Đoạn văn mẫu tiếng Việt." in prompt
    assert "3 sentences each" in prompt


def test_translation_prompt_builder():
    """Verify prompt formatting for translation tasks."""
    prompt = build_translation_prompt("Xin chào", source_lang="vi", target_lang="ja")
    assert "Vietnamese to Japanese" in prompt
    assert "Xin chào" in prompt


def test_ollama_json_extraction():
    """Verify extraction of JSON from raw model strings and markdown code blocks."""
    # Plain JSON
    plain_json = '{"chunks": [{"order": 0, "vi": "Chào", "target": "Hi"}]}'
    res1 = OllamaClient.extract_json(plain_json)
    assert "chunks" in res1
    assert len(res1["chunks"]) == 1

    # Markdown fenced JSON
    fenced_json = "```json\n" + plain_json + "\n```"
    res2 = OllamaClient.extract_json(fenced_json)
    assert "chunks" in res2

    # JSON with commentary around it
    chatty_json = "Here is your JSON output:\n" + plain_json + "\nHope this helps!"
    res3 = OllamaClient.extract_json(chatty_json)
    assert "chunks" in res3

    # Invalid JSON should raise ValueError
    with pytest.raises(ValueError):
        OllamaClient.extract_json("Not a json at all")


@pytest.mark.asyncio
async def test_llm_pipeline_mocked_success():
    """Verify LLMPipeline processing with mocked OllamaClient response."""
    mock_client = AsyncMock(spec=OllamaClient)
    mock_response = json.dumps({
        "chunks": [
            {
                "order": 0,
                "vi": "Hôm nay tôi bắt đầu học một ngôn ngữ mới. Điều này mang lại cho tôi niềm vui lớn.",
                "target": "Today I start learning a new language. This brings me tremendous joy.",
            }
        ]
    })
    mock_client.generate.return_value = mock_response
    mock_client.extract_json.side_effect = OllamaClient.extract_json

    pipeline = LLMPipeline(client=mock_client)
    res = await pipeline.auto_chunk_and_translate(
        raw_text="Hôm nay tôi bắt đầu học một ngôn ngữ mới. Điều này mang lại cho tôi niềm vui lớn.",
        target_lang="en",
    )

    assert res.success is True
    assert len(res.chunks) == 2
    assert res.chunks[0].lang == "vi"
    assert res.chunks[1].lang == "en"
    assert len(res.pairs) == 1
    assert res.word_count > 0
    assert "[VI]" in res.formatted_script
    assert "[EN]" in res.formatted_script


@pytest.mark.asyncio
async def test_llm_pipeline_fallback_on_error():
    """Verify LLMPipeline gracefully falls back to heuristic splitting when Ollama is offline."""
    mock_client = AsyncMock(spec=OllamaClient)
    mock_client.generate.side_effect = Exception("Ollama connection failed")

    pipeline = LLMPipeline(client=mock_client)
    text = "Câu một tiếng Việt. Câu hai tiếng Việt. Câu ba tiếng Việt."
    res = await pipeline.auto_chunk_and_translate(raw_text=text, target_lang="en")

    assert res.success is True
    assert len(res.chunks) >= 2
    assert len(res.pairs) >= 1


def test_api_translate_endpoint():
    """Verify POST /api/v1/translate endpoint."""
    payload = {
        "text": "Kiên trì tạo nên thành công.",
        "source_lang": "vi",
        "target_lang": "en",
    }
    response = client.post("/api/v1/translate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["source_text"] == payload["text"]
    assert len(data["translated_text"]) > 0


def test_api_auto_chunk_endpoint():
    """Verify POST /api/v1/auto-chunk endpoint."""
    payload = {
        "raw_text": "Học tập là con đường ngắn nhất dẫn đến thành công. Hãy rèn luyện mỗi ngày một chút.",
        "target_lang": "en",
        "sentences_per_chunk": 2,
    }
    response = client.post("/api/v1/auto-chunk", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["chunks"]) >= 2
    assert len(data["pairs"]) >= 1
    assert data["word_count"] > 0
    assert data["estimated_duration_sec"] > 0
