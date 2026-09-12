"""Smart Caching Engine using MD5 hashing for high-speed audio retrieval."""

import hashlib
import logging
from pathlib import Path
import shutil
from typing import Dict, Optional, Tuple

from src.config import settings
from src.utils.audio import format_rate, format_pitch, estimate_mp3_duration

logger = logging.getLogger(__name__)


class CacheManager:
    """Manages audio clip caching based on deterministic MD5 hashing."""

    def __init__(self, cache_dir: Optional[Path] = None):
        self._custom_cache_dir = cache_dir
        self.hits: int = 0
        self.misses: int = 0
        self.saved_bytes: int = 0

    @property
    def cache_dir(self) -> Path:
        """Resolve and ensure cache directory exists."""
        if self._custom_cache_dir:
            self._custom_cache_dir.mkdir(parents=True, exist_ok=True)
            return self._custom_cache_dir
        return settings.get_cache_dir()

    @staticmethod
    def compute_hash(
        text: str,
        voice_id: str,
        rate: str = "+0%",
        pitch: str = "+0Hz",
    ) -> str:
        """
        Calculate deterministic MD5 hash key for given synthesis parameters.

        :param text: Text sentence.
        :param voice_id: Voice identifier.
        :param rate: Speed adjustment.
        :param pitch: Pitch adjustment.
        :return: 32-character hexadecimal MD5 digest string.
        """
        clean_text = " ".join(text.strip().split())
        norm_rate = format_rate(rate)
        norm_pitch = format_pitch(pitch)
        raw_key = f"{clean_text}:{voice_id.strip()}:{norm_rate}:{norm_pitch}"
        return hashlib.md5(raw_key.encode("utf-8")).hexdigest()

    def get_cache_path(self, cache_key: str) -> Path:
        """Get destination file path for a cache key."""
        return self.cache_dir / f"{cache_key}.mp3"

    def is_cached(self, cache_key: str) -> bool:
        """Check if a valid cached MP3 file exists."""
        path = self.get_cache_path(cache_key)
        return path.exists() and path.stat().st_size > 0

    def get_cached_bytes(self, cache_key: str) -> Optional[bytes]:
        """
        Retrieve cached audio bytes if available.

        :param cache_key: MD5 hash key.
        :return: Audio bytes or None on cache miss.
        """
        path = self.get_cache_path(cache_key)
        if path.exists() and path.stat().st_size > 0:
            data = path.read_bytes()
            self.hits += 1
            self.saved_bytes += len(data)
            logger.debug("Cache HIT for key=%s (%d bytes)", cache_key, len(data))
            return data

        self.misses += 1
        logger.debug("Cache MISS for key=%s", cache_key)
        return None

    def save_to_cache(self, cache_key: str, audio_bytes: bytes) -> Path:
        """
        Atomically save synthesized audio bytes into cache directory.

        :param cache_key: MD5 hash key.
        :param audio_bytes: Raw audio byte stream.
        :return: Cached file Path.
        """
        dest_path = self.get_cache_path(cache_key)
        # Write to temporary file first then rename to guarantee atomicity
        temp_path = self.cache_dir / f"{cache_key}.tmp"
        temp_path.write_bytes(audio_bytes)
        temp_path.replace(dest_path)
        logger.debug("Cached %d bytes with key=%s", len(audio_bytes), cache_key)
        return dest_path

    def copy_to_destination(self, cache_key: str, dest_path: Path) -> Tuple[bool, float]:
        """
        Copy cached audio file directly to destination output path.

        :param cache_key: MD5 hash key.
        :param dest_path: Target destination path.
        :return: Tuple (success_bool, duration_sec).
        """
        src_path = self.get_cache_path(cache_key)
        if not (src_path.exists() and src_path.stat().st_size > 0):
            return False, 0.0

        dest_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src_path, dest_path)
        audio_data = dest_path.read_bytes()
        duration = estimate_mp3_duration(audio_data)

        self.hits += 1
        self.saved_bytes += len(audio_data)
        return True, duration

    def get_stats(self) -> Dict[str, object]:
        """Return cache performance statistics."""
        total = self.hits + self.misses
        hit_ratio = round((self.hits / total * 100), 2) if total > 0 else 0.0

        # Count cached files on disk
        cache_files = list(self.cache_dir.glob("*.mp3"))
        total_disk_bytes = sum(f.stat().st_size for f in cache_files)

        return {
            "cache_dir": str(self.cache_dir),
            "total_cached_files": len(cache_files),
            "total_disk_bytes": total_disk_bytes,
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio_percent": hit_ratio,
            "saved_bytes": self.saved_bytes,
        }

    def clear_cache(self) -> int:
        """Remove all cached MP3 files (useful for tests or maintenance)."""
        count = 0
        for f in self.cache_dir.glob("*.mp3"):
            try:
                f.unlink()
                count += 1
            except OSError:
                pass
        return count


# Global singleton instance
cache_manager = CacheManager()
