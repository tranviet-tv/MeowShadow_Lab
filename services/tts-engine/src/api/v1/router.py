"""API v1 master router aggregating endpoints."""

from fastapi import APIRouter
from src.api.v1.endpoints import health, voices, synthesize, cache

api_router = APIRouter()

# Mount health routes
api_router.include_router(health.router)

# Mount voice catalog routes
api_router.include_router(voices.router)

# Mount synthesis routes
api_router.include_router(synthesize.router)

# Mount cache management routes
api_router.include_router(cache.router)


