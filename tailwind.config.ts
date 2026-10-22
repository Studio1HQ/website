import svgToDataUri from "mini-svg-data-uri";
import tailwindcssAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

import { flattenColorPalette } from "./lib/flatten-color-palette";

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./mdx-components.tsx",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        primary: ["var(--font-syne)", "sans-serif"],
        secondary: ["var(--font-dm-sans)", "sans-serif"],
        accent: ["var(--font-instrument-serif)", "serif"],
        numeric: ["var(--font-numeric)", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"],
        // Accent role; set in Studio1 Sans (no italic/serif per brand direction)
        editorial: ["var(--font-studio1-sans)", "Inter", "Arial", "sans-serif"],
      },
      // Studio1 Sans ships Regular (400) and Medium (500) only.
      fontWeight: {
        thin: "400",
        extralight: "400",
        light: "400",
        semibold: "500",
        bold: "500",
        extrabold: "500",
        black: "500",
      },
      fontSize: {
        // Landing type scale
        "s1-caption": ["12px", { lineHeight: "1.3", letterSpacing: "-0.03em" }],
        "s1-label": ["12px", { lineHeight: "1.3", letterSpacing: "0.06em" }],
        "s1-body": ["14px", { lineHeight: "1.5", letterSpacing: "-0.03em" }],
        "s1-body-lg": ["16px", { lineHeight: "1.55", letterSpacing: "-0.03em" }],
        "s1-subhead": ["18px", { lineHeight: "1.3", letterSpacing: "-0.03em" }],
        "s1-heading": ["24px", { lineHeight: "1.3", letterSpacing: "-0.03em" }],
        "s1-title": ["32px", { lineHeight: "1.1", letterSpacing: "-0.04em" }],
        "s1-display": ["48px", { lineHeight: "1.1", letterSpacing: "-0.04em" }],
        "s1-hero": ["64px", { lineHeight: "1.05", letterSpacing: "-0.04em" }],
      },
      transitionTimingFunction: {
        s1: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      boxShadow: {
        "s1-raised": "0 2px 8px rgba(0, 0, 0, 0.04)",
        "s1-overlay": "0 8px 32px rgba(0, 0, 0, 0.08)",
      },
      colors: {
        // Landing palette aliases over the site theme (see globals.css)
        "s1-bg": "var(--s1-bg)",
        "s1-subtle": "var(--s1-subtle)",
        "s1-surface": "var(--s1-surface)",
        "s1-line": "var(--s1-line)",
        "s1-line-strong": "var(--s1-line-strong)",
        "s1-ink": "var(--s1-ink)",
        "s1-gray": "var(--s1-gray)",
        "s1-muted": "var(--s1-muted)",
        "s1-tint": "var(--s1-tint)",
        "s1-link": "var(--s1-link)",
        "s1-panel": "var(--s1-panel)",
        "s1-panel-line": "var(--s1-panel-line)",
        "s1-on-panel": "var(--s1-on-panel)",
        "s1-on-panel-gray": "var(--s1-on-panel-gray)",
        border: "hsl(var(--border))",
        primary1: "hsl(var(--primary1))",
        primarySurface: "hsl(var(--primary-surface))",
        primaryDeep: "hsl(var(--primary-deep))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        spotlight: {
          "0%": {
            opacity: "0",
            transform: "translate(-72%, -62%) scale(0.5)",
          },
          "100%": {
            opacity: "1",
            transform: "translate(-50%,-40%) scale(1)",
          },
        },
        marquee: {
          to: {
            transform: "translateX(calc(-100% - var(--gap)))",
          },
          from: {
            transform: "translateX(0)",
          },
        },
        "border-beam": {
          "100%": {
            "offset-distance": "100%",
          },
        },
        shine: {
          "0%": {
            "background-position": "0% 0%",
          },
          "50%": {
            "background-position": "100% 100%",
          },
          to: {
            "background-position": "0% 0%",
          },
        },
        shimmer: {
          from: {
            backgroundPosition: "0 0",
          },
          to: {
            backgroundPosition: "-200% 0",
          },
        },
        "marquee-vertical": {
          from: {
            transform: "translateY(0)",
          },
          to: {
            transform: "translateY(calc(-100% - var(--gap)))",
          },
        },
        ripple: {
          "0%, 100%": {
            transform: "translate(-50%, -50%) scale(1)",
          },
          "50%": {
            transform: "translate(-50%, -50%) scale(0.9)",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        spotlight: "spotlight 2s ease .75s 1 forwards",
        marquee: "marquee var(--duration) infinite linear",
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
        shine: "shine var(--duration) infinite linear",
        shimmer: "shimmer 2s linear infinite",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
        ripple:
          "ripple var(--duration,2s) infinite ease calc(var(--i, 0)*.2s) forwards",
        "fade-in": "fade-in 0.5s ease-out",
        "spin-slow": "spin 60s linear infinite",
        "spin-reverse-slow": "spin 60s linear infinite reverse",
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    typography,
    function ({ matchUtilities, theme }: any) {
      matchUtilities(
        {
          "bg-grid": (value: any) => ({
            backgroundImage: `url("${svgToDataUri(
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="${value}"><path d="M0 .5H31.5V32"/></svg>`,
            )}")`,
          }),
          "bg-grid-small": (value: any) => ({
            backgroundImage: `url("${svgToDataUri(
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="8" height="8" fill="none" stroke="${value}"><path d="M0 .5H31.5V32"/></svg>`,
            )}")`,
          }),
          "bg-dot": (value: any) => ({
            backgroundImage: `url("${svgToDataUri(
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16" height="16" fill="none"><circle fill="${value}" id="pattern-circle" cx="10" cy="10" r="1.6257413380501518"></circle></svg>`,
            )}")`,
          }),
        },
        {
          values: flattenColorPalette(theme("backgroundColor")),
          type: "color",
        },
      );
    },
  ],
};

export default config;
