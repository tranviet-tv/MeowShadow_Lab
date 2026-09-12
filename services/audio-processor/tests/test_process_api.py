"""Integration tests for POST /api/v1/process endpoint."""

from pathlib import Path
import pytest
from pydub.generators import Sine
from starlette.testclient import TestClient

from src.main import app


@pytest.fixture
def test_client() -> TestClient:
    """FastAPI TestClient fixture."""
    return TestClient(app)


@pytest.fixture
def sample_clips(tmp_path):
    """Generate two sample WAV audio files."""
    audio_vi = Sine(440).to_audio_segment(duration=1000)
    audio_en = Sine(880).to_audio_segment(duration=1500)

    path_vi = tmp_path / "vi_clip.wav"
    path_en = tmp_path / "en_clip.wav"
    audio_vi.export(str(path_vi), format="wav")
    audio_en.export(str(path_en), format="wav")

    return [
        {
            "id": "clip-vi-001",
            "order": 1,
            "lang": "vi",
            "text": "Kiến tha lâu đầy tổ.",
            "audio_path": str(path_vi),
        },
        {
            "id": "clip-en-001",
            "order": 2,
            "lang": "en",
            "text": "Many a little makes a mickle.",
            "audio_path": str(path_en),
        },
    ]


class TestProcessEndpoint:
    """Test suite for /api/v1/process endpoint."""

    def test_process_audio_success(self, test_client, sample_clips, tmp_path):
        """Verify successful end-to-end processing returns 200 and expected payload."""
        payload = {
            "task_id": "task-test-123",
            "lesson_id": "lesson-test-456",
            "title": "Proverbs Lesson",
            "clips": sample_clips,
            "pacing_config": {
                "silence_after_vi_sec": 1.0,
                "silence_after_target_sec": 1.5,
                "insert_cue_sound": False,
            },
            "output_filename": "test_output_master",
        }

        response = test_client.post("/api/v1/process", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["task_id"] == "task-test-123"
        assert data["lesson_id"] == "lesson-test-456"
        assert data["duration_sec"] > 0

        # Check file outputs
        assert Path(data["audio_path"]).exists()
        assert Path(data["srt_path"]).exists()
        assert Path(data["vtt_path"]).exists()

        # Check subtitle markers
        assert len(data["subtitles"]) == 2
        assert data["subtitles"][0]["lang"] == "vi"
        assert data["subtitles"][0]["text"] == "Kiến tha lâu đầy tổ."
        assert data["subtitles"][1]["lang"] == "en"

        # Check waveform peaks
        assert len(data["waveform_peaks"]) > 50
        assert all(0.0 <= p <= 1.0 for p in data["waveform_peaks"])

    def test_process_empty_clips_validation_error(self, test_client):
        """Submitting empty clips list must return 422 Unprocessable Entity."""
        payload = {
            "lesson_id": "lesson-fail",
            "clips": [],
        }
        response = test_client.post("/api/v1/process", json=payload)
        assert response.status_code == 422

    def test_process_missing_file_returns_404(self, test_client):
        """Referencing a nonexistent audio file must return 404 Not Found."""
        payload = {
            "lesson_id": "lesson-missing",
            "clips": [
                {
                    "id": "clip-01",
                    "order": 1,
                    "lang": "vi",
                    "text": "Câu bị thiếu file.",
                    "audio_path": "/nonexistent/path/file.wav",
                }
            ],
        }
        response = test_client.post("/api/v1/process", json=payload)
        assert response.status_code == 404
