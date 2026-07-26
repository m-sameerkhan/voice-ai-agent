"""
ElevenLabs TTS: text -> audio, plus the two read-only endpoints the
sidebar needs (voice list, usage/credits).

Note per ElevenLabs' API: `voices()` only returns voices that exist on
the account (cloned/added ones + the default set), not the entire
public Voice Library - so the dropdown is naturally scoped correctly
without extra filtering here.
"""

from elevenlabs.client import ElevenLabs

from config import ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
import state

_client: ElevenLabs | None = None


def _get_client() -> ElevenLabs:
    global _client
    if _client is None:
        if not ELEVENLABS_API_KEY:
            raise RuntimeError("ELEVENLABS_API_KEY is not set")
        _client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    return _client


def text_to_speech(text: str, voice_id: str | None = None) -> bytes:
    client = _get_client()
    voice = voice_id or ELEVENLABS_VOICE_ID
    if not voice:
        raise RuntimeError("No voice_id provided and ELEVENLABS_VOICE_ID is not set")

    try:
        audio_chunks = client.text_to_speech.convert(
            voice_id=voice,
            model_id="eleven_turbo_v2_5",
            text=text,
            output_format="mp3_44100_128",
        )
        audio = b"".join(audio_chunks)
        state.mark("tts", "connected", voice)
        return audio
    except Exception as exc:
        state.mark("tts", "error", str(exc))
        raise


def list_voices() -> list[dict]:
    client = _get_client()
    try:
        voices = client.voices.get_all().voices
        state.mark("tts", "connected", "voices listed")
        return [
            {
                "voice_id": v.voice_id,
                "name": v.name,
                "description": getattr(v, "labels", {}).get("description", "") if getattr(v, "labels", None) else "",
            }
            for v in voices
        ]
    except Exception as exc:
        state.mark("tts", "error", str(exc))
        raise


def get_usage() -> dict:
    """Character usage for the current billing period, for the sidebar's credits line."""
    client = _get_client()
    try:
        subscription = client.user.get_subscription()
        used = subscription.character_count
        limit = subscription.character_limit
        state.mark("tts", "connected", "usage checked")
        return {"used": used, "limit": limit, "remaining": max(limit - used, 0)}
    except Exception as exc:
        state.mark("tts", "error", str(exc))
        raise


def health_check() -> bool:
    try:
        _get_client()
        state.mark("tts", "connected", "")
        return True
    except Exception as exc:
        state.mark("tts", "error", str(exc))
        return False
