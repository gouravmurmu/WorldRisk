import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#08090B",
        panel: "#0D1014",
        panel2: "#11151A",
        border: "rgba(255,255,255,0.08)",
        borderStrong: "rgba(255,255,255,0.14)",
        muted: "#8A93A3",
        subtle: "#5B6472",
        accent: "#3B82F6",
        category: {
          geopolitical: "#EF4444",
          disaster: "#F97316",
          weather: "#3B82F6",
          cyber: "#A855F7",
          infrastructure: "#EAB308",
          economic: "#22C55E",
          health: "#EC4899",
          humanitarian: "#F59E0B",
          supplychain: "#14B8A6",
          other: "#6B7280",
        },
        severity: {
          minimal: "#4B5563",
          low: "#3B82F6",
          moderate: "#EAB308",
          high: "#F97316",
          critical: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.4)",
      },
      animation: {
        "pulse-slow": "pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
