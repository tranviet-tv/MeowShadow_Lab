# Use official lightweight Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR /app

# Install system dependencies including FFmpeg 6+ and libsndfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

# Copy dependency requirements
COPY services/audio-processor/requirements.txt /app/requirements.txt

# Install Python packages
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy source code and test suite
COPY services/audio-processor /app

# Ensure correct permissions
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose microservice HTTP port
EXPOSE 8003

# Health check endpoint
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8003/api/v1/health || exit 1

# Launch FastAPI server
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8003"]
