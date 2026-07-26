"use client";

import { useEffect, useState } from "react";
import ChatWidget from "@/components/ChatWidget";
import SettingsSidebar from "@/components/SettingsSidebar";
import { fetchStatus, fetchUsage, fetchVoices } from "@/lib/api";
import type { ChatMessage, ElevenLabsVoice, StatusResponse, UsageResponse, VoiceState } from "@/lib/types";

const FALLBACK_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");

  const [model, setModel] = useState(FALLBACK_MODELS[0]);
  const [temperature, setTemperature] = useState(0.4);
  const [autoSpeak, setAutoSpeak] = useState(false);

  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchVoices().then((v) => {
      setVoices(v);
      if (v.length > 0) setSelectedVoice(v[0].voice_id);
    });
    fetchUsage().then(setUsage);
  }, []);

  useEffect(() => {
    const tick = () => fetchStatus().then(setStatus);
    tick();
    const id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, []);

  const models = status?.models.llm ?? FALLBACK_MODELS;

  return (
    <main className="flex h-screen w-full overflow-hidden bg-chat-bg">
      <SettingsSidebar
        open={sidebarOpen}
        model={model}
        setModel={setModel}
        models={models}
        temperature={temperature}
        setTemperature={setTemperature}
        voices={voices}
        selectedVoice={selectedVoice}
        setSelectedVoice={setSelectedVoice}
        usage={usage}
        status={status}
        onClear={() => setMessages([])}
        autoSpeak={autoSpeak}
        setAutoSpeak={setAutoSpeak}
      />
      <ChatWidget
        messages={messages}
        setMessages={setMessages}
        voiceState={voiceState}
        setVoiceState={setVoiceState}
        model={model}
        temperature={temperature}
        voiceId={selectedVoice}
        autoSpeak={autoSpeak}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />
    </main>
  );
}