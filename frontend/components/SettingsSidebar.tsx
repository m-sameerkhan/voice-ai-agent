"use client";

import { useState } from "react";
import type { ElevenLabsVoice, ProviderHealth, StatusResponse, UsageResponse } from "@/lib/types";
import { GroqIcon, DeepgramIcon, ElevenLabsIcon } from "./icons/ProviderIcons";

interface SettingsSidebarProps {
  open: boolean;
  model: string;
  setModel: (m: string) => void;
  models: string[];
  temperature: number;
  setTemperature: (t: number) => void;
  voices: ElevenLabsVoice[];
  selectedVoice: string;
  setSelectedVoice: (v: string) => void;
  usage: UsageResponse | null;
  status: StatusResponse | null;
  onClear: () => void;
  autoSpeak: boolean;
  setAutoSpeak: (v: boolean) => void;
}

export default function SettingsSidebar({
  open,
  model,
  setModel,
  models,
  temperature,
  setTemperature,
  voices,
  selectedVoice,
  setSelectedVoice,
  usage,
  status,
  onClear,
  autoSpeak,
  setAutoSpeak,
}: SettingsSidebarProps) {
  const [showAsrInfo, setShowAsrInfo] = useState(false);

  const selectedVoiceObj = voices.find((v) => v.voice_id === selectedVoice);

  return (
    <div
      className={`relative flex h-screen flex-col overflow-hidden border-r border-white/10 bg-sidebar-bg text-sidebar-text transition-all duration-300 ${
        open ? "w-[340px]" : "w-0"
      }`}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto px-5 pb-6 pt-6">
            <h2 className="mb-6 text-sm font-semibold text-sidebar-text">Settings</h2>

            {/* INPUT CHAIN */}
            <Section label="Input chain">
              <Field label="LLM model">
                <IconSelect
                  id="llm-model-select"
                  name="llmModel"
                  value={model}
                  onChange={setModel}
                  icon={<GroqIcon size={16} />}
                >
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </IconSelect>
              </Field>

              <Field label="Temperature">
                <div className="flex items-center justify-between text-xs text-sidebar-meta">
                  <span className="font-mono tabular-nums text-sidebar-text">{temperature.toFixed(2)}</span>
                </div>
                <input
                  id="temperature-range"
                  name="temperature"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="accent-range mt-1 w-full accent-accent"
                />
                <div className="flex justify-between text-[11px] text-sidebar-meta">
                  <span>0.00</span>
                  <span>1.00</span>
                </div>
              </Field>

              <Field label="ASR backend">
                <div className="relative">
                  <div className="flex items-center gap-2.5 rounded-md border border-white/10 bg-sidebar-bg2 px-3 py-2 text-sm">
                    <DeepgramIcon size={16} />
                    <span className="flex-1 truncate font-semibold uppercase tracking-wide text-sidebar-text">
                      Deepgram
                    </span>
                    <span className="text-[11px] normal-case tracking-normal text-sidebar-meta">
                      streaming
                    </span>
                    <button
                      type="button"
                      onMouseEnter={() => setShowAsrInfo(true)}
                      onMouseLeave={() => setShowAsrInfo(false)}
                      aria-label="ASR feature info"
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-sidebar-meta text-[10px] text-sidebar-meta"
                    >
                      ?
                    </button>
                  </div>
                  {showAsrInfo && (
                    <div className="absolute right-0 top-9 z-10 w-52 rounded-md border border-white/10 bg-sidebar-bg2 p-3 text-[11px] text-sidebar-meta shadow-lg">
                      <p className="mb-1 text-sidebar-text">Active features</p>
                      <ul className="space-y-0.5">
                        <li>smart_format</li>
                        <li>interim_results</li>
                        <li>endpointing</li>
                      </ul>
                    </div>
                  )}
                </div>
              </Field>
            </Section>

            <Divider />

            {/* VOICE (ELEVENLABS) */}
            <Section
              label={
                <span className="flex items-center gap-1.5">
                  <ElevenLabsIcon size={14} />
                  <span className="uppercase tracking-wide">Voice</span>
                </span>
              }
            >
              <Field label="Voice">
                <IconSelect
                  id="voice-select"
                  name="voice"
                  value={selectedVoice}
                  onChange={setSelectedVoice}
                  icon={<ElevenLabsIcon size={16} />}
                >
                  {voices.map((v) => (
                    <option key={v.voice_id} value={v.voice_id}>
                      {v.name}
                      {v.description ? ` — ${v.description}` : ""}
                    </option>
                  ))}
                </IconSelect>
              </Field>

              <label htmlFor="auto-speak-toggle" className="mt-1 flex items-center justify-between text-[13px] text-sidebar-text">
                <span>Auto-speak replies</span>
                <button
                  id="auto-speak-toggle"
                  type="button"
                  role="switch"
                  aria-checked={autoSpeak}
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  className={`h-5 w-9 rounded-full transition ${autoSpeak ? "bg-accent" : "bg-white/15"}`}
                >
                  <span
                    className={`block h-4 w-4 rounded-full bg-white shadow transition ${
                      autoSpeak ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </label>

              <div className="mt-2 text-[11px] leading-[1.4] text-sidebar-meta">
                {usage ? (
                  <>
                    <p>
                      Credits: <span className="font-mono tabular-nums text-sidebar-text">{usage.used}/{usage.limit}</span>
                    </p>
                    <p>
                      characters used this period · {usage.remaining.toLocaleString()} remaining
                    </p>
                  </>
                ) : (
                  <p>Usage unavailable — check ELEVENLABS_API_KEY.</p>
                )}
              </div>
            </Section>

            <Divider />

            {/* SIGNAL PATH */}
            <Section label="Signal path">
              <div className="space-y-2.5">
                <SignalRow
                  role="LLM"
                  icon={<GroqIcon size={14} />}
                  name="Groq"
                  detail={model}
                  health={status?.providers.llm.state ?? "idle"}
                />
                <SignalRow
                  role="ASR"
                  icon={<DeepgramIcon size={14} />}
                  name="Deepgram"
                  detail="nova-2 (streaming)"
                  health={status?.providers.asr.state ?? "idle"}
                />
                <SignalRow
                  role="TTS"
                  icon={<ElevenLabsIcon size={14} />}
                  name="ElevenLabs"
                  detail={selectedVoiceObj?.name ?? ""}
                  health={status?.providers.tts.state ?? "idle"}
                />
              </div>
            </Section>

            <Divider />

            {/* SESSION */}
            <Section label="Session">
              <button
                type="button"
                onClick={onClear}
                className="w-full rounded-md border border-white/15 py-2.5 text-sm text-sidebar-text transition hover:bg-white/5"
              >
                Clear conversation
              </button>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-sidebar-label">{label}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] text-sidebar-meta">{label}</p>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="my-5 h-px w-full bg-white/10" />;
}

function IconSelect({
  value,
  onChange,
  icon,
  children,
  id,
  name,
}: {
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  id: string;
  name: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-sidebar-bg2 px-3 py-2 text-sm">
      {icon}
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full truncate bg-transparent text-sidebar-text outline-none [&>option]:bg-sidebar-bg2 [&>option]:text-sidebar-text"
      >
        {children}
      </select>
    </div>
  );
}

function healthColor(health: ProviderHealth): string {
  if (health === "connected") return "bg-success status-dot-connected";
  if (health === "error") return "bg-accent";
  return "bg-white/20";
}

function SignalRow({
  role,
  icon,
  name,
  detail,
  health,
}: {
  role: string;
  icon: React.ReactNode;
  name: string;
  detail: string;
  health: ProviderHealth;
}) {
  return (
    <div className="flex items-center gap-2 font-mono text-[12px]">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${healthColor(health)}`} />
      <span className="w-8 shrink-0 text-sidebar-meta">{role}</span>
      {icon}
      <span className="truncate font-semibold uppercase tracking-wide text-sidebar-text">
        {name}
      </span>
      <span className="truncate normal-case tracking-normal text-sidebar-meta">
        {detail}
      </span>
    </div>
  );
}