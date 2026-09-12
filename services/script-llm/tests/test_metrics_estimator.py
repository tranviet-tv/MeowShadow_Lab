"""Unit and integration tests for SP06-04: Duration and Audio Pacing Metrics Estimator."""

from fastapi.testclient import TestClient
from src.main import app
from src.schemas.chunk import ScriptChunk
from src.services.metrics_estimator import (
    count_words_or_chars,
    calculate_speech_duration,
    estimate_chunk_metric,
    estimate_script_metrics,
    estimate_from_raw_text,
)

client = TestClient(app)


def test_count_words_or_chars():
    """Verify word and character counting across Vietnamese, English, and Japanese."""
    vi_text = "Học lập trình mở ra nhiều cơ hội mới."
    assert count_words_or_chars(vi_text, lang="vi") == 9

    en_text = "Coding opens up many incredible opportunities."
    assert count_words_or_chars(en_text, lang="en") == 6

    ja_text = "プログラミングは新しい機会を開きます。"
    # Japanese character count
    assert count_words_or_chars(ja_text, lang="ja") >= 10


def test_calculate_speech_duration():
    """Verify speech duration calculation against standard WPM/CPM values."""
    # 150 words in Vietnamese at 150 WPM should be exactly 60 seconds
    vi_150_words = " ".join(["từ"] * 150)
    duration_vi = calculate_speech_duration(vi_150_words, lang="vi", wpm_vi=150)
    assert 59.0 <= duration_vi <= 61.0

    # 140 words in English at 140 WPM should be ~60 seconds
    en_140_words = " ".join(["word"] * 140)
    duration_en = calculate_speech_duration(en_140_words, lang="en", wpm_en=140)
    assert 59.0 <= duration_en <= 61.0


def test_estimate_chunk_metric():
    """Verify pacing silences assigned to Vietnamese vs target language chunks."""
    chunk_vi = ScriptChunk(id="c-vi", order=0, lang="vi", text="Chào bạn.")
    metric_vi = estimate_chunk_metric(chunk_vi, silence_after_vi=1.5, silence_after_target=3.5)
    assert metric_vi.lang == "vi"
    assert metric_vi.silence_duration_sec == 1.5

    chunk_en = ScriptChunk(id="c-en", order=1, lang="en", text="Hello my friend.")
    metric_en = estimate_chunk_metric(chunk_en, silence_after_vi=1.5, silence_after_target=3.5)
    assert metric_en.lang == "en"
    assert metric_en.silence_duration_sec == 3.5


def test_estimate_script_metrics():
    """Verify total duration and silence calculation across multiple chunks."""
    chunks = [
        ScriptChunk(id="1", order=0, lang="vi", text="Kiên trì là chìa khóa."),
        ScriptChunk(id="2", order=1, lang="en", text="Persistence is key to success."),
    ]
    resp = estimate_script_metrics(
        chunks=chunks,
        silence_after_vi=1.5,
        silence_after_target=3.5,
        silence_between_sentences=0.5,
    )
    assert resp.success is True
    assert resp.total_words == 5 + 5
    assert resp.speech_duration_sec > 0
    # Silence: 1.5s (vi) + 3.5s (en) + 0.5s (inter-sentence) = 5.5s
    assert resp.silence_duration_sec == 5.5
    assert resp.total_estimated_duration_sec == round(resp.speech_duration_sec + resp.silence_duration_sec, 2)


def test_estimate_from_raw_text():
    """Verify pacing calculation directly from raw tagged script string."""
    script = """
    [VI] Luyện tập mỗi ngày.
    [EN] Practice every single day.
    """
    resp = estimate_from_raw_text(script, target_lang="en")
    assert resp.success is True
    assert resp.total_words > 0
    assert len(resp.chunks_metrics) == 2


def test_estimate_api_endpoint():
    """Verify POST /api/v1/estimate HTTP endpoint."""
    payload = {
        "raw_text": "[VI] Xin chào thế giới.\n[EN] Hello world.",
        "target_lang": "en",
        "silence_after_vi_sec": 1.5,
        "silence_after_target_sec": 3.0,
    }
    response = client.post("/api/v1/estimate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_words"] > 0
    assert data["speech_duration_sec"] > 0
    assert data["silence_duration_sec"] > 0
    assert len(data["chunks_metrics"]) == 2
