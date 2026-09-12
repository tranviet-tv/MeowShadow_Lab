"""Health check endpoints for container and service monitoring."""

from typing import Dict, Any
import httpx
from fastapi import APIRouter
from src.config import settings

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check() -> Dict[str, Any]:
    """Detailed health check including Ollama connectivity probe."""
    ollama_reachable = False
    models_available = []

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{settings.ollama_host}/api/tags")
            if resp.status_code == 200:
                ollama_reachable = True
                data = resp.json()
                models_available = [m.get("name") for m in data.get("models", [])]
    except Exception:
        ollama_reachable = False

    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "llm_model": settings.llm_model,
        "ollama_host": settings.ollama_host,
        "ollama_reachable": ollama_reachable,
        "available_models": models_available,
    }
