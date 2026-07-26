import type { ChatMessage, ElevenLabsVoice, StatusResponse, UsageResponse } from "./types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
export const BACKEND_WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL ?? "ws://localhost:8000";

export async function sendChat(
  history: ChatMessage[],
  model: string,
  temperature: number
): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      history: history.map((m) => ({ role: m.role, content: m.content })),
      model,
      temperature,
    }),
  });
  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }
  const data = await res.json();
  return data.reply as string;
}

export async function speak(text: string, voiceId?: string): Promise<Blob> {
  const res = await fetch(`${BACKEND_URL}/api/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice_id: voiceId }),
  });
  if (!res.ok) {
    throw new Error(`Speak request failed: ${res.status}`);
  }
  return res.blob();
}

export async function fetchVoices(): Promise<ElevenLabsVoice[]> {
  const res = await fetch(`${BACKEND_URL}/api/voices`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.voices as ElevenLabsVoice[];
}

export async function fetchUsage(): Promise<UsageResponse | null> {
  const res = await fetch(`${BACKEND_URL}/api/usage`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchStatus(): Promise<StatusResponse | null> {
  const res = await fetch(`${BACKEND_URL}/api/status`);
  if (!res.ok) return null;
  return res.json();
}
