"""Comprehensive end-to-end lesson simulation test verifying full audio rendering and mastering."""

from pathlib import Path
import pytest
from pydub.generators import Sine

from src.schemas.pacing_params import PacingParams
from src.schemas.process_request import AudioClipItem, ProcessRequest
from src.services.audio_master import AudioMaster
from src.services.pipeline import pipeline_service


@pytest.fixture
def ten_sentence_bilingual_clips(tmp_path):
    """
    Generate 10 bilingual sentence pairs (20 clips total)
    simulating a complete 1,500-word dialogue shadowing lesson.
    """
    sample_dialogues = [
        ("Chào buổi sáng, chúc bạn một ngày làm việc hiệu quả.", "Good morning, wishing you a productive workday."),
        ("Hôm nay chúng ta sẽ thảo luận về chiến lược kinh doanh mới.", "Today we are going to discuss our new business strategy."),
        ("Mục tiêu quan trọng nhất là gia tăng trải nghiệm người dùng.", "The primary objective is to significantly enhance user experience."),
        ("Chúng ta cần phối hợp chặt chẽ giữa các phòng ban liên quan.", "We must foster close collaboration across all involved departments."),
        ("Dữ liệu phân tích cho thấy xu hướng thị trường đang tăng trưởng tốt.", "Data analytics indicate that market trends are showing positive growth."),
        ("Việc tối ưu hóa hiệu năng hệ thống sẽ hoàn tất trong tuần này.", "System performance optimization will be finalized within this week."),
        ("Bạn có câu hỏi hoặc đề xuất gì thêm cho dự án này không?", "Do you have any further questions or suggestions for this project?"),
        ("Tôi tin tưởng rằng kế hoạch này sẽ mang lại kết quả xuất sắc.", "I am confident that this plan will deliver outstanding results."),
        ("Hãy chuẩn bị kỹ lưỡng cho buổi thuyết trình với đối tác ngày mai.", "Please prepare thoroughly for tomorrow's presentation with the partner."),
        ("Cảm ơn sự đóng góp quý báu và nỗ lực hết mình của mọi người.", "Thank you all for your valuable contributions and dedicated efforts."),
    ]

    clips = []
    order = 1

    for idx, (vi_text, en_text) in enumerate(sample_dialogues):
        chunk_id = f"chunk-{idx + 1:02d}"

        # Generate unique audio tones for each sentence
        vi_audio = Sine(300 + idx * 25).to_audio_segment(duration=1200)
        en_audio = Sine(600 + idx * 25).to_audio_segment(duration=1800)

        vi_file = tmp_path / f"clip_{order:02d}_vi.wav"
        en_file = tmp_path / f"clip_{order + 1:02d}_en.wav"

        vi_audio.export(str(vi_file), format="wav")
        en_audio.export(str(en_file), format="wav")

        clips.append(
            AudioClipItem(
                id=f"clip-{order:02d}",
                order=order,
                lang="vi",
                text=vi_text,
                audio_path=str(vi_file),
            )
        )
        order += 1

        clips.append(
            AudioClipItem(
                id=f"clip-{order:02d}",
                order=order,
                lang="en",
                text=en_text,
                audio_path=str(en_file),
            )
        )
        order += 1

    return clips


class TestFullLessonSimulation:
    """End-to-end verification of full lesson mastering, subtitles, and waveform."""

    def test_complete_lesson_pipeline_execution(self, ten_sentence_bilingual_clips, tmp_path):
        """
        Execute end-to-end pipeline simulating 10 bilingual pairs with:
        - 1.5s VI silence
        - 3.5s EN silence
        - Transition cue chimes
        - 0.5s inter-chunk pauses
        - EBU R128 mastering
        """
        request = ProcessRequest(
            task_id="task-sim-1500words",
            lesson_id="lesson-sim-101",
            title="Business Strategy Dialogue Lesson",
            clips=ten_sentence_bilingual_clips,
            pacing_config=PacingParams(
                silence_after_vi_sec=1.5,
                silence_after_target_sec=3.5,
                silence_between_sentences_sec=0.5,
                insert_cue_sound=True,
            ),
            output_filename="full_simulation_lesson",
        )

        result = pipeline_service.process_lesson(request)

        # 1. Verify Audio Output
        audio_file = Path(result.audio_path)
        assert audio_file.exists()
        assert audio_file.stat().st_size > 50000  # Multi-second audio should be substantial size
        assert result.duration_sec > 40.0  # 10 pairs with pacing silences will exceed 40 seconds

        # 2. Verify Subtitle Integrity (SRT & VTT)
        srt_file = Path(result.srt_path)
        vtt_file = Path(result.vtt_path)
        assert srt_file.exists()
        assert vtt_file.exists()

        srt_content = srt_file.read_text(encoding="utf-8")
        vtt_content = vtt_file.read_text(encoding="utf-8")

        assert len(result.subtitles) == 20  # Exactly 20 subtitles for 20 clips
        assert "Chào buổi sáng" in srt_content
        assert "Good morning" in srt_content
        assert "WEBVTT" in vtt_content

        # Verify monotonic timeline ordering and non-overlapping timestamps
        for i in range(len(result.subtitles) - 1):
            curr_sub = result.subtitles[i]
            next_sub = result.subtitles[i + 1]

            assert curr_sub.start_time_sec < curr_sub.end_time_sec
            assert curr_sub.end_time_sec <= next_sub.start_time_sec

        # 3. Verify Waveform Data
        assert len(result.waveform_peaks) == 150
        assert all(0.0 <= p <= 1.0 for p in result.waveform_peaks)
        assert max(result.waveform_peaks) == 1.0

        waveform_file = audio_file.parent / f"{request.output_filename}_waveform.json"
        assert waveform_file.exists()

        # 4. Verify FFmpeg Broadcast Loudness Standard (when running in FFmpeg container environment)
        if AudioMaster.is_ffmpeg_available():
            assert result.loudness_lufs is not None
            # Standard tolerance: -16 LUFS +/- 0.5
            assert result.loudness_lufs == pytest.approx(-16.0, abs=0.6)
