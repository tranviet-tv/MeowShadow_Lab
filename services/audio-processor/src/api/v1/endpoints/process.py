"""API endpoint for direct audio processing requests."""

import logging
from fastapi import APIRouter, HTTPException, status

from src.schemas.mastering_result import MasteringResult
from src.schemas.process_request import ProcessRequest
from src.services.pipeline import pipeline_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/process",
    response_model=MasteringResult,
    status_code=status.HTTP_200_OK,
    summary="Process and master shadowing audio clips",
    description="Assemble clips with pacing silences, apply EBU R128 mastering, generate SRT/VTT subtitles and waveform peaks.",
)
async def process_audio(request: ProcessRequest) -> MasteringResult:
    """Handle synchronous audio mastering request."""
    try:
        result = pipeline_service.process_lesson(request)
        return result
    except ValueError as e:
        logger.warning("Validation error during audio processing: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except FileNotFoundError as e:
        logger.error("Missing audio asset during processing: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.exception("Unexpected error during audio processing: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal audio processing failure: {str(e)}",
        )
