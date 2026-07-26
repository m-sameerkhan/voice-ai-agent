/**
 * Provider icons for the signal path, dropdowns, and sidebar labels.
 *
 * - ElevenLabs: official mark, inlined from simple-icons' elevenlabs.svg
 *   (simple-icons only ships it as a raw asset, no JS export).
 * - Deepgram: official mark, inlined from simple-icons' deepgram.svg
 *   (same situation — raw asset only).
 * - Groq: simple-icons has no Groq asset at all. Using a lightning-bolt
 *   glyph in Groq's brand orange as a stand-in — swap in their exact
 *   mark from https://groq.com/brand/ whenever you have the official
 *   SVG in hand.
 */

import { Zap } from "lucide-react";

interface IconProps {
  size?: number;
  className?: string;
}

export function GroqIcon({ size = 18, className = "" }: IconProps) {
  return (
    <Zap
      size={size}
      className={`shrink-0 ${className}`}
      style={{ color: "#F55036" }}
      fill="#F55036"
      aria-label="Groq"
    />
  );
}

export function ElevenLabsIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="#FFFFFF"
      className={`shrink-0 ${className}`}
      aria-label="ElevenLabs"
    >
      <path d="M4.6035 0v24h4.9317V0zm9.8613 0v24h4.9317V0z" />
    </svg>
  );
}

export function DeepgramIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="#13EF93"
      className={`shrink-0 ${className}`}
      aria-label="Deepgram"
    >
      <path d="M11.203 24H1.517a.364.364 0 0 1-.258-.62l6.239-6.275a.366.366 0 0 1 .259-.108h3.52c2.723 0 5.025-2.127 5.107-4.845a5.004 5.004 0 0 0-4.999-5.148H7.613v4.646c0 .2-.164.364-.365.364H.968a.365.365 0 0 1-.363-.364V.364C.605.164.768 0 .969 0h10.416c6.684 0 12.111 5.485 12.01 12.187C23.293 18.77 17.794 24 11.202 24z" />
    </svg>
  );
}