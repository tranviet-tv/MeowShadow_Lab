"""Unit and integration tests for SP06-02: Regex Tokenizer & Tag Parser Engine."""

from fastapi.testclient import TestClient
from src.main import app
from src.services.script_tokenizer import (
    normalize_whitespace,
    split_sentences,
    parse_tagged_script,
)

client = TestClient(app)


def test_normalize_whitespace():
    """Verify whitespace, carriage returns, and unicode spacing normalization."""
    raw = "Line 1\r\n\r\n\r\nLine 2\u00a0with\u3000spaces   \n\n\nLine 3"
    cleaned = normalize_whitespace(raw)
    assert "\r" not in cleaned
    assert "\u00a0" not in cleaned
    assert "\u3000" not in cleaned
    assert "Line 1\n\nLine 2 with spaces\n\nLine 3" == cleaned


def test_split_sentences_latin_and_vietnamese():
    """Verify sentence splitting for English and Vietnamese while preserving abbreviations."""
    sample = "Xin chào các bạn! Hôm nay chúng ta gặp Dr. John Smith tại TP. HCM. Đây là ví dụ v.v. rất hay."
    sentences = split_sentences(sample, lang="vi")
    assert len(sentences) >= 2
    assert "Xin chào các bạn!" in sentences[0]
    # Verify Dr. John Smith wasn't broken in half
    assert any("Dr. John Smith" in s for s in sentences)


def test_split_sentences_japanese():
    """Verify sentence splitting for Japanese text using Japanese punctuation."""
    ja_sample = "こんにちは。今日はいい天気ですね！明日は雨ですか？はい。"
    sentences = split_sentences(ja_sample, lang="ja")
    assert len(sentences) == 4
    assert sentences[0] == "こんにちは。"
    assert sentences[1] == "今日はいい天気ですね！"
    assert sentences[2] == "明日は雨ですか？"
    assert sentences[3] == "はい。"


def test_parse_interleaved_tags():
    """Verify parsing interleaved [VI] and [EN] tags into sequential chunks and pairs."""
    script = """
    [VI] Sự tập trung là chìa khóa mở ra mọi thành công.
    [EN] Focus is the ultimate key to unlocking success.
    [VI] Hãy kiên định với mục tiêu của bạn mỗi ngày.
    [EN] Stay committed to your goals every single day.
    """
    chunks, pairs = parse_tagged_script(script)

    assert len(chunks) == 4
    assert chunks[0].lang == "vi"
    assert chunks[0].text == "Sự tập trung là chìa khóa mở ra mọi thành công."
    assert chunks[1].lang == "en"
    assert chunks[1].text == "Focus is the ultimate key to unlocking success."
    assert chunks[2].lang == "vi"
    assert chunks[3].lang == "en"

    # Verify pairing
    assert len(pairs) == 2
    assert pairs[0].vi_chunk.text == chunks[0].text
    assert pairs[0].target_chunk.text == chunks[1].text
    assert pairs[1].vi_chunk.text == chunks[2].text
    assert pairs[1].target_chunk.text == chunks[3].text


def test_parse_japanese_tags():
    """Verify parsing interleaved [VI] and [JA] tags."""
    script = """
    [VI] Cảm ơn bạn rất nhiều vì đã giúp đỡ tôi.
    [JA] 手伝ってくれて本当にありがとうございます。
    """
    chunks, pairs = parse_tagged_script(script, default_target_lang="ja")

    assert len(chunks) == 2
    assert chunks[0].lang == "vi"
    assert chunks[1].lang == "ja"
    assert chunks[1].text == "手伝ってくれて本当にありがとうございます。"

    assert len(pairs) == 1
    assert pairs[0].target_lang == "ja"


def test_parse_case_insensitivity():
    """Verify parser handles lowercase tags ([vi], [en], [ja])."""
    script = """
    [vi] Kiên nhẫn là mẹ thành công.
    [en] Patience is the mother of success.
    """
    chunks, pairs = parse_tagged_script(script)
    assert len(chunks) == 2
    assert chunks[0].lang == "vi"
    assert chunks[1].lang == "en"
    assert len(pairs) == 1


def test_parse_api_endpoint():
    """Verify POST /api/v1/parse HTTP endpoint."""
    payload = {
        "raw_text": "[VI] Học tiếng Anh qua phương pháp Shadowing.\n[EN] Learning English through the Shadowing technique.",
        "target_lang": "en",
        "generate_pairs": True,
    }
    response = client.post("/api/v1/parse", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_chunks"] == 2
    assert data["total_pairs"] == 1
    assert len(data["chunks"]) == 2
    assert len(data["pairs"]) == 1
    assert data["chunks"][0]["lang"] == "vi"
    assert data["chunks"][1]["lang"] == "en"
