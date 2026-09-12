"""Custom service exceptions and error handling utilities."""

from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class ScriptLLMException(HTTPException):
    """Base exception class for script-llm service errors."""

    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: str = "An internal error occurred in script-llm service",
        extra: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.extra = extra or {}


class TagParsingError(ScriptLLMException):
    """Raised when parsing syntax tags fails or produces invalid chunks."""

    def __init__(self, detail: str = "Failed to parse script tags", extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            extra=extra,
        )


class OllamaServiceError(ScriptLLMException):
    """Raised when communication with Ollama backend fails or times out."""

    def __init__(self, detail: str = "Ollama service unavailable or returned an error", extra: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
            extra=extra,
        )
