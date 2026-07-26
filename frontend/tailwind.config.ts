import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#E5484D",
          light: "#EF5350",
        },
        success: "#22C55E",
        chat: {
          bg: "#1B1B1A",
          userBubble: "#33302D",
          agentBubble: "#242423",
          text: "#F5F5F5",
        },
        sidebar: {
          bg: "#0E0F11",
          bg2: "#121316",
          label: "#8A8F98",
          text: "#F5F5F5",
          meta: "#9CA3AF",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;