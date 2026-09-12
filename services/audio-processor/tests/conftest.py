"""Pytest configuration and shared test fixtures."""

import os
import sys
from pathlib import Path
import pytest

# Ensure src directory is on sys.path for test resolution
current_dir = Path(__file__).resolve().parent
service_root = current_dir.parent
if str(service_root) not in sys.path:
    sys.path.insert(0, str(service_root))

from src.services.silence_generator import SilenceGenerator, silence_generator


@pytest.fixture
def generator() -> SilenceGenerator:
    """Fixture providing a clean SilenceGenerator instance."""
    return silence_generator
