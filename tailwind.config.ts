import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        surface: "var(--surface)",
        mist: "var(--mist)",
        ink: "var(--ink)",
        slate: "var(--slate)",
        violet: "var(--violet)",
        "violet-strong": "var(--violet-strong)",
        "violet-on": "var(--violet-on)",
        "violet-fg": "var(--violet-fg)",
        "success-ink": "var(--success-ink)",
        "warning-ink": "var(--warning-ink)",
        "danger-ink": "var(--danger-ink)",
        line: "var(--line)",
        success: "var(--success)",
        "success-tint": "var(--success-tint)",
        warning: "var(--warning)",
        "warning-tint": "var(--warning-tint)",
        danger: "var(--danger)",
        "danger-tint": "var(--danger-tint)",
      },
      fontFamily: {
        heading: ["var(--font-poppins)", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["20px", { lineHeight: "28px" }],
        xl: ["28px", { lineHeight: "36px" }],
        "2xl": ["40px", { lineHeight: "48px" }],
      },
      borderRadius: {
        input: "12px",
        card: "16px",
      },
      maxWidth: {
        prose70: "68ch",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
      },
    },
  },
  plugins: [],
};

export default config;
