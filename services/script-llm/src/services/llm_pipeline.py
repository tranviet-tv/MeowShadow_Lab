"""High-level LLM pipeline for translation, segmentation, and shadowing script synthesis."""

import logging
import uuid
from typing import List, Optional, Tuple
from src.config import settings
from src.core.exceptions import OllamaServiceError
from src.prompts.chunking import SYSTEM_CHUNKING_PROMPT, build_chunking_prompt
from src.prompts.translation import SYSTEM_TRANSLATION_PROMPT, build_translation_prompt
from src.schemas.chunk import ScriptChunk, ChunkPair
from src.schemas.script_response import AutoChunkTranslateResponse
from src.services.ollama_client import OllamaClient
from src.services.script_tokenizer import split_sentences, normalize_whitespace

logger = logging.getLogger(settings.app_name)


class LLMPipeline:
    """Orchestrates natural language tasks using Ollama Qwen 3 8B."""

    def __init__(self, client: Optional[OllamaClient] = None):
        self.client = client or OllamaClient()

    async def translate(
        self,
        text: str,
        source_lang: str = "vi",
        target_lang: str = "en",
        model: Optional[str] = None,
    ) -> str:
        """Translate a piece of text from source_lang to target_lang."""
        cleaned = normalize_whitespace(text)
        if not cleaned:
            return ""

        lang_names = {
            "vi": "Vietnamese",
            "en": "English",
            "ja": "Japanese",
        }
        sys_prompt = SYSTEM_TRANSLATION_PROMPT.format(
            source_lang_full=lang_names.get(source_lang, source_lang),
            target_lang_full=lang_names.get(target_lang, target_lang),
        )
        user_prompt = build_translation_prompt(cleaned, source_lang=source_lang, target_lang=target_lang)

        try:
            translated = await self.client.generate(
                prompt=user_prompt,
                system_prompt=sys_prompt,
                model=model,
                format_json=False,
            )
            return translated.strip()
        except Exception as err:
            logger.warning("Ollama unavailable for translation (%s). Using fallback.", str(err))
            return f"[{target_lang.upper()}] {cleaned}"


    async def auto_chunk_and_translate(
        self,
        raw_text: str,
        target_lang: str = "en",
        sentences_per_chunk: int = 3,
        model: Optional[str] = None,
    ) -> AutoChunkTranslateResponse:
        """Segment raw text into units and synthesize bilingual shadowing script."""
        cleaned = normalize_whitespace(raw_text)
        if not cleaned:
            return AutoChunkTranslateResponse(
                success=True,
                formatted_script="",
                chunks=[],
                pairs=[],
                word_count=0,
                estimated_duration_sec=0.0,
            )

        # Split sentences using rule-based tokenizer
        sentences = split_sentences(cleaned, lang="vi")
        group_size = max(1, sentences_per_chunk)
        word_count_est = len(cleaned.split())

        # For short text (<= 3 sentences and <= 80 words), attempt single-pass JSON generation
        chunks_data: List[dict] = []
        use_single_pass = len(sentences) <= 3 and word_count_est <= 80

        if use_single_pass:
            lang_names = {
                "vi": "Vietnamese",
                "en": "English",
                "ja": "Japanese",
            }
            sys_prompt = SYSTEM_CHUNKING_PROMPT.format(
                target_lang_full=lang_names.get(target_lang, "English"),
                target_lang=target_lang,
            )
            user_prompt = build_chunking_prompt(cleaned, target_lang=target_lang, sentences_per_chunk=sentences_per_chunk)

            try:
                raw_response = await self.client.generate(
                    prompt=user_prompt,
                    system_prompt=sys_prompt,
                    model=model,
                    format_json=True,
                )
                parsed_json = self.client.extract_json(raw_response)
                chunks_data = parsed_json.get("chunks", [])
            except Exception as exc:
                logger.warning("Single-pass Ollama generation failed (%s). Using block translation fallback.", str(exc))
                chunks_data = []

        # If single-pass was skipped or returned empty, use deterministic sentence chunking and block translation
        if not chunks_data:
            blocks_vi: List[str] = []
            for i in range(0, len(sentences), group_size):
                block = " ".join(sentences[i : i + group_size]).strip()
                if block:
                    blocks_vi.append(block)

            for idx, block_vi in enumerate(blocks_vi):
                try:
                    translated = await self.translate(
                        text=block_vi,
                        source_lang="vi",
                        target_lang=target_lang,
                        model=model,
                    )
                    target_text = translated.strip()
                except Exception as err:
                    logger.warning("Failed to translate block %d: %s", idx, str(err))
                    target_text = ""

                chunks_data.append({
                    "order": idx,
                    "vi": block_vi,
                    "target": target_text,
                })

        # Assemble ScriptChunk and ChunkPair objects
        script_chunks: List[ScriptChunk] = []
        pairs: List[ChunkPair] = []
        formatted_script_lines: List[str] = []
        global_order = 0
        total_word_count = 0

        target_tag = target_lang.upper()

        for p_idx, item in enumerate(chunks_data):
            vi_text = item.get("vi", "").strip()
            target_text = item.get("target", "").strip()
            if not target_text and vi_text:
                target_text = f"[{target_tag}] {vi_text}"

            if not vi_text:
                continue


            vi_chunk = ScriptChunk(
                id=str(uuid.uuid4()),
                order=global_order,
                lang="vi",
                text=vi_text,
            )
            script_chunks.append(vi_chunk)
            global_order += 1

            tgt_chunk = ScriptChunk(
                id=str(uuid.uuid4()),
                order=global_order,
                lang=target_lang,
                text=target_text,
            )
            script_chunks.append(tgt_chunk)
            global_order += 1

            pairs.append(
                ChunkPair(
                    order=p_idx,
                    target_lang=target_lang,
                    vi_chunk=vi_chunk,
                    target_chunk=tgt_chunk,
                )
            )

            # Build interleaved formatted script
            formatted_script_lines.append(f"[VI]\n{vi_text}")
            formatted_script_lines.append(f"[{target_tag}]\n{target_text}\n")

            # Word count estimation
            total_word_count += len(vi_text.split()) + (len(target_text.split()) if target_text else 0)

        # Estimated duration in seconds (words / (140 WPM / 60) + pauses)
        # Average reading speed ~ 2.3 words/sec plus 5s pause per pair
        speech_sec = total_word_count / 2.3 if total_word_count > 0 else 0.0
        pauses_sec = len(pairs) * 5.0
        estimated_duration = round(speech_sec + pauses_sec, 2)

        return AutoChunkTranslateResponse(
            success=True,
            formatted_script="\n".join(formatted_script_lines).strip(),
            chunks=script_chunks,
            pairs=pairs,
            word_count=total_word_count,
            estimated_duration_sec=estimated_duration,
        )
