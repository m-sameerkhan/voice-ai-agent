"""
Entrypoint for the voice agent backend.

Run with:  uvicorn app:app --reload --port 8000

Routes:
  POST /api/chat     -> transcript + history in, Groq reply out
  WS   /ws/stt        -> streaming mic audio in, interim/final transcripts out
  POST /api/speak     -> reply text in, ElevenLabs audio out
  GET  /api/voices    -> ElevenLabs voices available on this account
  GET  /api/status    -> live health of all three providers (Signal Path)
  GET  /api/usage     -> ElevenLabs character usage/credits
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from config import FRONTEND_ORIGIN, DEFAULT_GROQ_MODEL, DEFAULT_TEMPERATURE, missing_keys
from providers import groq_client, elevenlabs_client, deepgram_client
import state

app = FastAPI(title="Voice Agent Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    history: list[ChatMessage]
    model: str = DEFAULT_GROQ_MODEL
    temperature: float = DEFAULT_TEMPERATURE


class ChatResponse(BaseModel):
    reply: str


class SpeakRequest(BaseModel):
    text: str
    voice_id: str | None = None


@app.get("/api/health")
async def health():
    return {"ok": True}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    history = [m.model_dump() for m in req.history]
    reply = groq_client.chat(history, model=req.model, temperature=req.temperature)
    return ChatResponse(reply=reply)


@app.post("/api/speak")
async def speak(req: SpeakRequest):
    audio = elevenlabs_client.text_to_speech(req.text, voice_id=req.voice_id)
    return Response(content=audio, media_type="audio/mpeg")


@app.get("/api/voices")
async def voices():
    return {"voices": elevenlabs_client.list_voices()}


@app.get("/api/usage")
async def usage():
    return elevenlabs_client.get_usage()


@app.get("/api/status")
async def status():
    return {
        "providers": state.snapshot(),
        "models": {
            "llm": groq_client.AVAILABLE_MODELS,
        },
        "missing_keys": missing_keys(),
    }


@app.websocket("/ws/stt")
async def ws_stt(websocket: WebSocket):
    await websocket.accept()
    try:
        await deepgram_client.run_stream(websocket)
    except WebSocketDisconnect:
        pass
