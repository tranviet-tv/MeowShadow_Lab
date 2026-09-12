"""Asynchronous HTTP client for communicating with Ollama Qwen 3 8B backend."""

import json
import logging
import re
from typing import Any, Dict, Optional
import httpx
from src.config import settings
from src.core.exceptions import OllamaServiceError

logger = logging.getLogger(settings.app_name)


class OllamaClient:
    """Async client interacting with local or containerized Ollama API."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        self.base_url = (base_url or settings.ollama_host).rstrip("/")
        self.default_model = model or settings.llm_model
        self.timeout = timeout or settings.llm_timeout_seconds

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        format_json: bool = False,
    ) -> str:
        """Call Ollama /api/generate endpoint asynchronously."""
        target_model = model or self.default_model
        payload: Dict[str, Any] = {
            "model": target_model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": settings.llm_temperature,
            },
        }
        if system_prompt:
            payload["system"] = system_prompt
        if format_json:
            payload["format"] = "json"

        endpoint = f"{self.base_url}/api/generate"
        logger.debug("Dispatching generation request to Ollama (%s) model=%s", endpoint, target_model)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(endpoint, json=payload)
                if response.status_code != 200:
                    logger.error("Ollama API responded with status %d: %s", response.status_code, response.text)
                    raise OllamaServiceError(
                        detail=f"Ollama error ({response.status_code}): {response.text}",
                        extra={"status_code": response.status_code, "model": target_model},
                    )

                data = response.json()
                return data.get("response", "").strip()

        except httpx.RequestError as exc:
            logger.warning("Failed to connect to Ollama at %s: %s", self.base_url, str(exc))
            raise OllamaServiceError(
                detail=f"Failed to connect to Ollama at {self.base_url}: {str(exc)}",
                extra={"endpoint": endpoint, "error": str(exc)},
            ) from exc

    @staticmethod
    def extract_json(raw_response: str) -> Dict[str, Any]:
        """Extract and parse JSON object from LLM response text."""
        # Strip potential markdown code fence wrappers
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw_response.strip(), flags=re.MULTILINE)
        cleaned = re.sub(r"```$", "", cleaned.strip(), flags=re.MULTILINE).strip()

        # Find first '{' and last '}'
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            cleaned = cleaned[start : end + 1]

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as err:
            logger.error("Failed to parse JSON from response: %s (raw=%s)", str(err), raw_response)
            raise ValueError(f"Invalid JSON returned from model: {str(err)}") from err
