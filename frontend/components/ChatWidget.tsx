"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, VoiceState } from "@/lib/types";
import { BACKEND_WS_URL, sendChat, speak } from "@/lib/api";
import { startMicStream, type MicStreamHandle } from "@/lib/audio";

interface ChatWidgetProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  voiceState: VoiceState;
  setVoiceState: (s: VoiceState) => void;
  model: string;
  temperature: number;
  voiceId?: string;
  autoSpeak: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onClose?: () => void;
}

export default function ChatWidget({
  messages,
  setMessages,
  voiceState,
  setVoiceState,
  model,
  temperature,
  voiceId,
  autoSpeak,
  sidebarOpen,
  onToggleSidebar,
  onClose,
}: ChatWidgetProps) {
  const [inputValue, setInputValue] = useState("");
  const [interimText, setInterimText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const micRef = useRef<MicStreamHandle | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, interimText]);

  async function runTurn(finalTranscript: string) {
    setVoiceState("processing");
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: finalTranscript };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInterimText("");

    try {
      const reply = await sendChat(nextMessages, model, temperature);
      const agentMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: reply };
      setMessages((prev) => [...prev, agentMsg]);

      if (autoSpeak) {
        await playReply(reply);
      } else {
        setVoiceState("idle");
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Something went wrong reaching the assistant." },
      ]);
      setVoiceState("idle");
    }
  }

  async function playReply(text: string) {
    try {
      setVoiceState("speaking");
      const blob = await speak(text, voiceId);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setVoiceState("idle");
      audio.onerror = () => setVoiceState("idle");
      await audio.play();
    } catch (err) {
      console.error(err);
      setVoiceState("idle");
    }
  }

  function handleSend() {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    runTurn(text);
  }

async function toggleMic() {
    if (voiceState === "listening") {
      micRef.current?.stop();
      micRef.current = null;
      wsRef.current?.send(JSON.stringify({ type: "stop" }));
      return;
    }
    if (voiceState !== "idle") return;

    setInterimText("");
    const ws = new WebSocket(`${BACKEND_WS_URL}/ws/stt`);
    wsRef.current = ws;

    // Safety net: if no speech_final arrives within 15s of the last
    // transcript update, force-stop so the mic never gets stuck listening.
    let watchdog: ReturnType<typeof setTimeout> | null = null;
    const resetWatchdog = () => {
      if (watchdog) clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        micRef.current?.stop();
        micRef.current = null;
        ws.close();
        setVoiceState("idle");
        setInterimText("");
      }, 15000);
    };

    ws.onopen = async () => {
      setVoiceState("listening");
      micRef.current = await startMicStream(ws);
      resetWatchdog();
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "transcript") {
        setInterimText(data.text);
        resetWatchdog();
      } else if (data.type === "speech_final") {
        if (watchdog) clearTimeout(watchdog);
        micRef.current?.stop();
        micRef.current = null;
        ws.close();
        if (data.text?.trim()) {
          runTurn(data.text.trim());
        } else {
          setVoiceState("idle");
        }
      } else if (data.type === "error") {
        if (watchdog) clearTimeout(watchdog);
        console.error("STT error:", data.message);
        micRef.current?.stop();
        micRef.current = null;
        setVoiceState("idle");
      }
    };

    ws.onclose = () => {
      if (watchdog) clearTimeout(watchdog);
      wsRef.current = null;
    };
  }
  const isListening = voiceState === "listening";
  const isBusy = voiceState === "processing" || voiceState === "speaking";

  return (
    <div className="flex h-screen w-full flex-1 flex-col overflow-hidden bg-chat-bg">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/10 px-6 py-4">
        <button
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Hide settings" : "Show settings"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-chat-text/50 transition hover:bg-white/5 hover:text-chat-text"
        >
          <PanelToggleIcon size={18} />
        </button>
        <span className="flex-1 text-[15px] font-semibold text-chat-text">Voice Agent</span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="flex h-7 w-7 items-center justify-center rounded-full text-chat-text/50 transition hover:bg-white/5 hover:text-chat-text"
          >
            ✕
          </button>
        )}
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-6 py-6">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-end gap-1.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[65%] rounded-2xl px-4 py-2.5 text-[15px] leading-[1.45] ${
                m.role === "user"
                  ? "bg-chat-userBubble text-chat-text"
                  : "bg-chat-agentBubble text-chat-text"
              }`}
            >
              {m.content}
            </div>
            {m.role === "assistant" && !autoSpeak && (
              <button
                onClick={() => playReply(m.content)}
                disabled={isBusy}
                aria-label="Play reply aloud"
                className="mb-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-chat-text/40 transition hover:bg-white/5 hover:text-chat-text disabled:opacity-30"
              >
                <SpeakerIcon />
              </button>
            )}
          </div>
        ))}
        {interimText && (
          <div className="flex justify-end">
            <div className="max-w-[65%] rounded-2xl bg-chat-userBubble/60 px-4 py-2.5 text-[15px] italic text-chat-text/70">
              {interimText}
            </div>
          </div>
        )}
        {voiceState === "processing" && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-chat-agentBubble px-4 py-2.5 text-[15px] text-chat-text/50">
              …
            </div>
          </div>
        )}
      </div>

      {/* Input row */}
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 border-t border-white/10 px-6 py-4">
        <div className="flex flex-1 items-center rounded-full bg-chat-agentBubble px-4 py-2.5">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask anything, or tap the mic to start speaking..."
            disabled={isListening || isBusy}
            className="w-full bg-transparent text-[15px] text-chat-text placeholder:text-chat-text/40 outline-none disabled:opacity-50"
          />
        </div>

        <button
          onClick={toggleMic}
          disabled={isBusy}
          aria-label={isListening ? "Stop listening" : "Start voice input"}
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
            isListening ? "bg-accent text-white mic-pulse" : "bg-chat-agentBubble text-chat-text hover:bg-white/10"
          }`}
        >
          {isListening ? <Waveform /> : <MicIcon />}
        </button>

        <button
          onClick={handleSend}
          disabled={isListening || isBusy || !inputValue.trim()}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-chat-text text-chat-bg transition hover:opacity-90 disabled:opacity-30"
        >
          <ArrowUpIcon />
        </button>
      </div>
    </div>
  );
}

function PanelToggleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <line x1="10" y1="4" x2="10" y2="20" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="4 9 9 9 13 5 13 19 9 15 4 15 4 9" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
    </svg>
  );
}

function Waveform() {
  return (
    <div className="flex h-4 items-end gap-[2px]">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="waveform-bar w-[3px] rounded-full bg-white"
          style={{ height: "100%", animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}