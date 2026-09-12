"""Cache statistics and management endpoints."""

from fastapi import APIRouter
from src.services.cache_manager import cache_manager

router = APIRouter(prefix="/cache", tags=["Cache"])


@router.get("/stats")
async def get_cache_stats():
    """Retrieve current cache statistics including hit ratio and total saved bytes."""
    return {
        "success": True,
        "data": cache_manager.get_stats(),
    }


@router.delete("/clear")
async def clear_cache_endpoint():
    """Purge all cached audio clips."""
    deleted_count = cache_manager.clear_cache()
    return {
        "success": True,
        "message": f"Successfully purged {deleted_count} cached audio files.",
        "deleted_count": deleted_count,
    }
