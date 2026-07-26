export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  interim?: boolean;
}

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

export type ProviderRole = "llm" | "asr" | "tts";
export type ProviderHealth = "idle" | "connected" | "error";

export interface ProviderStatusEntry {
  state: ProviderHealth;
  detail: string;
  updated_at: number;
}

export interface StatusResponse {
  providers: Record<ProviderRole, ProviderStatusEntry>;
  models: { llm: string[] };
  missing_keys: string[];
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  description?: string;
}

export interface UsageResponse {
  used: number;
  limit: number;
  remaining: number;
}
