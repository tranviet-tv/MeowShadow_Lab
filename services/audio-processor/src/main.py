"""Main FastAPI application for audio-processor microservice."""

from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings
from src.api.v1.router import api_router

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(settings.app_name)


import threading
from src.workers.consumer import AudioMasteringConsumer


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown routines."""
    logger.info("Starting up %s (version %s)...", settings.app_name, settings.app_version)
    settings.get_storage_path()

    # Start background Redis audio mastering worker daemon
    consumer = AudioMasteringConsumer()
    worker_thread = threading.Thread(target=consumer.run_worker, daemon=True, name="AudioMasteringWorkerThread")
    worker_thread.start()
    logger.info("AudioMasteringConsumer thread started successfully in background.")

    yield

    logger.info("Shutting down %s...", settings.app_name)
    consumer.stop()


# Initialize FastAPI instance
app = FastAPI(
    title="MeowShadow Audio Processor",
    description="Pacing, Digital Silence & EBU R128 Mastering Microservice",
    version=settings.app_version,
    lifespan=lifespan,
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint returning service identity."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
    }


@app.get("/health", tags=["Root"])
async def health_alias():
    """Top-level health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.main:app", host=settings.host, port=settings.port, reload=settings.debug)
