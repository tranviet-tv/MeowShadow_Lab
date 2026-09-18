"""Tests for ScriptWorker background queue and pubsub processing."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.workers.script_worker import ScriptWorker
from src.schemas.script_response import AutoChunkTranslateResponse
from src.schemas.chunk import ScriptChunk


def test_script_worker_handle_payload_success():
    """Verify ScriptWorker processes job payload and publishes TASK_COMPLETED."""
    worker = ScriptWorker(redis_addr="localhost:6379")
    mock_redis = MagicMock()
    worker.client = mock_redis

    mock_chunks = [
        ScriptChunk(id="c1", order=0, lang="vi", text="Xin chào."),
        ScriptChunk(id="c2", order=1, lang="en", text="Hello."),
    ]
    mock_response = AutoChunkTranslateResponse(
        success=True,
        formatted_script="[VI] Xin chào.\n[EN] Hello.",
        chunks=mock_chunks,
        pairs=[],
        word_count=2,
        estimated_duration_sec=1.5,
    )

    with patch.object(worker.pipeline, "auto_chunk_and_translate", new_callable=AsyncMock) as mock_chunk_method:
        mock_chunk_method.return_value = mock_response

        raw_payload = json.dumps({
            "task_id": "test_task_123",
            "lesson_id": "lesson_456",
            "source_text": "Xin chào.",
            "target_language": "en",
        })
        worker.handle_task_payload(raw_payload)

    assert mock_redis.publish.call_count == 2
    # First call: TASK_STARTED
    call1_args = json.loads(mock_redis.publish.call_args_list[0][0][1])
    assert call1_args["event"] == "TASK_STARTED"
    assert call1_args["task_id"] == "test_task_123"

    # Second call: TASK_COMPLETED
    call2_args = json.loads(mock_redis.publish.call_args_list[1][0][1])
    assert call2_args["event"] == "TASK_COMPLETED"
    assert call2_args["task_id"] == "test_task_123"
    assert len(call2_args["result"]["chunks"]) == 2
