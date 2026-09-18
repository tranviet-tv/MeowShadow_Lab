"""Unit tests for SP05-04: Redis TTS Worker and Progress Dispatcher."""

import json
from pathlib import Path
import tempfile
from unittest.mock import MagicMock, patch
import pytest

from src.workers.tts_worker import (
    TTSWorker,
    TTS_SYNTHESIS_QUEUE,
    TASK_EVENTS_CHANNEL,
)


def test_worker_initialization():
    """Verify worker default queue, channel, and address configurations."""
    worker = TTSWorker(redis_addr="localhost:6379")
    assert worker.queue_name == TTS_SYNTHESIS_QUEUE
    assert worker.events_channel == TASK_EVENTS_CHANNEL
    assert worker.running is False


def test_process_job_payload_with_progress():
    """Verify execution of job payload and invocation of progress callbacks."""
    worker = TTSWorker()
    progress_calls = []

    def on_progress(completed, total, percent):
        progress_calls.append((completed, total, percent))

    payload = {
        "lesson_id": "test-worker-lesson-1",
        "chunks": [
            {
                "id": "w1",
                "order": 0,
                "text": "Câu test worker một.",
                "voice_id": "vi-VN-HoaiMyNeural",
            },
            {
                "id": "w2",
                "order": 1,
                "text": "Câu test worker hai.",
                "voice_id": "vi-VN-NamMinhNeural",
            },
        ],
        "concurrency": 2,
    }

    result = worker.process_job_payload(json.dumps(payload), on_progress=on_progress)

    assert result["success"] is True
    assert result["lesson_id"] == "test-worker-lesson-1"
    assert result["total_chunks"] == 2
    assert result["successful_chunks"] == 2
    assert len(result["clips"]) == 2
    assert len(progress_calls) == 2
    # Progress percent should advance to 100.0%
    assert progress_calls[-1][2] == 100.0


def test_handle_task_success_events():
    """Verify handle_task emits TASK_STARTED, TASK_PROGRESS, and TASK_COMPLETED events."""
    worker = TTSWorker()
    mock_redis = MagicMock()
    worker.client = mock_redis

    payload = {
        "task_id": "job-abc-123",
        "lesson_id": "lesson-xyz-789",
        "chunks": [
            {
                "id": "ch1",
                "order": 0,
                "text": "Thử nghiệm phát sự kiện tiến độ.",
                "voice_id": "vi-VN-HoaiMyNeural",
            }
        ],
    }

    worker.handle_task(json.dumps(payload))

    # Inspect published events
    assert mock_redis.publish.call_count >= 3  # STARTED, PROGRESS, COMPLETED
    published_events = [
        json.loads(call[0][1]) for call in mock_redis.publish.call_args_list
    ]

    event_types = [e["event"] for e in published_events]
    assert "TASK_STARTED" in event_types
    assert "TASK_PROGRESS" in event_types
    assert "TASK_COMPLETED" in event_types

    completed_event = next(e for e in published_events if e["event"] == "TASK_COMPLETED")
    assert completed_event["task_id"] == "job-abc-123"
    assert completed_event["status"] == "success"
    assert completed_event["result"]["total_chunks"] == 1


def test_handle_task_failure_events():
    """Verify handle_task publishes TASK_FAILED upon invalid payload or unhandled exception."""
    worker = TTSWorker()
    mock_redis = MagicMock()
    worker.client = mock_redis

    corrupted_payload = "NOT_A_VALID_JSON"

    worker.handle_task(corrupted_payload)

    assert mock_redis.publish.call_count == 1
    call_args = mock_redis.publish.call_args_list[0][0]
    channel, raw_event = call_args
    assert channel == TASK_EVENTS_CHANNEL

    event = json.loads(raw_event)
    assert event["event"] == "TASK_FAILED"
    assert event["status"] == "failed"
    assert "error" in event


def test_process_job_payload_kokoro_routing():
    """Verify execution of job payload with Kokoro engine routes to Kokoro WAV clips."""
    worker = TTSWorker()
    payload = {
        "lesson_id": "test-kokoro-worker-lesson",
        "engine": "kokoro",
        "chunks": [
            {
                "id": "kw1",
                "order": 0,
                "text": "Hello from Kokoro worker routing test.",
                "voice_id": "kokoro-en-female-bella",
            },
        ],
        "concurrency": 1,
    }

    result = worker.process_job_payload(json.dumps(payload))
    assert result["success"] is True
    assert result["total_chunks"] == 1
    assert len(result["clips"]) == 1
    assert result["clips"][0]["file_path"].endswith(".wav")

