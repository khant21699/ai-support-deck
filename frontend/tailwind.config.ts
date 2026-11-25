import type { Config } from "tailwindcss";

// The Copy Desk: a newsprint desk, proof slips lying on it, ink, and one blue editing pencil.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F0F0EB", // the desk everything lies on
        slip: "#FBFBF9", // a proof slip: panels, inputs, rows
        ink: "#181816",
        muted: "#5A5A54", // secondary text, 6:1 on paper
        rule: "#D4D3CA", // hairlines
        "rule-strong": "#A7A69B", // input borders, stronger dividers
        pencil: { DEFAULT: "#2742D1", dark: "#1B2FA0", wash: "#E4E8FA" }, // the editor's blue pencil: actions and focus
        proof: { DEFAULT: "#BF2F26", wash: "#F8E4E1" }, // proof-red: urgent, reject, errors
        caution: { DEFAULT: "#7A5200", wash: "#F6EBCB" }, // "no source found", slow AI
        done: { DEFAULT: "#1E6B45", wash: "#DFEFE5" }, // resolved
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"], // only for words being edited: messages and drafts
      },
      borderRadius: { DEFAULT: "3px", md: "4px", lg: "6px" },
      boxShadow: {
        slip: "0 1px 0 rgb(24 24 22 / 0.06), 0 12px 24px -16px rgb(24 24 22 / 0.35)",
      },
      keyframes: {
        land: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        land: "land 300ms cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
