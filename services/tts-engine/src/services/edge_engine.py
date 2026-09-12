"""Asynchronous speech synthesis engine wrapping Microsoft Edge-TTS."""

import asyncio
import io
import logging
from pathlib import Path
import re
from typing import List, Optional, Tuple, Union

import edge_tts

from src.config import settings
from src.engines.base import BaseTTSEngine
from src.schemas.voice import VoiceMetadata, STANDARD_VOICE_CATALOG, find_voice_by_id
from src.schemas.tts import TTSChunkRequest, TTSClipResult

logger = logging.getLogger(__name__)


def format_rate(rate: Union[str, float, int]) -> str:
    """
    Format speed rate into Edge-TTS compatible syntax (e.g., '+0%', '+20%', '-15%').

    :param rate: Speed rate as string ('+10%') or multiplier float (1.1).
    :return: Formatted rate string.
    """
    if rate is None:
        return "+0%"

    if isinstance(rate, str):
        rate_str = rate.strip()
        if rate_str.endswith("%") and (rate_str.startswith("+") or rate_str.startswith("-")):
            return rate_str
        try:
            val = float(rate_str.rstrip("%"))
            sign = "+" if val >= 0 else "-"
            return f"{sign}{int(abs(val))}%"
        except ValueError:
            return "+0%"

    if isinstance(rate, (float, int)):
        # If passed as multiplier e.g. 1.25 -> +25%
        if 0.1 <= rate <= 3.0:
            diff = int(round((rate - 1.0) * 100))
            sign = "+" if diff >= 0 else "-"
            return f"{sign}{abs(diff)}%"
        # If passed as direct percentage e.g. 20 -> +20%
        sign = "+" if rate >= 0 else "-"
        return f"{sign}{int(abs(rate))}%"

    return "+0%"


def format_pitch(pitch: Union[str, float, int]) -> str:
    """
    Format pitch into Edge-TTS compatible syntax (e.g., '+0Hz', '+5Hz', '-10Hz').

    :param pitch: Pitch string or integer frequency delta.
    :return: Formatted pitch string.
    """
    if pitch is None:
        return "+0Hz"

    if isinstance(pitch, str):
        pitch_str = pitch.strip()
        if pitch_str.endswith("Hz") and (pitch_str.startswith("+") or pitch_str.startswith("-")):
            return pitch_str
        try:
            val = float(re.sub(r"[^\d.-]", "", pitch_str))
            sign = "+" if val >= 0 else "-"
            return f"{sign}{int(abs(val))}Hz"
        except ValueError:
            return "+0Hz"

    if isinstance(pitch, (float, int)):
        sign = "+" if pitch >= 0 else "-"
        return f"{sign}{int(abs(pitch))}Hz"

    return "+0Hz"


def format_volume(volume: Union[str, float, int]) -> str:
    """
    Format volume into Edge-TTS compatible syntax (e.g., '+0%', '+10%').

    :param volume: Volume string or percentage integer.
    :return: Formatted volume string.
    """
    if volume is None:
        return "+0%"

    if isinstance(volume, str):
        vol_str = volume.strip()
        if vol_str.endswith("%") and (vol_str.startswith("+") or vol_str.startswith("-")):
            return vol_str
        try:
            val = float(vol_str.rstrip("%"))
            sign = "+" if val >= 0 else "-"
            return f"{sign}{int(abs(val))}%"
        except ValueError:
            return "+0%"

    if isinstance(volume, (float, int)):
        sign = "+" if volume >= 0 else "-"
        return f"{sign}{int(abs(volume))}%"

    return "+0%"


def estimate_mp3_duration(data: bytes) -> float:
    """
    Accurately estimate duration in seconds from MP3 audio byte stream.

    Scans MPEG audio frame headers to compute exact frame count and duration,
    falling back to average bitrate calculation (48 kbps) if frames are irregular.

    :param data: Raw MP3 bytes.
    :return: Duration in seconds.
    """
    if not data or len(data) < 32:
        return 0.0

    length = len(data)
    idx = 0
    # Skip ID3v2 tag if present
    if data.startswith(b"ID3") and length > 10:
        tag_size = (
            ((data[6] & 0x7F) << 21)
            | ((data[7] & 0x7F) << 14)
            | ((data[8] & 0x7F) << 7)
            | (data[9] & 0x7F)
        )
        idx = 10 + tag_size

    # Scan for MPEG frame headers (sync word 0xFFE / 0xFFF)
    frame_count = 0
    total_samples = 0
    sample_rate = 24000  # Default Edge-TTS sample rate

    while idx < length - 4:
        # Check sync bits 11111111 111...
        if data[idx] == 0xFF and (data[idx + 1] & 0xE0) == 0xE0:
            version_bits = (data[idx + 1] >> 3) & 0x03
            layer_bits = (data[idx + 1] >> 1) & 0x03

            # Determine MPEG version and Layer
            if version_bits == 0x03:  # MPEG-1
                sr_table = [44100, 48000, 32000]
                samples_per_frame = 1152
            elif version_bits == 0x02:  # MPEG-2
                sr_table = [22050, 24000, 16000]
                samples_per_frame = 576 if layer_bits == 0x01 else 1152
            elif version_bits == 0x00:  # MPEG-2.5
                sr_table = [11025, 12000, 8000]
                samples_per_frame = 576 if layer_bits == 0x01 else 1152
            else:
                idx += 1
                continue

            sr_idx = (data[idx + 2] >> 2) & 0x03
            if sr_idx < len(sr_table):
                sample_rate = sr_table[sr_idx]

            bitrate_idx = (data[idx + 2] >> 4) & 0x0F
            if bitrate_idx in (0x00, 0x0F):
                idx += 1
                continue

            frame_count += 1
            total_samples += samples_per_frame

            # Skip ahead to look for next frame (approximate minimum frame size 96 bytes)
            idx += 96
        else:
            idx += 1

    if frame_count > 0 and sample_rate > 0:
        return round(total_samples / sample_rate, 3)

    # Fallback heuristic: Edge-TTS uses 48 kbps (6,000 bytes/sec) for mono output
    return max(0.2, round(length / 6000.0, 3))


class EdgeEngine(BaseTTSEngine):
    """Production Edge-TTS synthesis engine supporting async streaming and batch concurrency."""

    @property
    def engine_name(self) -> str:
        return "edge-tts"

    def list_supported_voices(self) -> List[VoiceMetadata]:
        """Return catalog of pre-tested Edge-TTS neural voices."""
        return STANDARD_VOICE_CATALOG

    def resolve_voice_id(
        self,
        voice_id: Optional[str] = None,
        lang: Optional[str] = None,
    ) -> str:
        """
        Determine valid voice_id, resolving language fallbacks if unspecified.

        :param voice_id: Explicit voice identifier.
        :param lang: Language code ('vi', 'en', 'ja').
        :return: Standard voice ID string.
        """
        if voice_id:
            found = find_voice_by_id(voice_id)
            if found:
                return found.voice_id
            return voice_id

        if lang:
            clean_lang = lang.lower().strip()
            if clean_lang == "vi":
                return settings.default_voice_vi
            elif clean_lang == "en":
                return settings.default_voice_en
            elif clean_lang == "ja":
                return settings.default_voice_ja

        return settings.default_voice_vi

    async def synthesize_to_bytes(
        self,
        text: str,
        voice_id: str,
        rate: str = "+0%",
        pitch: str = "+0Hz",
        volume: str = "+0%",
    ) -> bytes:
        """
        Synthesize text into raw MP3 audio bytes using edge-tts.Communicate.

        :param text: Text string to speak.
        :param voice_id: Neural voice ID (e.g. vi-VN-HoaiMyNeural).
        :param rate: Speed adjustment string.
        :param pitch: Pitch adjustment string.
        :param volume: Volume adjustment string.
        :return: MP3 audio bytes.
        """
        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Cannot synthesize empty or whitespace-only text.")

        norm_rate = format_rate(rate)
        norm_pitch = format_pitch(pitch)
        norm_volume = format_volume(volume)

        logger.debug(
            "Synthesizing text='%s' [voice=%s, rate=%s, pitch=%s, volume=%s]",
            clean_text[:40],
            voice_id,
            norm_rate,
            norm_pitch,
            norm_volume,
        )

        communicate = edge_tts.Communicate(
            text=clean_text,
            voice=voice_id,
            rate=norm_rate,
            pitch=norm_pitch,
            volume=norm_volume,
        )

        buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buffer.write(chunk["data"])

        audio_bytes = buffer.getvalue()
        if not audio_bytes:
            raise RuntimeError(f"Edge-TTS returned empty audio stream for text: '{clean_text}'")

        return audio_bytes

    async def synthesize_to_file(
        self,
        text: str,
        voice_id: str,
        output_path: Union[str, Path],
        rate: str = "+0%",
        pitch: str = "+0Hz",
        volume: str = "+0%",
    ) -> Tuple[Path, float]:
        """
        Synthesize text and write directly to an output MP3 file.

        :param text: Text to speak.
        :param voice_id: Voice identifier.
        :param output_path: Destination file path.
        :param rate: Speed adjustment.
        :param pitch: Pitch adjustment.
        :param volume: Volume adjustment.
        :return: Tuple of (saved_path, duration_seconds).
        """
        dest_path = Path(output_path)
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        audio_bytes = await self.synthesize_to_bytes(
            text=text,
            voice_id=voice_id,
            rate=rate,
            pitch=pitch,
            volume=volume,
        )

        dest_path.write_bytes(audio_bytes)
        duration = estimate_mp3_duration(audio_bytes)
        return dest_path, duration

    async def _synthesize_chunk_task(
        self,
        chunk: TTSChunkRequest,
        output_dir: Path,
        semaphore: asyncio.Semaphore,
    ) -> TTSClipResult:
        """Execute synthesis for a single chunk within a concurrency limiter."""
        async with semaphore:
            clip_id = chunk.id or f"chunk_{chunk.order:04d}"
            voice_id = self.resolve_voice_id(chunk.voice_id, chunk.lang)
            dest_file = output_dir / f"{chunk.order:04d}_{clip_id}.mp3"

            try:
                saved_path, duration = await self.synthesize_to_file(
                    text=chunk.text,
                    voice_id=voice_id,
                    output_path=dest_file,
                    rate=chunk.rate,
                    pitch=chunk.pitch,
                    volume=chunk.volume,
                )
                return TTSClipResult(
                    clip_id=clip_id,
                    order=chunk.order,
                    file_path=str(saved_path),
                    duration_sec=duration,
                    cached=False,
                )
            except Exception as exc:
                logger.error("Synthesis failed for chunk %s: %s", clip_id, exc)
                return TTSClipResult(
                    clip_id=clip_id,
                    order=chunk.order,
                    file_path="",
                    duration_sec=0.0,
                    cached=False,
                    error=str(exc),
                )

    async def synthesize_batch(
        self,
        chunks: List[TTSChunkRequest],
        output_dir: Path,
        concurrency: int = 5,
    ) -> List[TTSClipResult]:
        """
        Synthesize an array of chunks in parallel bounded by a concurrency semaphore.

        :param chunks: List of chunk requests.
        :param output_dir: Directory where audio clips will be written.
        :param concurrency: Maximum number of concurrent async tasks.
        :return: List of TTSClipResult sorted by order.
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        semaphore = asyncio.Semaphore(concurrency)

        tasks = [
            self._synthesize_chunk_task(chunk, output_dir, semaphore)
            for chunk in chunks
        ]

        results: List[TTSClipResult] = await asyncio.gather(*tasks)
        # Ensure results maintain original chunk order
        results.sort(key=lambda r: r.order)
        return results


# Global singleton instance
edge_engine = EdgeEngine()
