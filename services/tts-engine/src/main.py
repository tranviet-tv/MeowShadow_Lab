"""Main FastAPI application entrypoint for tts-engine microservice."""

from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings
from src.api.v1.router import api_router

# Configure service logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(settings.app_name)


import threading
from src.workers.tts_worker import tts_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager handling startup and shutdown procedures."""
    logger.info("Starting up %s (v%s)...", settings.app_name, settings.app_version)
    settings.get_storage_path()
    settings.get_cache_dir()
    settings.get_audio_dir()

    # Start background Redis TTS synthesis worker daemon
    worker_thread = threading.Thread(target=tts_worker.run, daemon=True, name="TTSWorkerThread")
    worker_thread.start()
    logger.info("TTSWorker thread started successfully in background.")

    yield

    logger.info("Shutting down %s...", settings.app_name)
    tts_worker.stop()


app = FastAPI(
    title="MeowShadow TTS Engine",
    description="Multi-engine speech synthesis service with Edge-TTS and MD5 Smart Caching",
    version=settings.app_version,
    lifespan=lifespan,
)

# Enable CORS for cross-origin web/mobile integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
async def root():
    """Service root identification endpoint."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
    }


@app.get("/health", tags=["Root"])
async def root_health():
    """Top-level health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
    }
