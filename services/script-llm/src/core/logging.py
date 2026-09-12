"""Structured logging configuration for script-llm service."""

import logging
import sys
from src.config import settings


def setup_logging() -> logging.Logger:
    """Configure standard logging with format and level based on settings."""
    log_level = logging.DEBUG if settings.debug else logging.INFO

    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s (%(filename)s:%(lineno)d): %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.setLevel(log_level)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Avoid duplicate handlers if already configured
    if not root_logger.handlers:
        root_logger.addHandler(handler)

    service_logger = logging.getLogger(settings.app_name)
    return service_logger
