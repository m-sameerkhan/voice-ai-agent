"""
Deepgram streaming STT.

This wraps the Deepgram Python SDK's live transcription client and
exposes one function, `run_stream`, that the /ws/stt route calls with
the frontend's websocket. It pumps audio one direction and transcripts
the other, and updates `state` so the sidebar's ASR dot reflects what's
actually happening.

Deepgram features enabled here (see README for what each does):
  - smart_format     -> cleaned up numbers/dates/punctuation
  - interim_results  -> partial transcripts while the user is still talking
  - endpointing      -> auto-detects end-of-speech instead of a manual stop button
  - utterance_end_ms -> a second, more reliable "user has stopped talking"
                        signal, used as a fallback when endpointing alone
                        doesn't fire speech_final (e.g. background noise
                        keeps VAD from detecting silence cleanly)
"""

import asyncio
import json

from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
)
from fastapi import WebSocket, WebSocketDisconnect

from config import DEEPGRAM_API_KEY, DEEPGRAM_MODEL, DEEPGRAM_ENDPOINTING_MS
import state


def _build_options() -> LiveOptions:
    return LiveOptions(
        model=DEEPGRAM_MODEL,
        language="en-US",
        smart_format=True,
        interim_results=True,
        endpointing=DEEPGRAM_ENDPOINTING_MS,
        utterance_end_ms=1000,
        vad_events=True,
        punctuate=True,
        encoding="linear16",
        sample_rate=16000,
        channels=1,
    )


async def run_stream(client_ws: WebSocket) -> None:
    """
    Owns one Deepgram live connection for the lifetime of one frontend
    websocket connection. Frontend sends raw PCM16 audio chunks as binary
    frames; we forward interim/final transcript JSON back as text frames:

        {"type": "transcript", "is_final": bool, "text": str}
        {"type": "speech_final", "text": str}   # endpointing or utterance_end fired
        {"type": "error", "message": str}
    """
    if not DEEPGRAM_API_KEY:
        await client_ws.send_json({"type": "error", "message": "DEEPGRAM_API_KEY is not set"})
        return

    deepgram = DeepgramClient(
        DEEPGRAM_API_KEY,
        DeepgramClientOptions(options={"keepalive": "true"}),
    )
    dg_connection = deepgram.listen.asyncwebsocket.v("1")

    loop = asyncio.get_event_loop()

    # Tracks the most recent transcript text so UtteranceEnd (which carries
    # no transcript of its own) can still finalize something meaningful.
    last_transcript = {"text": ""}

    async def on_message(_, result, **kwargs):
        try:
            transcript = result.channel.alternatives[0].transcript
        except (AttributeError, IndexError):
            return
        if not transcript:
            return

        if result.is_final:
            state.mark("asr", "connected", DEEPGRAM_MODEL)
            last_transcript["text"] = transcript
            payload = {"type": "transcript", "is_final": True, "text": transcript}
            if getattr(result, "speech_final", False):
                payload = {"type": "speech_final", "text": transcript}
                last_transcript["text"] = ""
            try:
                await client_ws.send_json(payload)
            except RuntimeError:
                pass
        else:
            last_transcript["text"] = transcript
            try:
                await client_ws.send_json({"type": "transcript", "is_final": False, "text": transcript})
            except RuntimeError:
                pass

    async def on_utterance_end(_, utterance_end, **kwargs):
        # Fallback finalizer: fires when Deepgram's VAD independently
        # decides the utterance has ended, even if endpointing's
        # speech_final flag never arrived on a Transcript event.
        text = last_transcript["text"].strip()
        if not text:
            return
        last_transcript["text"] = ""
        try:
            await client_ws.send_json({"type": "speech_final", "text": text})
        except RuntimeError:
            pass

    async def on_error(_, error, **kwargs):
        state.mark("asr", "error", str(error))
        try:
            await client_ws.send_json({"type": "error", "message": str(error)})
        except Exception:
            pass

    dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
    dg_connection.on(LiveTranscriptionEvents.UtteranceEnd, on_utterance_end)
    dg_connection.on(LiveTranscriptionEvents.Error, on_error)

    started = await dg_connection.start(_build_options())
    if not started:
        state.mark("asr", "error", "failed to open Deepgram connection")
        await client_ws.send_json({"type": "error", "message": "Could not open Deepgram connection"})
        return

    state.mark("asr", "connected", DEEPGRAM_MODEL)

    try:
        while True:
            message = await client_ws.receive()

            if message["type"] == "websocket.disconnect":
                break

            if message["type"] != "websocket.receive":
                continue

            if message.get("bytes") is not None:
                await dg_connection.send(message["bytes"])
            elif message.get("text") is not None:
                try:
                    control = json.loads(message["text"])
                except json.JSONDecodeError:
                    control = {}
                if control.get("type") == "stop":
                    break
    except WebSocketDisconnect:
        pass
    finally:
        await dg_connection.finish()
        state.mark("asr", "idle", "")