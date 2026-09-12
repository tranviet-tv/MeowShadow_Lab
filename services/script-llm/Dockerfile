# Use official lightweight Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

# Copy dependency requirements
COPY services/script-llm/requirements.txt /app/requirements.txt

# Install Python packages
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy service source code
COPY services/script-llm /app

# Ensure proper non-root ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose microservice HTTP port
EXPOSE 8001

# Health check endpoint
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Launch FastAPI server
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
