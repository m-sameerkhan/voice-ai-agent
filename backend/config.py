"""
Central place for reading environment variables.

Everything else in the backend imports from here instead of calling
os.getenv directly, so there's exactly one spot to check when a key
goes missing.
"""

import os

from dotenv import load_dotenv

load_dotenv()


def _require_hint(name: str) -> str:
    return f"Missing {name} in your environment. Copy .env.example to .env and fill it in."


GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"
DEFAULT_TEMPERATURE = 0.4

# Deepgram streaming defaults - see README for why each of these is on.
DEEPGRAM_MODEL = os.getenv("DEEPGRAM_MODEL", "nova-2")
DEEPGRAM_ENDPOINTING_MS = int(os.getenv("DEEPGRAM_ENDPOINTING_MS", "300"))


def missing_keys() -> list[str]:
    """Used by /api/status so the sidebar can tell you what's not configured yet."""
    missing = []
    if not GROQ_API_KEY:
        missing.append("GROQ_API_KEY")
    if not DEEPGRAM_API_KEY:
        missing.append("DEEPGRAM_API_KEY")
    if not ELEVENLABS_API_KEY:
        missing.append("ELEVENLABS_API_KEY")
    return missing
