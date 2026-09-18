"""Main FastAPI application entrypoint for script-llm microservice."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings
from src.core.logging import setup_logging
from src.api.v1.router import api_router

from src.workers.script_worker import ScriptWorker

logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown lifecycle events."""
    logger.info("Starting %s (v%s) on %s:%d...", settings.app_name, settings.app_version, settings.host, settings.port)
    logger.info("Configured Ollama backend: %s (model: %s)", settings.ollama_host, settings.llm_model)

    # Start background Redis script worker
    worker = ScriptWorker()
    worker.start_background()

    yield

    logger.info("Shutting down %s...", settings.app_name)
    worker.stop()



app = FastAPI(
    title="MeowShadow Script-LLM Worker",
    description="Multilingual syntax parser, Shadowing chunker & Ollama Qwen 3 8B NLP Pipeline",
    version=settings.app_version,
    lifespan=lifespan,
)

# Enable CORS for frontend and internal microservice requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 endpoints
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
async def root():
    """Service identification endpoint."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "model": settings.llm_model,
    }


@app.get("/health", tags=["Root"])
async def root_health():
    """Top-level health check endpoint for Docker and load balancers."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
    }
