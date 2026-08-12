import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep navy brand + dark backgrounds
        navy: {
          DEFAULT: "#1A3A6B",
          50: "#eef3fb",
          100: "#d6e2f4",
          200: "#adc4e8",
          300: "#7ea1d8",
          400: "#4f7cc4",
          500: "#2f5da8",
          600: "#1A3A6B",
          700: "#152f57",
          800: "#0f2340",
          900: "#0a1a30",
        },
        ink: {
          DEFAULT: "#0a0f1e",
          soft: "#0d1426",
          card: "#111a2e",
          border: "#1e2b47",
        },
        accent: "#4f8cff",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(79, 140, 255, 0.45)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "gradient-pan": "gradient-pan 12s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;
