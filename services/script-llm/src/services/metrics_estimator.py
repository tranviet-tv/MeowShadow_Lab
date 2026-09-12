"""Audio duration, word counting, and shadowing pacing metrics estimator."""

import re
from typing import List, Optional
from src.config import settings
from src.schemas.chunk import ScriptChunk
from src.schemas.metrics import ChunkMetric, EstimateResponse
from src.services.script_tokenizer import parse_tagged_script, normalize_whitespace

# Regex for Japanese character classes: Kanji, Hiragana, Katakana
JAPANESE_CHAR_PATTERN = re.compile(r"[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]")
# Regex for Latin/Vietnamese words
LATIN_WORD_PATTERN = re.compile(r"[a-zA-Z0-9À-ỹ'-]+")


def count_words_or_chars(text: str, lang: str = "en") -> int:
    """Count words for Latin/Vietnamese or characters for Japanese."""
    cleaned = normalize_whitespace(text)
    if not cleaned:
        return 0

    if lang == "ja":
        # Count Japanese characters (Kanji, Hiragana, Katakana) plus any Latin words
        ja_chars = len(JAPANESE_CHAR_PATTERN.findall(cleaned))
        latin_words = len(LATIN_WORD_PATTERN.findall(cleaned))
        return max(1, ja_chars + latin_words)

    # For Vietnamese and English, count whitespace-separated or word-bounded tokens
    tokens = LATIN_WORD_PATTERN.findall(cleaned)
    return max(1, len(tokens))


def calculate_speech_duration(
    text: str,
    lang: str = "en",
    wpm_vi: Optional[int] = None,
    wpm_en: Optional[int] = None,
    cpm_ja: Optional[int] = None,
    speed_rate: Optional[float] = None,
) -> float:
    """Calculate raw speech synthesis duration in seconds before adding silence."""
    count = count_words_or_chars(text, lang=lang)
    speed = speed_rate or 1.0

    if lang == "ja":
        cpm = (cpm_ja or settings.default_cpm_ja) * speed
        duration = (count / cpm) * 60.0
    elif lang == "vi":
        wpm = (wpm_vi or settings.default_wpm_vi) * speed
        duration = (count / wpm) * 60.0
    else:
        wpm = (wpm_en or settings.default_wpm_en) * speed
        duration = (count / wpm) * 60.0

    return round(duration, 2)


def estimate_chunk_metric(
    chunk: ScriptChunk,
    silence_after_vi: Optional[float] = None,
    silence_after_target: Optional[float] = None,
) -> ChunkMetric:
    """Calculate granular metrics for a single ScriptChunk."""
    count = count_words_or_chars(chunk.text, lang=chunk.lang)
    speech_sec = calculate_speech_duration(
        text=chunk.text,
        lang=chunk.lang,
        speed_rate=chunk.speed_rate,
    )

    if chunk.lang == "vi":
        silence_sec = (
            silence_after_vi
            if silence_after_vi is not None
            else settings.default_silence_after_vi_sec
        )
    else:
        silence_sec = (
            silence_after_target
            if silence_after_target is not None
            else settings.default_silence_after_target_sec
        )

    total_sec = round(speech_sec + silence_sec, 2)

    return ChunkMetric(
        chunk_id=chunk.id,
        order=chunk.order,
        lang=chunk.lang,
        words_or_chars=count,
        speech_duration_sec=speech_sec,
        silence_duration_sec=silence_sec,
        total_duration_sec=total_sec,
    )


def estimate_script_metrics(
    chunks: List[ScriptChunk],
    silence_after_vi: Optional[float] = None,
    silence_after_target: Optional[float] = None,
    silence_between_sentences: Optional[float] = None,
) -> EstimateResponse:
    """Calculate aggregate duration and pacing metrics across a list of ScriptChunks."""
    if not chunks:
        return EstimateResponse(
            success=True,
            total_words=0,
            speech_duration_sec=0.0,
            silence_duration_sec=0.0,
            total_estimated_duration_sec=0.0,
            chunks_metrics=[],
        )

    chunk_metrics: List[ChunkMetric] = []
    total_words = 0
    total_speech = 0.0
    total_silence = 0.0

    inter_sentence_silence = (
        silence_between_sentences
        if silence_between_sentences is not None
        else settings.default_silence_between_sentences_sec
    )

    for idx, chunk in enumerate(chunks):
        metric = estimate_chunk_metric(
            chunk=chunk,
            silence_after_vi=silence_after_vi,
            silence_after_target=silence_after_target,
        )
        chunk_metrics.append(metric)
        total_words += metric.words_or_chars
        total_speech += metric.speech_duration_sec
        total_silence += metric.silence_duration_sec

        # Add inter-sentence pause if not last chunk
        if idx < len(chunks) - 1:
            total_silence += inter_sentence_silence

    total_duration = round(total_speech + total_silence, 2)

    return EstimateResponse(
        success=True,
        total_words=total_words,
        speech_duration_sec=round(total_speech, 2),
        silence_duration_sec=round(total_silence, 2),
        total_estimated_duration_sec=total_duration,
        chunks_metrics=chunk_metrics,
    )


def estimate_from_raw_text(
    raw_text: str,
    target_lang: str = "en",
    silence_after_vi: Optional[float] = None,
    silence_after_target: Optional[float] = None,
    silence_between_sentences: Optional[float] = None,
) -> EstimateResponse:
    """Parse raw or tagged text and estimate complete audio pacing metrics."""
    chunks, _ = parse_tagged_script(raw_text, default_target_lang=target_lang)
    return estimate_script_metrics(
        chunks=chunks,
        silence_after_vi=silence_after_vi,
        silence_after_target=silence_after_target,
        silence_between_sentences=silence_between_sentences,
    )
