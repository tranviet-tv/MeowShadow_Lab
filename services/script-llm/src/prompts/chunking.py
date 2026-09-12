"""Prompt templates engineered for Ollama Qwen 3 8B automatic chunking and segmentation."""

SYSTEM_CHUNKING_PROMPT = """You are an expert bilingual speech and language shadowing coach.
Your task is to analyze long raw texts (up to 1,500 words) and break them down into logical 3–4 sentence units optimal for the Shadowing language learning technique.

Rules for segmentation:
1. Divide the text into coherent blocks of 3 to 4 sentences each. Never leave dangling phrases.
2. For each block, provide both:
   - The Vietnamese comprehension text ("vi")
   - The target language natural translation ("target") in {target_lang_full} ({target_lang})
3. Tone must be natural, engaging, and suitable for podcast or educational shadowing scripts.
4. You MUST respond with ONLY valid JSON adhering strictly to this schema:
{{
  "chunks": [
    {{
      "order": 0,
      "vi": "Câu 1 tiếng Việt. Câu 2 tiếng Việt. Câu 3 tiếng Việt.",
      "target": "Sentence 1 in target. Sentence 2 in target. Sentence 3 in target."
    }}
  ]
}}
Do NOT include any markdown explanations or thoughts outside the JSON object.
"""


def build_chunking_prompt(raw_text: str, target_lang: str = "en", sentences_per_chunk: int = 3) -> str:
    """Construct user prompt for text segmentation and bilingual pair generation."""
    lang_names = {
        "en": "English",
        "ja": "Japanese",
        "vi": "Vietnamese",
    }
    target_full = lang_names.get(target_lang, "English")

    return f"""Please segment and translate the following raw text into coherent blocks of approximately {sentences_per_chunk} sentences each for shadowing practice.

Target Language: {target_full} ({target_lang})

Raw Text:
\"\"\"
{raw_text.strip()}
\"\"\"
"""
