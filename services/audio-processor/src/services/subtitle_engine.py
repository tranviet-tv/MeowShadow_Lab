"""Subtitle generation engine producing millisecond-accurate SRT and WebVTT files."""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from src.services.pacing_builder import SegmentType, TimelineSegment

logger = logging.getLogger(__name__)


@dataclass
class SubtitleItem:
    """Individual subtitle entry with spoken timing boundaries."""

    id: int
    start_ms: int
    end_ms: int
    lang: str
    text: str
    chunk_id: Optional[str] = None

    @property
    def start_time_sec(self) -> float:
        """Start timestamp in seconds rounded to 3 decimals."""
        return round(self.start_ms / 1000.0, 3)

    @property
    def end_time_sec(self) -> float:
        """End timestamp in seconds rounded to 3 decimals."""
        return round(self.end_ms / 1000.0, 3)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary matching API specifications."""
        return {
            "id": self.id,
            "start_time_sec": self.start_time_sec,
            "end_time_sec": self.end_time_sec,
            "lang": self.lang,
            "text": self.text,
            "chunk_id": self.chunk_id,
        }


def format_timestamp_srt(ms: int) -> str:
    """
    Format milliseconds to SubRip time format: HH:MM:SS,mmm.
    Example: 125450 -> '00:02:05,450'
    """
    total_seconds, milliseconds = divmod(max(0, ms), 1000)
    minutes, seconds = divmod(total_seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"


def format_timestamp_vtt(ms: int) -> str:
    """
    Format milliseconds to WebVTT time format: HH:MM:SS.mmm.
    Example: 125450 -> '00:02:05.450'
    """
    total_seconds, milliseconds = divmod(max(0, ms), 1000)
    minutes, seconds = divmod(total_seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}"


class SubtitleEngine:
    """High-accuracy subtitle generator guaranteeing zero timestamp drift."""

    def extract_subtitles_from_timeline(
        self,
        timeline: List[TimelineSegment],
        hold_during_silence: bool = False,
    ) -> List[SubtitleItem]:
        """
        Extract spoken sentence subtitle items from a PacingTimeline.

        :param timeline: Ordered list of TimelineSegment instances from PacingBuilder.
        :param hold_during_silence: If True, extends subtitle display duration through the following silence.
        :return: Ordered list of SubtitleItem records.
        """
        subtitles: List[SubtitleItem] = []
        spoken_types = {SegmentType.SOURCE_SENTENCE, SegmentType.TARGET_SENTENCE}
        timeline_len = len(timeline)

        sub_index = 1
        for i, segment in enumerate(timeline):
            if segment.segment_type in spoken_types and segment.text:
                start_ms = segment.start_ms
                end_ms = segment.end_ms

                # Optionally hold subtitle on screen throughout following silence
                if hold_during_silence:
                    next_idx = i + 1
                    if next_idx < timeline_len:
                        next_seg = timeline[next_idx]
                        if next_seg.segment_type in {
                            SegmentType.VI_SILENCE,
                            SegmentType.TARGET_SILENCE,
                            SegmentType.INTER_CHUNK_PAUSE,
                        }:
                            end_ms = next_seg.end_ms

                subtitles.append(
                    SubtitleItem(
                        id=sub_index,
                        start_ms=start_ms,
                        end_ms=end_ms,
                        lang=segment.lang or "und",
                        text=segment.text.strip(),
                        chunk_id=segment.chunk_id,
                    )
                )
                sub_index += 1

        return subtitles

    def generate_srt(
        self,
        subtitles: List[SubtitleItem],
        include_lang_tag: bool = True,
    ) -> str:
        """
        Convert subtitle items into standard SubRip (.srt) format.

        :param subtitles: List of SubtitleItem.
        :param include_lang_tag: If True, prepends [VI], [EN], or [JA] tag.
        :return: Formatted SRT content as string.
        """
        blocks: List[str] = []
        for item in subtitles:
            start_fmt = format_timestamp_srt(item.start_ms)
            end_fmt = format_timestamp_srt(item.end_ms)
            text = f"[{item.lang.upper()}] {item.text}" if include_lang_tag else item.text

            blocks.append(f"{item.id}\n{start_fmt} --> {end_fmt}\n{text}\n")

        return "\n".join(blocks).strip() + "\n"

    def generate_vtt(
        self,
        subtitles: List[SubtitleItem],
        include_lang_tag: bool = True,
    ) -> str:
        """
        Convert subtitle items into WebVTT (.vtt) format.

        :param subtitles: List of SubtitleItem.
        :param include_lang_tag: If True, prepends [VI], [EN], or [JA] tag.
        :return: Formatted WebVTT content as string.
        """
        lines: List[str] = ["WEBVTT", ""]
        for item in subtitles:
            start_fmt = format_timestamp_vtt(item.start_ms)
            end_fmt = format_timestamp_vtt(item.end_ms)
            text = f"[{item.lang.upper()}] {item.text}" if include_lang_tag else item.text

            lines.append(str(item.id))
            lines.append(f"{start_fmt} --> {end_fmt}")
            lines.append(text)
            lines.append("")

        return "\n".join(lines).strip() + "\n"

    def export_srt_file(
        self,
        subtitles: List[SubtitleItem],
        output_path: Union[str, Path],
        include_lang_tag: bool = True,
    ) -> Path:
        """Save SRT subtitles to specified file path with UTF-8 encoding."""
        dest = Path(output_path)
        dest.parent.mkdir(parents=True, exist_ok=True)
        content = self.generate_srt(subtitles, include_lang_tag=include_lang_tag)
        dest.write_text(content, encoding="utf-8")
        return dest

    def export_vtt_file(
        self,
        subtitles: List[SubtitleItem],
        output_path: Union[str, Path],
        include_lang_tag: bool = True,
    ) -> Path:
        """Save WebVTT subtitles to specified file path with UTF-8 encoding."""
        dest = Path(output_path)
        dest.parent.mkdir(parents=True, exist_ok=True)
        content = self.generate_vtt(subtitles, include_lang_tag=include_lang_tag)
        dest.write_text(content, encoding="utf-8")
        return dest


subtitle_engine = SubtitleEngine()
