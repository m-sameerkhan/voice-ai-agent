"""
Tiny in-memory tracker for the sidebar's Signal Path section.

Each provider module calls `mark(...)` right before/after it talks to its
API, and GET /api/status just reads whatever's in here. Nothing fancy -
this resets on server restart, which is fine for a single-process dev/demo
deployment. If you outgrow that, swap this for Redis and keep the same
`mark`/`snapshot` interface.
"""

import time
from threading import Lock

_lock = Lock()

_status = {
    "llm": {"state": "idle", "detail": "", "updated_at": 0},
    "asr": {"state": "idle", "detail": "", "updated_at": 0},
    "tts": {"state": "idle", "detail": "", "updated_at": 0},
}

VALID_STATES = {"idle", "connected", "error"}


def mark(role: str, state: str, detail: str = "") -> None:
    if role not in _status:
        return
    if state not in VALID_STATES:
        state = "error"
    with _lock:
        _status[role] = {"state": state, "detail": detail, "updated_at": time.time()}


def snapshot() -> dict:
    with _lock:
        return {k: dict(v) for k, v in _status.items()}
