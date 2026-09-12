from fastapi import APIRouter
from src.api.v1.endpoints import health, parse

api_router = APIRouter()

# Register health check endpoints
api_router.include_router(health.router, tags=["Health"])

# Register script parser endpoints
api_router.include_router(parse.router, tags=["Parser"])
