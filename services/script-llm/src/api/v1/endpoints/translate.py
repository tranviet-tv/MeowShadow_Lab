"""API endpoints for LLM translation and automated shadowing chunking."""

from fastapi import APIRouter, status
from src.config import settings
from src.schemas.translate import TranslateRequest, TranslateResponse
from src.schemas.script_response import (
    AutoChunkTranslateRequest,
    AutoChunkTranslateResponse,
)
from src.services.llm_pipeline import LLMPipeline

router = APIRouter()
pipeline = LLMPipeline()


@router.post(
    "/translate",
    response_model=TranslateResponse,
    status_code=status.HTTP_200_OK,
    summary="Translate text using Ollama Qwen 3 8B",
    description="Translates a single passage between Vietnamese, English, or Japanese with spoken-optimized nuance.",
)
async def translate_endpoint(request: TranslateRequest) -> TranslateResponse:
    """Translate text between supported languages."""
    model_name = request.model or settings.llm_model
    translated = await pipeline.translate(
        text=request.text,
        source_lang=request.source_lang,
        target_lang=request.target_lang,
        model=model_name,
    )

    return TranslateResponse(
        success=True,
        source_text=request.text,
        translated_text=translated,
        source_lang=request.source_lang,
        target_lang=request.target_lang,
        model=model_name,
    )


@router.post(
    "/auto-chunk",
    response_model=AutoChunkTranslateResponse,
    status_code=status.HTTP_200_OK,
    summary="Automatically chunk and translate raw text into Shadowing units",
    description="Segments up to 1,500 words of raw text into 3-4 sentence logical units and generates bilingual shadowing pairs.",
)
async def auto_chunk_endpoint(request: AutoChunkTranslateRequest) -> AutoChunkTranslateResponse:
    """Segment raw text and synthesize bilingual shadowing script."""
    model_name = request.model or settings.llm_model
    response = await pipeline.auto_chunk_and_translate(
        raw_text=request.raw_text,
        target_lang=request.target_lang,
        sentences_per_chunk=request.sentences_per_chunk,
        model=model_name,
    )
    return response
