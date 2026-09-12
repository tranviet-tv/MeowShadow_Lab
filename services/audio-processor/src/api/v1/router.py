"""API v1 router configuration."""

from fastapi import APIRouter
from src.api.v1.endpoints import health, process

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(process.router, tags=["Audio Processing"])

