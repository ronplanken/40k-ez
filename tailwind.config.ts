import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          app: "var(--color-bg-app)",
          card: "var(--color-bg-card)",
          elevated: "var(--color-bg-elevated)",
          input: "var(--color-bg-input)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
        },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        border: {
          DEFAULT: "var(--color-border)",
          focus: "var(--color-border-focus)",
        },
        // Panel chrome: hairlines and the faint fill on nested blocks.
        line: {
          DEFAULT: "var(--color-line)",
          strong: "var(--color-line-strong)",
        },
        soft: "var(--color-surface-soft)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Barlow", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Rajdhani", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      fontSize: {
        xs: ["11px", { lineHeight: "1.4", fontWeight: "500" }],
        sm: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        base: ["15px", { lineHeight: "1.6", fontWeight: "400" }],
        lg: ["18px", { lineHeight: "1.4", fontWeight: "500" }],
        xl: ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "2xl": ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        "3xl": ["48px", { lineHeight: "1.1", fontWeight: "700" }],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        md: "4px",
        lg: "6px",
        xl: "8px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.5)",
        md: "0 4px 12px rgba(0,0,0,0.4)",
        lg: "0 8px 24px rgba(0,0,0,0.5)",
      },
      transitionDuration: {
        fast: "100ms",
        normal: "200ms",
        slow: "300ms",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
