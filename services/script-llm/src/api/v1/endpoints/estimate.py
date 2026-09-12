"""API endpoint for audio duration and pacing estimation."""

from fastapi import APIRouter, status
from src.schemas.metrics import EstimateRequest, EstimateResponse
from src.services.metrics_estimator import (
    estimate_script_metrics,
    estimate_from_raw_text,
)

router = APIRouter()


@router.post(
    "/estimate",
    response_model=EstimateResponse,
    status_code=status.HTTP_200_OK,
    summary="Estimate audio duration and shadowing pacing timeline",
    description="Calculates spoken reading duration based on language WPM/CPM and pacing pauses between Vietnamese cues and shadowing responses.",
)
async def estimate_endpoint(request: EstimateRequest) -> EstimateResponse:
    """Estimate spoken audio duration and silence pauses for chunks or raw script."""
    if request.chunks:
        return estimate_script_metrics(
            chunks=request.chunks,
            silence_after_vi=request.silence_after_vi_sec,
            silence_after_target=request.silence_after_target_sec,
            silence_between_sentences=request.silence_between_sentences_sec,
        )

    raw_text = request.raw_text or ""
    return estimate_from_raw_text(
        raw_text=raw_text,
        target_lang=request.target_lang,
        silence_after_vi=request.silence_after_vi_sec,
        silence_after_target=request.silence_after_target_sec,
        silence_between_sentences=request.silence_between_sentences_sec,
    )
