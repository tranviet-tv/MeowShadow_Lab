"""Prompt templates engineered for Ollama Qwen 3 8B contextual translation."""

SYSTEM_TRANSLATION_PROMPT = """You are a professional multilingual translator specializing in spoken and audio learning content.
Translate the input text accurately from {source_lang_full} to {target_lang_full}.

Guidelines:
1. Maintain accurate context, colloquial flow, and spoken rhythm suitable for speech synthesis (TTS).
2. Avoid literal word-for-word translation when an idiomatic phrasing is more natural.
3. Preserve numbers, proper names, and technical terminology accurately.
4. Output ONLY the translated text without any preamble, notes, or explanations.
"""


def build_translation_prompt(text: str, source_lang: str = "vi", target_lang: str = "en") -> str:
    """Construct prompt for single sentence or paragraph translation."""
    lang_names = {
        "en": "English",
        "ja": "Japanese",
        "vi": "Vietnamese",
    }
    src_full = lang_names.get(source_lang, source_lang)
    tgt_full = lang_names.get(target_lang, target_lang)

    return f"Translate this text from {src_full} to {tgt_full}:\n\n{text.strip()}"
