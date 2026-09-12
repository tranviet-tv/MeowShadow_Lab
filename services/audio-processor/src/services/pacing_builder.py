"""Shadowing pacing builder algorithm and timeline tracking engine."""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import List, Optional, Tuple, Union
from pydub import AudioSegment

from src.config import settings
from src.schemas.pacing_params import PacingParams
from src.schemas.process_request import AudioClipItem
from src.services.cue_sound import CueSoundService, cue_sound_service
from src.services.silence_generator import SilenceGenerator, silence_generator


class SegmentType(str, Enum):
    """Categorical classification of timeline segments."""

    SOURCE_SENTENCE = "source_sentence"
    VI_SILENCE = "vi_silence"
    CUE_CHIME = "cue_chime"
    TARGET_SENTENCE = "target_sentence"
    TARGET_SILENCE = "target_silence"
    INTER_CHUNK_PAUSE = "inter_chunk_pause"


@dataclass
class TimelineSegment:
    """Accurate timeline representation for a single audio block."""

    segment_type: SegmentType
    start_ms: int
    end_ms: int
    duration_ms: int
    lang: Optional[str] = None
    text: Optional[str] = None
    chunk_id: Optional[str] = None
    order: Optional[int] = None

    @property
    def start_sec(self) -> float:
        """Start timestamp in seconds."""
        return self.start_ms / 1000.0

    @property
    def end_sec(self) -> float:
        """End timestamp in seconds."""
        return self.end_ms / 1000.0


@dataclass
class PacingBuildResult:
    """Output containing assembled master audio segment and comprehensive timeline."""

    combined_audio: AudioSegment
    timeline: List[TimelineSegment] = field(default_factory=list)
    total_duration_ms: int = 0
    total_duration_sec: float = 0.0
    pairs_count: int = 0
    chunks_count: int = 0


@dataclass
class _ClipPair:
    """Internal container for paired Vietnamese and Foreign language clips."""

    vi_clip: Optional[AudioClipItem] = None
    target_clip: Optional[AudioClipItem] = None


class PacingBuilder:
    """Core pacing builder synthesizing interleaved Shadowing audio sequences."""

    def __init__(
        self,
        silence_svc: Optional[SilenceGenerator] = None,
        cue_svc: Optional[CueSoundService] = None,
    ):
        self.silence_generator = silence_svc or silence_generator
        self.cue_service = cue_svc or cue_sound_service

    def build_pacing(
        self,
        clips: List[AudioClipItem],
        pacing_config: Optional[PacingParams] = None,
    ) -> PacingBuildResult:
        """
        Assemble list of audio clips into a unified Shadowing sequence.

        Sequencing format:
        [VI Clip] -> [1.5s Silence] -> [Optional Chime] -> [Target Clip] -> [3.5s Silence] -> [0.5s Pause]

        :param clips: Collection of synthesized audio clips.
        :param pacing_config: Timing parameters (defaults to standard values if omitted).
        :return: PacingBuildResult with combined AudioSegment and timeline markers.
        """
        if not clips:
            raise ValueError("No audio clips provided for pacing assembly")

        config = pacing_config or PacingParams()
        pairs = self._group_clips_into_pairs(clips)
        return self._assemble_pairs(pairs, config)

    def build_pacing_from_segments(
        self,
        pairs: List[Tuple[Optional[AudioSegment], Optional[AudioSegment]]],
        pacing_config: Optional[PacingParams] = None,
        metadata: Optional[List[Tuple[Optional[dict], Optional[dict]]]] = None,
    ) -> PacingBuildResult:
        """
        Assemble pre-loaded AudioSegment pairs directly from memory.

        :param pairs: List of (vi_segment, target_segment) tuples.
        :param pacing_config: Timing configuration.
        :param metadata: Optional metadata matching segments [(vi_meta, target_meta), ...].
        :return: PacingBuildResult.
        """
        if not pairs:
            raise ValueError("No audio segment pairs provided for pacing assembly")

        config = pacing_config or PacingParams()
        combined = AudioSegment.empty()
        timeline: List[TimelineSegment] = []
        current_cursor_ms = 0

        for pair_idx, (vi_seg, target_seg) in enumerate(pairs):
            is_last_pair = pair_idx == len(pairs) - 1
            vi_meta = metadata[pair_idx][0] if metadata and pair_idx < len(metadata) else None
            target_meta = metadata[pair_idx][1] if metadata and pair_idx < len(metadata) else None

            # 1. Vietnamese audio segment
            if vi_seg is not None and len(vi_seg) > 0:
                normalized_vi = self._standardize_segment(vi_seg)
                dur = len(normalized_vi)
                combined += normalized_vi
                timeline.append(
                    TimelineSegment(
                        segment_type=SegmentType.SOURCE_SENTENCE,
                        start_ms=current_cursor_ms,
                        end_ms=current_cursor_ms + dur,
                        duration_ms=dur,
                        lang=vi_meta.get("lang", "vi") if vi_meta else "vi",
                        text=vi_meta.get("text") if vi_meta else None,
                        chunk_id=vi_meta.get("id") if vi_meta else None,
                        order=vi_meta.get("order") if vi_meta else None,
                    )
                )
                current_cursor_ms += dur

                # 2. Silence after Vietnamese sentence (context shift)
                silence_vi = self.silence_generator.generate_vi_silence(
                    duration_sec=config.silence_after_vi_sec,
                    sample_rate=settings.sample_rate,
                    channels=settings.channels,
                )
                dur_silence_vi = len(silence_vi)
                if dur_silence_vi > 0:
                    combined += silence_vi
                    timeline.append(
                        TimelineSegment(
                            segment_type=SegmentType.VI_SILENCE,
                            start_ms=current_cursor_ms,
                            end_ms=current_cursor_ms + dur_silence_vi,
                            duration_ms=dur_silence_vi,
                        )
                    )
                    current_cursor_ms += dur_silence_vi

                # 3. Optional cue chime before foreign sentence
                if config.insert_cue_sound:
                    cue_segment = self.cue_service.get_cue_sound(
                        cue_name=config.cue_sound_type,
                        sample_rate=settings.sample_rate,
                        channels=settings.channels,
                    )
                    dur_cue = len(cue_segment)
                    combined += cue_segment
                    timeline.append(
                        TimelineSegment(
                            segment_type=SegmentType.CUE_CHIME,
                            start_ms=current_cursor_ms,
                            end_ms=current_cursor_ms + dur_cue,
                            duration_ms=dur_cue,
                        )
                    )
                    current_cursor_ms += dur_cue

            # 4. Target foreign language audio segment
            if target_seg is not None and len(target_seg) > 0:
                normalized_target = self._standardize_segment(target_seg)
                dur_target = len(normalized_target)
                combined += normalized_target
                timeline.append(
                    TimelineSegment(
                        segment_type=SegmentType.TARGET_SENTENCE,
                        start_ms=current_cursor_ms,
                        end_ms=current_cursor_ms + dur_target,
                        duration_ms=dur_target,
                        lang=target_meta.get("lang", "en") if target_meta else "en",
                        text=target_meta.get("text") if target_meta else None,
                        chunk_id=target_meta.get("id") if target_meta else None,
                        order=target_meta.get("order") if target_meta else None,
                    )
                )
                current_cursor_ms += dur_target

                # 5. Silence after foreign sentence (golden shadowing echo)
                silence_target = self.silence_generator.generate_target_silence(
                    duration_sec=config.silence_after_target_sec,
                    sample_rate=settings.sample_rate,
                    channels=settings.channels,
                )
                dur_silence_target = len(silence_target)
                if dur_silence_target > 0:
                    combined += silence_target
                    timeline.append(
                        TimelineSegment(
                            segment_type=SegmentType.TARGET_SILENCE,
                            start_ms=current_cursor_ms,
                            end_ms=current_cursor_ms + dur_silence_target,
                            duration_ms=dur_silence_target,
                        )
                    )
                    current_cursor_ms += dur_silence_target

            # 6. Inter-chunk pause between sentence blocks (applied to all except tail)
            if not is_last_pair:
                silence_inter = self.silence_generator.generate_inter_chunk_silence(
                    duration_sec=config.silence_between_sentences_sec,
                    sample_rate=settings.sample_rate,
                    channels=settings.channels,
                )
                dur_inter = len(silence_inter)
                if dur_inter > 0:
                    combined += silence_inter
                    timeline.append(
                        TimelineSegment(
                            segment_type=SegmentType.INTER_CHUNK_PAUSE,
                            start_ms=current_cursor_ms,
                            end_ms=current_cursor_ms + dur_inter,
                            duration_ms=dur_inter,
                        )
                    )
                    current_cursor_ms += dur_inter

        total_ms = len(combined)
        return PacingBuildResult(
            combined_audio=combined,
            timeline=timeline,
            total_duration_ms=total_ms,
            total_duration_sec=total_ms / 1000.0,
            pairs_count=len(pairs),
            chunks_count=sum(
                (1 if p[0] is not None else 0) + (1 if p[1] is not None else 0) for p in pairs
            ),
        )

    def _assemble_pairs(
        self,
        pairs: List[_ClipPair],
        config: PacingParams,
    ) -> PacingBuildResult:
        """Load audio files for clip pairs and assemble sequence."""
        loaded_pairs: List[Tuple[Optional[AudioSegment], Optional[AudioSegment]]] = []
        metadata: List[Tuple[Optional[dict], Optional[dict]]] = []

        for pair in pairs:
            vi_audio = self._load_clip_audio(pair.vi_clip) if pair.vi_clip else None
            target_audio = self._load_clip_audio(pair.target_clip) if pair.target_clip else None

            vi_meta = (
                {
                    "id": pair.vi_clip.id,
                    "order": pair.vi_clip.order,
                    "lang": pair.vi_clip.lang,
                    "text": pair.vi_clip.text,
                }
                if pair.vi_clip
                else None
            )

            target_meta = (
                {
                    "id": pair.target_clip.id,
                    "order": pair.target_clip.order,
                    "lang": pair.target_clip.lang,
                    "text": pair.target_clip.text,
                }
                if pair.target_clip
                else None
            )

            loaded_pairs.append((vi_audio, target_audio))
            metadata.append((vi_meta, target_meta))

        return self.build_pacing_from_segments(loaded_pairs, config, metadata)

    def _group_clips_into_pairs(self, clips: List[AudioClipItem]) -> List[_ClipPair]:
        """
        Group flat list of clips into ordered pairs: [VI] -> [EN/JA].

        Handles natural alternation, orphan VI clips, and orphan target clips gracefully.
        """
        sorted_clips = sorted(clips, key=lambda c: c.order)
        pairs: List[_ClipPair] = []
        current_pair: Optional[_ClipPair] = None

        for clip in sorted_clips:
            if clip.lang == "vi":
                # If existing pair already has a VI clip waiting, commit it as a single VI pair
                if current_pair and current_pair.vi_clip is not None:
                    pairs.append(current_pair)
                current_pair = _ClipPair(vi_clip=clip)
            else:
                # Target language clip (en or ja)
                if current_pair and current_pair.vi_clip is not None:
                    current_pair.target_clip = clip
                    pairs.append(current_pair)
                    current_pair = None
                else:
                    # Target clip without preceding VI clip
                    pairs.append(_ClipPair(target_clip=clip))

        if current_pair is not None:
            pairs.append(current_pair)

        return pairs

    def _load_clip_audio(self, clip: AudioClipItem) -> AudioSegment:
        """Resolve and load audio clip from filesystem with format standardization."""
        file_path = self._resolve_file_path(clip.audio_path)
        if not file_path.exists() or not file_path.is_file():
            raise FileNotFoundError(f"Audio file for clip {clip.id} not found: {clip.audio_path}")

        segment = AudioSegment.from_file(str(file_path))
        return self._standardize_segment(segment)

    def _resolve_file_path(self, raw_path: str) -> Path:
        """Resolve candidate path relative to repository root or storage directory."""
        path = Path(raw_path)
        if path.is_absolute() and path.exists():
            return path
        if path.exists():
            return path
        storage_candidate = Path(settings.storage_dir) / raw_path
        if storage_candidate.exists():
            return storage_candidate
        return path

    def _standardize_segment(self, segment: AudioSegment) -> AudioSegment:
        """Standardize frame rate, channel count, and sample width to avoid concatenation mismatch."""
        target_sr = settings.sample_rate
        target_ch = settings.channels
        target_sw = settings.sample_width_bytes

        if segment.frame_rate != target_sr:
            segment = segment.set_frame_rate(target_sr)
        if segment.channels != target_ch:
            segment = segment.set_channels(target_ch)
        if segment.sample_width != target_sw:
            segment = segment.set_sample_width(target_sw)

        return segment


# Default global builder singleton
pacing_builder = PacingBuilder()
