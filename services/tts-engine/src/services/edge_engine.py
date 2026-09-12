"""Asynchronous speech synthesis engine wrapping Microsoft Edge-TTS with Smart Caching."""

import asyncio
import io
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import edge_tts

from src.config import settings
from src.engines.base import BaseTTSEngine
from src.schemas.voice import VoiceMetadata, STANDARD_VOICE_CATALOG, find_voice_by_id
from src.schemas.tts import TTSChunkRequest, TTSClipResult
from src.utils.audio import (
    format_rate,
    format_pitch,
    format_volume,
    estimate_mp3_duration,
)
from src.services.cache_manager import cache_manager

logger = logging.getLogger(__name__)


class EdgeEngine(BaseTTSEngine):
    """Production Edge-TTS synthesis engine supporting async streaming, batch concurrency, and MD5 caching."""

    def __init__(self):
        self._key_locks: Dict[str, asyncio.Lock] = {}
        self._lock_creation_lock = asyncio.Lock()

    @property
    def engine_name(self) -> str:
        return "edge-tts"

    def list_supported_voices(self) -> List[VoiceMetadata]:
        """Return catalog of pre-tested Edge-TTS neural voices."""
        return STANDARD_VOICE_CATALOG

    async def _get_lock_for_key(self, key: str) -> asyncio.Lock:
        """Acquire dedicated lock for a cache key to eliminate redundant concurrent calls."""
        async with self._lock_creation_lock:
            if key not in self._key_locks:
                self._key_locks[key] = asyncio.Lock()
            return self._key_locks[key]

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
        use_cache: bool = True,
    ) -> bytes:
        """
        Synthesize text into raw MP3 audio bytes using edge-tts with MD5 cache check.

        :param text: Text string to speak.
        :param voice_id: Neural voice ID (e.g. vi-VN-HoaiMyNeural).
        :param rate: Speed adjustment string.
        :param pitch: Pitch adjustment string.
        :param volume: Volume adjustment string.
        :param use_cache: Whether to query and store in MD5 smart cache.
        :return: MP3 audio bytes.
        """
        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Cannot synthesize empty or whitespace-only text.")

        norm_rate = format_rate(rate)
        norm_pitch = format_pitch(pitch)
        norm_volume = format_volume(volume)

        cache_key = ""
        if use_cache:
            cache_key = cache_manager.compute_hash(
                text=clean_text,
                voice_id=voice_id,
                rate=norm_rate,
                pitch=norm_pitch,
            )
            cached_bytes = cache_manager.get_cached_bytes(cache_key)
            if cached_bytes is not None:
                logger.info("Serving synthesis from cache for key=%s", cache_key)
                return cached_bytes

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

        if use_cache and cache_key:
            cache_manager.save_to_cache(cache_key, audio_bytes)

        return audio_bytes

    async def synthesize_to_file(
        self,
        text: str,
        voice_id: str,
        output_path: Union[str, Path],
        rate: str = "+0%",
        pitch: str = "+0Hz",
        volume: str = "+0%",
        use_cache: bool = True,
    ) -> Tuple[Path, float]:
        """
        Synthesize text and write directly to an output MP3 file with caching.

        :param text: Text to speak.
        :param voice_id: Voice identifier.
        :param output_path: Destination file path.
        :param rate: Speed adjustment.
        :param pitch: Pitch adjustment.
        :param volume: Volume adjustment.
        :param use_cache: Whether to utilize MD5 cache.
        :return: Tuple of (saved_path, duration_seconds).
        """
        dest_path = Path(output_path)
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        norm_rate = format_rate(rate)
        norm_pitch = format_pitch(pitch)
        clean_text = text.strip()

        if use_cache:
            cache_key = cache_manager.compute_hash(
                text=clean_text,
                voice_id=voice_id,
                rate=norm_rate,
                pitch=norm_pitch,
            )
            success, duration = cache_manager.copy_to_destination(cache_key, dest_path)
            if success:
                logger.info("Directly copied cached clip %s to %s", cache_key, dest_path)
                return dest_path, duration

        audio_bytes = await self.synthesize_to_bytes(
            text=clean_text,
            voice_id=voice_id,
            rate=norm_rate,
            pitch=norm_pitch,
            volume=volume,
            use_cache=use_cache,
        )

        dest_path.write_bytes(audio_bytes)
        duration = estimate_mp3_duration(audio_bytes)
        return dest_path, duration

    async def _synthesize_chunk_task(
        self,
        chunk: TTSChunkRequest,
        output_dir: Path,
        semaphore: asyncio.Semaphore,
        use_cache: bool = True,
    ) -> TTSClipResult:
        """Execute synthesis for a single chunk within a concurrency limiter and key lock."""
        async with semaphore:
            clip_id = chunk.id or f"chunk_{chunk.order:04d}"
            voice_id = self.resolve_voice_id(chunk.voice_id, chunk.lang)
            dest_file = output_dir / f"{chunk.order:04d}_{clip_id}.mp3"

            norm_rate = format_rate(chunk.rate)
            norm_pitch = format_pitch(chunk.pitch)
            cache_key = cache_manager.compute_hash(
                text=chunk.text,
                voice_id=voice_id,
                rate=norm_rate,
                pitch=norm_pitch,
            )

            key_lock = await self._get_lock_for_key(cache_key)
            async with key_lock:
                # Check cache directly before network or file operations
                if use_cache and cache_manager.is_cached(cache_key):
                    success, duration = cache_manager.copy_to_destination(cache_key, dest_file)
                    if success:
                        return TTSClipResult(
                            clip_id=clip_id,
                            order=chunk.order,
                            file_path=str(dest_file),
                            duration_sec=duration,
                            cached=True,
                            md5_hash=cache_key,
                        )

                try:
                    saved_path, duration = await self.synthesize_to_file(
                        text=chunk.text,
                        voice_id=voice_id,
                        output_path=dest_file,
                        rate=norm_rate,
                        pitch=norm_pitch,
                        volume=chunk.volume,
                        use_cache=use_cache,
                    )
                    return TTSClipResult(
                        clip_id=clip_id,
                        order=chunk.order,
                        file_path=str(saved_path),
                        duration_sec=duration,
                        cached=False,
                        md5_hash=cache_key,
                    )
                except Exception as exc:
                    logger.error("Synthesis failed for chunk %s: %s", clip_id, exc)
                    return TTSClipResult(
                        clip_id=clip_id,
                        order=chunk.order,
                        file_path="",
                        duration_sec=0.0,
                        cached=False,
                        md5_hash=cache_key,
                        error=str(exc),
                    )

    async def synthesize_batch(
        self,
        chunks: List[TTSChunkRequest],
        output_dir: Path,
        concurrency: int = 5,
        use_cache: bool = True,
    ) -> List[TTSClipResult]:
        """
        Synthesize an array of chunks in parallel bounded by a concurrency semaphore.

        :param chunks: List of chunk requests.
        :param output_dir: Directory where audio clips will be written.
        :param concurrency: Maximum number of concurrent async tasks.
        :param use_cache: Whether to enable MD5 caching.
        :return: List of TTSClipResult sorted by order.
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        semaphore = asyncio.Semaphore(concurrency)

        tasks = [
            self._synthesize_chunk_task(chunk, output_dir, semaphore, use_cache=use_cache)
            for chunk in chunks
        ]

        results: List[TTSClipResult] = await asyncio.gather(*tasks)
        results.sort(key=lambda r: r.order)
        return results


# Global singleton instance
edge_engine = EdgeEngine()
