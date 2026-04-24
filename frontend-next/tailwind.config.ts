import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0A84FF",
          dark: "#0066CC",
          light: "#338FFF",
          soft: "rgba(10,132,255,0.12)",
          softer: "rgba(10,132,255,0.05)",
          ring: "rgba(10,132,255,0.20)",
        },
        success: {
          DEFAULT: "#16A34A",
          light: "#22C55E",
          bg: "rgba(22,163,74,0.08)",
          border: "rgba(22,163,74,0.16)",
        },
        danger: {
          DEFAULT: "#DC2626",
          light: "#EF4444",
          bg: "rgba(220,38,38,0.08)",
          border: "rgba(220,38,38,0.16)",
        },
        warning: {
          DEFAULT: "#D97706",
          light: "#F59E0B",
          bg: "rgba(217,119,6,0.08)",
          border: "rgba(217,119,6,0.16)",
        },
        surface: {
          bg: "#F5F7FA",
          "bg-alt": "#ECEEF2",
          card: "#FFFFFF",
          muted: "#F8FAFC",
          sidebar: "#FAFBFC",
        },
        ink: {
          DEFAULT: "#0D1117",
          muted: "#6B7280",
          xmuted: "#9CA3AF",
          soft: "#374151",
        },
        border: {
          DEFAULT: "rgba(15,23,42,0.07)",
          strong: "rgba(15,23,42,0.12)",
          focus: "rgba(10,132,255,0.50)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Cascadia Code", "Consolas", "monospace"],
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "12px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(16,24,40,0.04), 0 0 0 1px rgba(16,24,40,0.03)",
        sm: "0 2px 6px rgba(16,24,40,0.06), 0 0 0 1px rgba(16,24,40,0.03)",
        DEFAULT: "0 4px 16px rgba(16,24,40,0.08), 0 0 0 1px rgba(16,24,40,0.03)",
        md: "0 8px 28px rgba(16,24,40,0.10), 0 0 0 1px rgba(16,24,40,0.04)",
        lg: "0 20px 60px rgba(16,24,40,0.14)",
        glow: "0 0 0 3px rgba(10,132,255,0.18), 0 4px 16px rgba(10,132,255,0.14)",
        "glow-sm": "0 0 0 2px rgba(10,132,255,0.16)",
        "inner-sm": "inset 0 1px 2px rgba(16,24,40,0.06)",
      },
      backgroundImage: {
        "primary-gradient": "linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)",
        "surface-gradient": "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
        "sidebar-gradient": "linear-gradient(180deg, #FAFBFC 0%, #F5F7FA 100%)",
        "auth-pattern": "radial-gradient(ellipse at 20% 50%, rgba(10,132,255,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(10,132,255,0.04) 0%, transparent 50%)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "slide-up": "slide-up 260ms cubic-bezier(.22,1,.36,1)",
        "slide-in-right": "slide-in-right 220ms cubic-bezier(.22,1,.36,1)",
        "scale-in": "scale-in 200ms cubic-bezier(.22,1,.36,1)",
        "pulse-dot": "pulse-dot 2.4s ease-in-out infinite",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
};

export default config;
