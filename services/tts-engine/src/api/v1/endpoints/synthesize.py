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

router = APIRouter(tags=["Synthesis"])


@router.post("/synthesize", summary="Synthesize single text to MP3 audio stream")
async def synthesize_preview(payload: SynthesizePreviewRequest):
    """
    Synthesize a single text sentence and stream MP3 bytes directly back.
    Useful for testing voices and frontend audio previewing.
    """
    try:
        audio_bytes = await edge_engine.synthesize_to_bytes(
            text=payload.text,
            voice_id=payload.voice_id,
            rate=payload.rate,
            pitch=payload.pitch,
            volume=payload.volume,
        )
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(exc)}")


@router.post("/synthesize/batch", response_model=BatchTTSResponse, summary="Batch synthesize lesson chunks")
async def synthesize_batch_endpoint(payload: BatchTTSRequest):
    """
    Synthesize an array of sentence chunks in parallel for a given lesson.
    Outputs individual MP3 clip files in storage.
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
