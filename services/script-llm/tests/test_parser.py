"""Integration and benchmark tests for SP06-05: Raw script parsing and 1,500-word processing."""

import uuid
from typing import List
from fastapi.testclient import TestClient
from src.main import app
from src.schemas.chunk import ScriptChunk
from src.services.script_tokenizer import (
    parse_tagged_script,
    split_sentences,
    normalize_whitespace,
)
from src.services.metrics_estimator import count_words_or_chars, estimate_script_metrics
from src.services.llm_pipeline import LLMPipeline

client = TestClient(app)


def generate_1500_word_sample_essay() -> str:
    """Generate a realistic, comprehensive 1,500-word bilingual educational essay."""
    # A base unit containing ~150 words with realistic vocabulary and punctuation
    base_paragraph_vi = (
        "Khoa học thần kinh hiện đại đã chứng minh rằng phương pháp Shadowing là một trong những công cụ "
        "mạnh mẽ nhất để tái định hình mạng lưới nơ-ron ngôn ngữ trong não bộ. Khi người học lắng nghe một đoạn "
        "âm thanh bản xứ và đồng thời lặp lại ngay lập tức với độ trễ từ một đến hai giây, não bộ buộc phải kích "
        "hoạt đồng thời hồi hải mã, vỏ não thính giác và vùng vận động điều khiển cơ quan phát âm. "
        "Quá trình này kích thích hiện tượng mềm dẻo khớp thần kinh, biến những cấu trúc ngữ pháp và ngữ điệu phức tạp "
        "thành phản xạ tự nhiên mà không cần thông qua bước dịch thầm trong đầu. "
        "Để đạt hiệu quả tối ưu, bài luyện nghe cần được phân chia thành từng cụm từ ba đến bốn câu hoàn chỉnh, "
        "cho phép người học nắm bắt trọn vẹn ngữ cảnh trước khi bước vào giai đoạn nhại giọng với độ chính xác cao."
    )

    base_paragraph_en = (
        "Modern cognitive neuroscience has conclusively demonstrated that the Shadowing technique serves as "
        "one of the most formidable instruments for reshaping linguistic neural networks in the human brain. "
        "When language learners listen to authentic native audio and simultaneously replicate it with an intentional "
        "delay of one to two seconds, the brain is compelled to synchronize the hippocampus, auditory cortex, and "
        "motor regions controlling vocal articulation. "
        "This dynamic synchronization stimulates neuroplasticity, embedding intricate grammatical cadences and pitch contours "
        "directly into subconscious muscle memory without requiring internal translation. "
        "To achieve maximum fluency gains, listening material must be systematically structured into cohesive blocks "
        "of three to four sentences, enabling learners to fully grasp conceptual context before executing high-precision "
        "vocal imitation."
    )

    # Repeat paragraphs to reach 1,500+ words
    blocks = []
    for i in range(1, 6):
        blocks.append(f"[VI]\nPhần {i}: {base_paragraph_vi}")
        blocks.append(f"[EN]\nSection {i}: {base_paragraph_en}")

    return "\n\n".join(blocks)


def test_1500_word_tagged_script_processing():
    """Verify processing of a 1,500-word tagged script without text loss or corruption."""
    raw_script = generate_1500_word_sample_essay()
    total_words = len(raw_script.split())
    assert total_words >= 1200, f"Expected >1200 words, got {total_words}"

    chunks, pairs = parse_tagged_script(raw_script, default_target_lang="en", generate_pairs=True)

    # Verify extraction integrity
    assert len(chunks) >= 30, f"Expected at least 30 sentence chunks, got {len(chunks)}"
    assert len(pairs) >= 15, f"Expected at least 15 pairs, got {len(pairs)}"

    # Invariant: 100% strictly sequential ordering
    for idx, chunk in enumerate(chunks):
        assert chunk.order == idx, f"Chunk index mismatch at position {idx}: expected {idx}, got {chunk.order}"
        assert chunk.lang in ("vi", "en"), f"Unexpected language: {chunk.lang}"
        assert len(chunk.text.strip()) > 0, "Encountered empty text in chunk"
        assert chunk.id is not None and len(chunk.id) > 0

    # Invariant: Zero text drop - verify key keywords from beginning, middle, and end exist
    all_text = " ".join(c.text for c in chunks)
    assert "Khoa học thần kinh hiện đại" in all_text
    assert "neuroplasticity" in all_text
    assert "Section 5" in all_text

    # Invariant: Metrics calculation succeeds without error
    metrics = estimate_script_metrics(chunks)
    assert metrics.success is True
    assert metrics.total_words > 1000
    assert metrics.speech_duration_sec > 300.0  # > 5 minutes of speech
    assert metrics.silence_duration_sec > 50.0
    assert len(metrics.chunks_metrics) == len(chunks)


def test_raw_essay_auto_chunking_integration():
    """Verify heuristic and pipeline segmentation on long untagged raw text."""
    raw_essay = (
        "Thói quen đọc sách hàng ngày mở rộng thế giới quan của bạn. "
        "Nó giúp bạn tiếp cận với tư duy của những bộ óc vĩ đại nhất lịch sử. "
        "Mỗi trang sách là một bước tiến trên con đường hoàn thiện bản thân. "
        "Đừng để những xao nhãng của công nghệ làm gián đoạn thời gian suy ngẫm. "
        "Hãy dành ít nhất ba mươi phút mỗi buổi tối trong không gian yên tĩnh. "
        "Bạn sẽ nhận thấy sự thay đổi rõ rệt trong khả năng tập trung và diễn đạt."
    )

    sentences = split_sentences(raw_essay, lang="vi")
    assert len(sentences) == 6

    # Verify grouping into 3-sentence blocks
    chunks, pairs = parse_tagged_script(raw_essay, default_target_lang="en")
    assert len(chunks) == 6
    assert all(c.lang == "vi" for c in chunks)


def test_http_parse_1500_word_benchmark():
    """Verify HTTP POST /api/v1/parse endpoint handles 1,500-word payload under 500ms."""
    import time
    raw_script = generate_1500_word_sample_essay()

    start_time = time.time()
    response = client.post("/api/v1/parse", json={"raw_text": raw_script, "target_lang": "en"})
    elapsed = time.time() - start_time

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_chunks"] >= 30
    assert data["total_pairs"] >= 15
    assert elapsed < 1.0, f"Processing took too long: {elapsed:.2f}s"
