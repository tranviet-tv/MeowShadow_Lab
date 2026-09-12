"""Regex tokenizer and multilingual syntax tag parser engine for shadowing scripts."""

import re
import uuid
from typing import List, Tuple, Optional
from src.schemas.chunk import ScriptChunk, ChunkPair
from src.core.exceptions import TagParsingError

# Regex pattern matching tags [VI], [EN], [JA] (case-insensitive)
TAG_PATTERN = re.compile(r"\[(VI|EN|JA)\]", re.IGNORECASE)

# Pattern capturing tag and its subsequent content up to the next tag or EOF
TAG_CONTENT_PATTERN = re.compile(
    r"\[(VI|EN|JA)\]\s*(.*?)(?=\[(?:VI|EN|JA)\]|$)",
    re.IGNORECASE | re.DOTALL,
)

# Common abbreviations to prevent false sentence splitting
COMMON_ABBREVIATIONS = (
    "mr.", "mrs.", "ms.", "dr.", "prof.", "sr.", "jr.",
    "e.g.", "i.e.", "etc.", "vs.", "v.v.", "tp.", "th.",
)


def normalize_whitespace(text: str) -> str:
    """Normalize irregular Unicode whitespaces, newlines, and trailing spaces."""
    if not text:
        return ""

    # Replace non-breaking and special unicode spaces
    text = text.replace("\u00a0", " ").replace("\u200b", "").replace("\u3000", " ")

    # Unify carriage returns to standard newline
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Trim trailing whitespace on each line
    lines = [line.strip() for line in text.split("\n")]

    # Condense consecutive empty lines
    cleaned_lines: List[str] = []
    blank_count = 0
    for line in lines:
        if not line:
            blank_count += 1
            if blank_count <= 1:
                cleaned_lines.append("")
        else:
            blank_count = 0
            cleaned_lines.append(line)

    result = "\n".join(cleaned_lines).strip()
    return result


def split_sentences(text: str, lang: str = "vi") -> List[str]:
    """Split a paragraph or block of text into distinct sentences."""
    cleaned = normalize_whitespace(text)
    if not cleaned:
        return []

    # Japanese sentence punctuation splitting (。！？)
    if lang == "ja":
        parts = re.split(r"([。！？\n]+)", cleaned)
        sentences: List[str] = []
        for i in range(0, len(parts), 2):
            main_part = parts[i].strip()
            punct = parts[i + 1].strip() if i + 1 < len(parts) else ""
            combined = (main_part + punct).strip()
            if combined:
                sentences.append(combined)
        return sentences

    # Latin / Vietnamese sentence boundary splitting
    # Splitting by punctuation (.!?) followed by space or newline, while avoiding abbreviations
    raw_tokens = re.split(r"([.!?]+(?:\s+|\n+|$))", cleaned)
    sentences = []
    current_sentence = ""

    for token in raw_tokens:
        if not token:
            continue
        current_sentence += token
        # Check if current segment ends with punctuation + boundary
        if re.search(r"[.!?]+(?:\s+|\n+|$)", token):
            candidate = current_sentence.strip()
            # Check for abbreviations like 'Dr.' or 'v.v.'
            tokens_lower = candidate.lower().split()
            last_word = tokens_lower[-1] if tokens_lower else ""
            if any(last_word.endswith(abbr) for abbr in COMMON_ABBREVIATIONS):
                continue
            if candidate:
                sentences.append(candidate)
            current_sentence = ""

    # Append any remaining trailing text
    if current_sentence.strip():
        sentences.append(current_sentence.strip())

    return sentences


def parse_tagged_script(
    raw_text: str,
    default_target_lang: str = "en",
    generate_pairs: bool = True,
) -> Tuple[List[ScriptChunk], List[ChunkPair]]:
    """Parse raw script containing [VI], [EN], or [JA] tags into chunks and pairs.

    Returns:
        Tuple of (chunks: List[ScriptChunk], pairs: List[ChunkPair])
    """
    cleaned = normalize_whitespace(raw_text)
    if not cleaned:
        return [], []

    matches = list(TAG_CONTENT_PATTERN.finditer(cleaned))

    # If no tags are found, wrap entire text in default language
    if not matches:
        sentences = split_sentences(cleaned, lang="vi")
        chunks = [
            ScriptChunk(
                id=str(uuid.uuid4()),
                order=idx,
                lang="vi",
                text=sent,
            )
            for idx, sent in enumerate(sentences)
        ]
        return chunks, []

    chunks: List[ScriptChunk] = []
    chunk_order = 0
    vi_chunks: List[ScriptChunk] = []
    target_chunks: List[ScriptChunk] = []

    detected_target_lang = default_target_lang

    for match in matches:
        tag_raw = match.group(1).lower()
        content = match.group(2).strip()

        if not content:
            continue

        if tag_raw in ("en", "ja"):
            detected_target_lang = tag_raw

        # Split block into individual sentences
        sub_sentences = split_sentences(content, lang=tag_raw)
        if not sub_sentences:
            sub_sentences = [content]

        for sentence in sub_sentences:
            sanitized = re.sub(r"\s+", " ", sentence).strip()
            if not sanitized:
                continue

            chunk = ScriptChunk(
                id=str(uuid.uuid4()),
                order=chunk_order,
                lang=tag_raw,
                text=sanitized,
            )
            chunks.append(chunk)
            chunk_order += 1

            if tag_raw == "vi":
                vi_chunks.append(chunk)
            else:
                target_chunks.append(chunk)

    pairs: List[ChunkPair] = []
    if generate_pairs:
        # Align Vietnamese and target chunks sequentially
        pair_count = min(len(vi_chunks), len(target_chunks))
        for p_idx in range(pair_count):
            pair = ChunkPair(
                order=p_idx,
                target_lang=target_chunks[p_idx].lang,
                vi_chunk=vi_chunks[p_idx],
                target_chunk=target_chunks[p_idx],
            )
            pairs.append(pair)

    return chunks, pairs
