"""Audio mastering pipeline orchestrating pacing, mastering, subtitles, and waveform."""

import logging
import uuid
from pathlib import Path
from typing import Optional

from src.config import settings
from src.schemas.mastering_result import MasteringResult, SubtitleItem as SchemaSubtitleItem
from src.schemas.process_request import ProcessRequest
from src.services.audio_master import audio_master
from src.services.pacing_builder import pacing_builder
from src.services.subtitle_engine import subtitle_engine
from src.services.waveform_builder import waveform_builder

logger = logging.getLogger(__name__)


class AudioPipelineService:
    """Coordinates full audio processing cycle for shadowing lessons."""

    def process_lesson(self, request: ProcessRequest) -> MasteringResult:
        """
        Execute end-to-end processing pipeline:
        1. Pacing & silence assembly.
        2. EBU R128 (-16 LUFS) mastering with fade in/out.
        3. Synchronized SRT and WebVTT subtitle generation.
        4. Downsampled waveform peaks extraction.

        :param request: ProcessRequest DTO.
        :return: MasteringResult containing file paths and metadata.
        """
        lesson_id = request.lesson_id or f"lesson_{uuid.uuid4().hex[:12]}"
        base_name = request.output_filename or f"lesson_{lesson_id}"

        # Prepare storage directories
        storage_dir = settings.get_storage_path()
        audio_dir = storage_dir / "audio"
        subs_dir = storage_dir / "subtitles"
        audio_dir.mkdir(parents=True, exist_ok=True)
        subs_dir.mkdir(parents=True, exist_ok=True)

        output_audio_path = audio_dir / f"{base_name}.{settings.default_export_format}"
        output_srt_path = subs_dir / f"{base_name}.srt"
        output_vtt_path = subs_dir / f"{base_name}.vtt"
        output_waveform_path = audio_dir / f"{base_name}_waveform.json"

        logger.info(
            "Starting audio processing for lesson '%s' with %d clips",
            lesson_id,
            len(request.clips),
        )

        # 1. Assemble pacing sequence with accurate timeline
        pacing_result = pacing_builder.build_pacing(
            clips=request.clips,
            pacing_config=request.pacing_config,
        )

        # 2. Apply EBU R128 loudnorm mastering and fade in/out
        master_metadata = audio_master.master_audio(
            audio_input=pacing_result.combined_audio,
            output_path=output_audio_path,
            target_lufs=settings.default_target_lufs,
            fade_in_sec=0.5,
            fade_out_sec=1.0,
            bitrate=settings.default_audio_bitrate,
        )

        # 3. Generate subtitles
        subtitle_records = subtitle_engine.extract_subtitles_from_timeline(
            timeline=pacing_result.timeline,
            hold_during_silence=False,
        )
        subtitle_engine.export_srt_file(subtitle_records, output_srt_path)
        subtitle_engine.export_vtt_file(subtitle_records, output_vtt_path)

        # 4. Extract downsampled waveform peaks
        peaks = waveform_builder.generate_peaks(
            audio_input=master_metadata.output_path,
            target_peaks=150,
            normalize=True,
        )
        waveform_builder.export_waveform_json(
            peaks=peaks,
            duration_sec=master_metadata.duration_sec,
            output_path=output_waveform_path,
        )

        # Map subtitle items to response schema
        schema_subtitles = [
            SchemaSubtitleItem(
                id=s.id,
                start_time_sec=s.start_time_sec,
                end_time_sec=s.end_time_sec,
                lang=s.lang,
                text=s.text,
            )
            for s in subtitle_records
        ]

        logger.info(
            "Audio pipeline completed for lesson '%s'. Duration: %.2fs, LUFS: %.1f",
            lesson_id,
            master_metadata.duration_sec,
            master_metadata.integrated_lufs,
        )

        return MasteringResult(
            task_id=request.task_id,
            lesson_id=request.lesson_id,
            audio_path=str(output_audio_path),
            srt_path=str(output_srt_path),
            vtt_path=str(output_vtt_path),
            duration_sec=round(master_metadata.duration_sec, 3),
            waveform_peaks=peaks,
            subtitles=schema_subtitles,
            loudness_lufs=master_metadata.integrated_lufs,
        )


pipeline_service = AudioPipelineService()
