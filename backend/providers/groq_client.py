"""
Thin wrapper around Groq's chat completions API.

Kept deliberately dumb: no tool-calling, no streaming (yet) - just
"conversation history in, one reply out". If you want streamed tokens
later, swap `chat.completions.create` for `stream=True` and adapt
/api/chat to a StreamingResponse.
"""

from __future__ import annotations

from groq import Groq

from config import GROQ_API_KEY, DEFAULT_GROQ_MODEL
import state

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        if not GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not set")
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


SYSTEM_PROMPT = (
    "You are a helpful, concise voice assistant. Your replies are spoken "
    "aloud by a text-to-speech engine, so favor short, natural sentences "
    "over long lists or markdown formatting."
)

# Models this build knows how to offer in the dropdown. All are Groq-hosted.
AVAILABLE_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]


def chat(history: list[dict], model: str = DEFAULT_GROQ_MODEL, temperature: float = 0.4) -> str:
    """
    history: list of {"role": "user"|"assistant", "content": str}
    Returns the assistant's reply text.
    """
    client = _get_client()
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, *history]

    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
        )
        state.mark("llm", "connected", model)
        return response.choices[0].message.content
    except Exception as exc:
        state.mark("llm", "error", str(exc))
        raise


def health_check() -> bool:
    """Cheap check used by /api/status - doesn't burn a full completion."""
    try:
        _get_client()
        state.mark("llm", "connected", DEFAULT_GROQ_MODEL)
        return True
    except Exception as exc:
        state.mark("llm", "error", str(exc))
        return False
