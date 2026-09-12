"""Health check and service status endpoints."""

import time
from fastapi import APIRouter
from src.config import settings

router = APIRouter(tags=["Health"])

START_TIME = time.time()


@router.get("/health")
async def health_check():
    """Return health status, version, and runtime uptime."""
    storage_ok = settings.get_storage_path().exists()
    cache_ok = settings.get_cache_dir().exists()

    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "storage": {
            "root_ok": storage_ok,
            "cache_ok": cache_ok,
            "path": settings.storage_dir,
        },
    }
