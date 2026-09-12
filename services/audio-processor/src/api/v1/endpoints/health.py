"""Health check endpoint for audio processor microservice."""

import os
import shutil
import time
from fastapi import APIRouter
from pydantic import BaseModel
from src.config import settings

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response payload."""

    status: str
    service: str
    version: str
    timestamp: float
    ffmpeg_available: bool
    storage_writable: bool


@router.get("/health", response_model=HealthResponse)
async def check_health() -> HealthResponse:
    """Check health status of audio processor service and environment."""
    ffmpeg_bin = shutil.which("ffmpeg")
    storage_path = settings.get_storage_path()
    storage_ok = os.access(storage_path, os.W_OK)

    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        version=settings.app_version,
        timestamp=time.time(),
        ffmpeg_available=ffmpeg_bin is not None,
        storage_writable=storage_ok,
    )
