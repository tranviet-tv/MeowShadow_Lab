"""API v1 centralized router configuration."""

from fastapi import APIRouter
from src.api.v1.endpoints import health

api_router = APIRouter()

# Register health check endpoints
api_router.include_router(health.router, tags=["Health"])
