from fastapi import APIRouter
from src.api.v1.endpoints import health, parse, translate, estimate

api_router = APIRouter()

# Register health check endpoints
api_router.include_router(health.router, tags=["Health"])

# Register script parser endpoints
api_router.include_router(parse.router, tags=["Parser"])

# Register LLM translation and chunking endpoints
api_router.include_router(translate.router, tags=["LLM Pipeline"])

# Register audio duration and pacing estimation endpoints
api_router.include_router(estimate.router, tags=["Pacing Estimator"])
