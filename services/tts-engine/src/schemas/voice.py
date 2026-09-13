"""Voice metadata schemas and standard catalog."""

from typing import List, Optional
from pydantic import BaseModel, Field


class VoiceMetadata(BaseModel):
    """Metadata describing a text-to-speech voice."""

    voice_id: str = Field(..., description="Unique voice identifier (e.g. vi-VN-HoaiMyNeural)")
    name: str = Field(..., description="Human-readable voice name")
    language: str = Field(..., description="Language code: vi, en, or ja")
    locale: str = Field(..., description="Locale code (e.g. vi-VN, en-US, ja-JP)")
    gender: str = Field(..., description="Gender: Female or Male")
    engine: str = Field(default="edge-tts", description="TTS Engine name")
    description: str = Field(default="", description="Voice characteristics or style description")
    is_default: bool = Field(default=False, description="Whether this is the default voice for the language")


# Standard pre-registered voices catalog
STANDARD_VOICE_CATALOG: List[VoiceMetadata] = [
    VoiceMetadata(
        voice_id="vi-VN-HoaiMyNeural",
        name="Hoài My",
        language="vi",
        locale="vi-VN",
        gender="Female",
        engine="edge-tts",
        description="Warm, expressive, standard northern Vietnamese broadcasting voice",
        is_default=True,
    ),
    VoiceMetadata(
        voice_id="vi-VN-NamMinhNeural",
        name="Nam Minh",
        language="vi",
        locale="vi-VN",
        gender="Male",
        engine="edge-tts",
        description="Deep, steady, natural northern Vietnamese male voice",
        is_default=False,
    ),
    VoiceMetadata(
        voice_id="en-US-JennyNeural",
        name="Jenny",
        language="en",
        locale="en-US",
        gender="Female",
        engine="edge-tts",
        description="Natural, articulate, standard American academic reading voice",
        is_default=True,
    ),
    VoiceMetadata(
        voice_id="en-US-GuyNeural",
        name="Guy",
        language="en",
        locale="en-US",
        gender="Male",
        engine="edge-tts",
        description="Clear, confident, natural American male voice",
        is_default=False,
    ),
    VoiceMetadata(
        voice_id="ja-JP-NanamiNeural",
        name="Nanami (七海)",
        language="ja",
        locale="ja-JP",
        gender="Female",
        engine="edge-tts",
        description="Polite, friendly, standard Tokyo NHK Japanese female voice",
        is_default=True,
    ),
    VoiceMetadata(
        voice_id="ja-JP-KeitaNeural",
        name="Keita (啓太)",
        language="ja",
        locale="ja-JP",
        gender="Male",
        engine="edge-tts",
        description="Calm, natural, standard Tokyo Japanese male voice",
        is_default=False,
    ),
    # =========================================================================
    # Kokoro-82M Local AI Offline Voices (No Cloud Connection Required)
    # =========================================================================
    VoiceMetadata(
        voice_id="kokoro-en-female-bella",
        name="Bella (Kokoro AI)",
        language="en",
        locale="en-US",
        gender="Female",
        engine="kokoro",
        description="Clear, expressive local neural English female voice (Kokoro-82M)",
        is_default=False,
    ),
    VoiceMetadata(
        voice_id="kokoro-en-female-sarah",
        name="Sarah (Kokoro AI)",
        language="en",
        locale="en-US",
        gender="Female",
        engine="kokoro",
        description="Warm, conversational local English female voice",
        is_default=False,
    ),
    VoiceMetadata(
        voice_id="kokoro-en-male-adam",
        name="Adam (Kokoro AI)",
        language="en",
        locale="en-US",
        gender="Male",
        engine="kokoro",
        description="Natural, deep local neural English male voice (Kokoro-82M)",
        is_default=False,
    ),
    VoiceMetadata(
        voice_id="kokoro-en-male-michael",
        name="Michael (Kokoro AI)",
        language="en",
        locale="en-US",
        gender="Male",
        engine="kokoro",
        description="Energetic, clear American male voice for shadowing practice",
        is_default=False,
    ),
    VoiceMetadata(
        voice_id="kokoro-ja-female-sakura",
        name="Sakura (Kokoro AI)",
        language="ja",
        locale="ja-JP",
        gender="Female",
        engine="kokoro",
        description="Natural Tokyo Japanese local female voice (Kokoro-82M)",
        is_default=False,
    ),
    VoiceMetadata(
        voice_id="kokoro-ja-male-kenji",
        name="Kenji (Kokoro AI)",
        language="ja",
        locale="ja-JP",
        gender="Male",
        engine="kokoro",
        description="Calm, articulate Tokyo Japanese local male voice",
        is_default=False,
    ),
]


class VoiceListResponse(BaseModel):
    """Response containing a list of available voices."""

    success: bool = True
    total: int
    voices: List[VoiceMetadata]


def get_all_voices(language: Optional[str] = None, gender: Optional[str] = None) -> List[VoiceMetadata]:
    """
    Filter available voices by language and gender.

    :param language: Language code filter ('vi', 'en', 'ja').
    :param gender: Gender filter ('Female', 'Male').
    :return: Filtered list of VoiceMetadata.
    """
    results = STANDARD_VOICE_CATALOG
    if language:
        lang_lower = language.lower()
        results = [v for v in results if v.language.lower() == lang_lower]
    if gender:
        gender_lower = gender.lower()
        results = [v for v in results if v.gender.lower() == gender_lower]
    return results


def find_voice_by_id(voice_id: str) -> Optional[VoiceMetadata]:
    """Find voice metadata by voice_id."""
    for v in STANDARD_VOICE_CATALOG:
        if v.voice_id.lower() == voice_id.lower():
            return v
    return None
