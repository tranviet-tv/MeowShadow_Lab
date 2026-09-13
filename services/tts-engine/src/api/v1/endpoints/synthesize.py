"""Speech synthesis preview and batch endpoints."""

from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import Response

from src.config import settings
from src.schemas.tts import (
    SynthesizePreviewRequest,
    BatchTTSRequest,
    BatchTTSResponse,
)
from src.services.edge_engine import edge_engine
from src.services.kokoro_engine import export_kokoro_engine as kokoro_engine

router = APIRouter(tags=["Synthesis"])


@router.post("/synthesize", summary="Synthesize single text to audio stream")
async def synthesize_preview(payload: SynthesizePreviewRequest):
    """
    Synthesize a single text sentence and stream audio bytes directly back.
    Supports both Edge-TTS (MP3) and Kokoro-82M Local AI (WAV/MP3).
    """
    try:
        is_kokoro = payload.engine == "kokoro" or payload.voice_id.startswith("kokoro-")
        engine = kokoro_engine if is_kokoro else edge_engine
        media_type = "audio/wav" if is_kokoro else "audio/mpeg"

        audio_bytes = await engine.synthesize_to_bytes(
            text=payload.text,
            voice_id=payload.voice_id,
            rate=payload.rate,
            pitch=payload.pitch,
            volume=payload.volume,
        )
        return Response(content=audio_bytes, media_type=media_type)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(exc)}")


@router.post("/synthesize/batch", response_model=BatchTTSResponse, summary="Batch synthesize lesson chunks")
async def synthesize_batch_endpoint(payload: BatchTTSRequest):
    """
    Synthesize an array of sentence chunks in parallel for a given lesson.
    Outputs individual audio clip files in storage.
    """
    output_dir = settings.get_audio_dir() / payload.lesson_id
    concurrency = payload.concurrency or settings.concurrency_limit

    # Apply default voices if individual chunk voice is unspecified
    processed_chunks = []
    for chunk in payload.chunks:
        c = chunk.model_copy()
        if not c.voice_id:
            if c.lang == "vi" and payload.default_voice_vi:
                c.voice_id = payload.default_voice_vi
            elif c.lang in ("en", "ja") and payload.default_voice_target:
                c.voice_id = payload.default_voice_target
        processed_chunks.append(c)

    # Route to engine based on payload request
    is_kokoro = payload.engine == "kokoro" or any(c.voice_id and c.voice_id.startswith("kokoro-") for c in processed_chunks)
    if is_kokoro:
        return await kokoro_engine.synthesize_batch(
            chunks=processed_chunks,
            output_dir=output_dir,
            concurrency=concurrency,
        )

    results = await edge_engine.synthesize_batch(
        chunks=processed_chunks,
        output_dir=output_dir,
        concurrency=concurrency,
    )

    successful = [r for r in results if r.error is None]
    total_duration = sum(r.duration_sec for r in successful)
    cache_hits = sum(1 for r in results if r.cached)

    return BatchTTSResponse(
        success=len(successful) == len(results),
        lesson_id=payload.lesson_id,
        total_chunks=len(results),
        successful_chunks=len(successful),
        total_duration_sec=round(total_duration, 2),
        cache_hits=cache_hits,
        clips=results,
    )
