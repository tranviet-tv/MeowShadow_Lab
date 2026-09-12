"""Unit tests for AudioMasteringConsumer Redis worker."""

import json
from unittest.mock import MagicMock, patch
import pytest
from pydub.generators import Sine

from src.workers.consumer import AudioMasteringConsumer


@pytest.fixture
def sample_clips(tmp_path):
    """Generate two sample WAV audio files."""
    audio_vi = Sine(440).to_audio_segment(duration=500)
    audio_en = Sine(880).to_audio_segment(duration=800)

    path_vi = tmp_path / "vi_clip.wav"
    path_en = tmp_path / "en_clip.wav"
    audio_vi.export(str(path_vi), format="wav")
    audio_en.export(str(path_en), format="wav")

    return [
        {
            "id": "clip-vi-01",
            "order": 1,
            "lang": "vi",
            "text": "Chúc một ngày tốt lành.",
            "audio_path": str(path_vi),
        },
        {
            "id": "clip-en-01",
            "order": 2,
            "lang": "en",
            "text": "Have a nice day.",
            "audio_path": str(path_en),
        },
    ]


class TestAudioMasteringConsumer:
    """Test suite for Redis worker consumer logic."""

    def test_process_job_payload(self, sample_clips):
        """Test direct job payload parsing and execution."""
        consumer = AudioMasteringConsumer()

        payload = {
            "task_id": "task-worker-01",
            "lesson_id": "lesson-worker-01",
            "clips": sample_clips,
            "pacing_config": {
                "silence_after_vi_sec": 0.5,
                "silence_after_target_sec": 0.8,
                "insert_cue_sound": False,
            },
        }

        result = consumer.process_job_payload(json.dumps(payload))
        assert result["task_id"] == "task-worker-01"
        assert result["lesson_id"] == "lesson-worker-01"
        assert result["duration_sec"] > 0
        assert len(result["subtitles"]) == 2

    @patch("redis.Redis")
    def test_handle_task_success_publishes_event(self, mock_redis_cls, sample_clips):
        """Verify successful processing publishes TASK_COMPLETED event."""
        mock_redis = MagicMock()
        mock_redis_cls.return_value = mock_redis

        consumer = AudioMasteringConsumer()
        consumer.client = mock_redis

        payload = {
            "task_id": "task-success-99",
            "lesson_id": "lesson-99",
            "clips": sample_clips,
            "pacing_config": {"insert_cue_sound": False},
        }

        consumer.handle_task(json.dumps(payload))

        assert mock_redis.publish.called
        channel_arg, message_arg = mock_redis.publish.call_args[0]
        assert channel_arg == "channel:task_events"
        event = json.loads(message_arg)
        assert event["event"] == "TASK_COMPLETED"
        assert event["task_id"] == "task-success-99"
        assert event["status"] == "success"

    @patch("redis.Redis")
    def test_handle_task_failure_publishes_error_event(self, mock_redis_cls):
        """Verify processing failure publishes TASK_FAILED event."""
        mock_redis = MagicMock()
        mock_redis_cls.return_value = mock_redis

        consumer = AudioMasteringConsumer()
        consumer.client = mock_redis

        # Invalid payload with missing files
        payload = {
            "task_id": "task-fail-01",
            "lesson_id": "lesson-fail",
            "clips": [
                {
                    "id": "c1",
                    "order": 1,
                    "lang": "vi",
                    "text": "Fail test",
                    "audio_path": "/missing/file.wav",
                }
            ],
        }

        consumer.handle_task(json.dumps(payload))

        assert mock_redis.publish.called
        channel_arg, message_arg = mock_redis.publish.call_args[0]
        event = json.loads(message_arg)
        assert event["event"] == "TASK_FAILED"
        assert event["task_id"] == "task-fail-01"
        assert event["status"] == "failed"
