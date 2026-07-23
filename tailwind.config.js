/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ---- AIGRO design tokens (design.md §2) ---- */
        bg: "hsl(var(--bg) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        overlay: "hsl(var(--overlay) / <alpha-value>)",
        ink: {
          DEFAULT: "hsl(var(--ink) / <alpha-value>)",
          hover: "hsl(var(--ink-hover) / <alpha-value>)",
          solid: "hsl(var(--ink-solid) / <alpha-value>)",
          soft: "hsl(var(--ink-soft) / <alpha-value>)",
        },
        gold: {
          DEFAULT: "hsl(var(--gold) / <alpha-value>)",
          soft: "hsl(var(--gold-soft) / <alpha-value>)",
        },
        /* Cinematic dark band (hero + inverted footer, theme-independent) */
        band: {
          bg: "hsl(var(--band-bg) / <alpha-value>)",
          surface: "hsl(var(--band-surface) / <alpha-value>)",
          card: "hsl(var(--band-card) / <alpha-value>)",
          text: "hsl(var(--band-text) / <alpha-value>)",
          "text-secondary": "hsl(var(--band-text-secondary) / <alpha-value>)",
          "text-muted": "hsl(var(--band-text-muted) / <alpha-value>)",
          border: "hsl(var(--band-border) / <alpha-value>)",
          "border-strong": "hsl(var(--band-border-strong) / <alpha-value>)",
          ink: "hsl(var(--band-ink) / <alpha-value>)",
          "ink-solid": "hsl(var(--band-ink-solid) / <alpha-value>)",
          "ink-hover": "hsl(var(--band-ink-hover) / <alpha-value>)",
          "ink-soft": "hsl(var(--band-ink-soft) / <alpha-value>)",
          gold: "hsl(var(--band-gold) / <alpha-value>)",
          warning: "hsl(var(--band-warning) / <alpha-value>)",
        },
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        error: "hsl(var(--error) / <alpha-value>)",
        "text-primary": "hsl(var(--text-primary) / <alpha-value>)",
        "text-secondary": "hsl(var(--text-secondary) / <alpha-value>)",
        "text-muted": "hsl(var(--text-muted) / <alpha-value>)",
        "border-strong": "hsl(var(--border-strong) / <alpha-value>)",

        /* ---- shadcn remap (design.md §7: primary→ink, destructive→error) ---- */
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary: "hsl(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      /* Type scale (design.md §3.2, 1.25 modular tuned for CJK) */
      fontSize: {
        /* Cinematic hero display — MasterClass-scale editorial headline */
        "display-hero": ["84px", { lineHeight: "1.06", letterSpacing: "-0.01em", fontWeight: "550" }],
        "display-xl": ["64px", { lineHeight: "1.1", letterSpacing: "-0.01em", fontWeight: "550" }],
        "display-lg": ["48px", { lineHeight: "1.15", letterSpacing: "-0.01em", fontWeight: "550" }],
        display: ["40px", { lineHeight: "1.2", letterSpacing: "-0.005em", fontWeight: "550" }],
        h2: ["32px", { lineHeight: "1.25", letterSpacing: "-0.005em", fontWeight: "550" }],
        h3: ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        h4: ["20px", { lineHeight: "1.35", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.7", fontWeight: "400" }],
        body: ["16px", { lineHeight: "1.7", fontWeight: "400" }],
        "body-sm": ["15px", { lineHeight: "1.65", fontWeight: "400" }],
        label: ["14px", { lineHeight: "1.4", letterSpacing: "0.01em", fontWeight: "500" }],
        caption: ["13px", { lineHeight: "1.45", letterSpacing: "0.01em", fontWeight: "400" }],
        overline: ["12px", { lineHeight: "1.3", letterSpacing: "0.12em", fontWeight: "600" }],
        metric: ["36px", { lineHeight: "1.1", fontWeight: "500" }],
      },
      /* Radius (design.md §4): sm 4 / md 8 / lg 12 — no full-round cards */
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,27,25,0.04)",
      },
      maxWidth: {
        container: "1200px",
        prose: "44rem",
      },
      keyframes: {
        "badge-sheen": {
          from: { transform: "translateX(-120%)" },
          to: { transform: "translateX(120%)" },
        },
        "caret-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "badge-sheen": "badge-sheen 900ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "caret-blink": "caret-blink 530ms ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
