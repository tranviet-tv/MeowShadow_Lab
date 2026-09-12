"""Audio and formatting utility helpers for speech synthesis."""

import io
from pathlib import Path
import re
from typing import Union


def format_rate(rate: Union[str, float, int, None]) -> str:
    """Format speed rate into Edge-TTS compatible syntax (e.g. '+0%', '+20%', '-15%')."""
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
        if 0.1 <= rate <= 3.0:
            diff = int(round((rate - 1.0) * 100))
            sign = "+" if diff >= 0 else "-"
            return f"{sign}{abs(diff)}%"
        sign = "+" if rate >= 0 else "-"
        return f"{sign}{int(abs(rate))}%"

    return "+0%"


def format_pitch(pitch: Union[str, float, int, None]) -> str:
    """Format pitch into Edge-TTS compatible syntax (e.g. '+0Hz', '+5Hz', '-10Hz')."""
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


def format_volume(volume: Union[str, float, int, None]) -> str:
    """Format volume into Edge-TTS compatible syntax (e.g. '+0%', '+10%')."""
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
    """Accurately estimate duration in seconds from MP3 byte stream."""
    if not data or len(data) < 32:
        return 0.0

    length = len(data)
    idx = 0
    if data.startswith(b"ID3") and length > 10:
        tag_size = (
            ((data[6] & 0x7F) << 21)
            | ((data[7] & 0x7F) << 14)
            | ((data[8] & 0x7F) << 7)
            | (data[9] & 0x7F)
        )
        idx = 10 + tag_size

    frame_count = 0
    total_samples = 0
    sample_rate = 24000

    while idx < length - 4:
        if data[idx] == 0xFF and (data[idx + 1] & 0xE0) == 0xE0:
            version_bits = (data[idx + 1] >> 3) & 0x03
            layer_bits = (data[idx + 1] >> 1) & 0x03

            if version_bits == 0x03:
                sr_table = [44100, 48000, 32000]
                samples_per_frame = 1152
            elif version_bits == 0x02:
                sr_table = [22050, 24000, 16000]
                samples_per_frame = 576 if layer_bits == 0x01 else 1152
            elif version_bits == 0x00:
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
            idx += 96
        else:
            idx += 1

    if frame_count > 0 and sample_rate > 0:
        return round(total_samples / sample_rate, 3)

    return max(0.2, round(length / 6000.0, 3))
