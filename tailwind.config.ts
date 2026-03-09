import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  theme: {
    extend: {
      colors: {
        base: "rgb(var(--color-base) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          alt: "rgb(var(--color-surface-alt) / <alpha-value>)",
          elevated: "rgb(var(--color-surface-elevated) / <alpha-value>)",
        },
        card: {
          DEFAULT: "rgb(var(--color-card) / <alpha-value>)",
          hover: "rgb(var(--color-card-hover) / <alpha-value>)",
          alt: "rgb(var(--color-card-alt) / <alpha-value>)",
        },
        input: "rgb(var(--color-input) / <alpha-value>)",
        border: {
          DEFAULT: "rgb(var(--color-border) / <alpha-value>)",
          strong: "rgb(var(--color-border-strong) / <alpha-value>)",
          glow: "rgb(var(--color-border-glow) / <alpha-value>)",
        },
        content: {
          primary: "rgb(var(--color-content-primary) / <alpha-value>)",
          secondary: "rgb(var(--color-content-secondary) / <alpha-value>)",
          muted: "rgb(var(--color-content-muted) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          success: "rgb(var(--color-accent-success) / <alpha-value>)",
          danger: "rgb(var(--color-accent-danger) / <alpha-value>)",
          warning: "rgb(var(--color-accent-warning) / <alpha-value>)",
        },
      },
      animation: {
        "orb-1": "orb-drift-1 12s ease-in-out infinite",
        "orb-2": "orb-drift-2 16s ease-in-out infinite",
        "orb-3": "orb-drift-3 10s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
