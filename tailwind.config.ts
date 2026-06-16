import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./modules/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0a0c10",
          surface: "#11141b",
          elevated: "#171b24",
          hover: "#1d222d",
        },
        border: {
          subtle: "#232936",
          DEFAULT: "#2b323f",
        },
        brand: {
          DEFAULT: "#f5b301",
          50: "#fff8e1",
          400: "#ffc933",
          500: "#f5b301",
          600: "#cc9400",
        },
        accent: {
          DEFAULT: "#6366f1",
          500: "#6366f1",
          600: "#4f46e5",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
        info: "#38bdf8",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};

export default config;
