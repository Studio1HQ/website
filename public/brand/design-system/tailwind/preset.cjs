// Studio1 Tailwind v3 preset. Mirrors tokens/tokens.json.
// tailwind.config.js:  presets: [require('./design-system/tailwind/preset.cjs')]
// Also import design-system/css/fonts.css once in your global CSS.

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Studio1 Sans"', 'Inter', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      fontWeight: {
        regular: '400',
        medium: '500',
      },
      fontSize: {
        caption: ['12px', { lineHeight: '1.3' }],
        body: ['14px', { lineHeight: '1.3' }],
        'body-lg': ['16px', { lineHeight: '1.55' }],
        subhead: ['18px', { lineHeight: '1.3' }],
        heading: ['24px', { lineHeight: '1.3' }],
        title: ['32px', { lineHeight: '1.1', letterSpacing: '-0.04em' }],
        display: ['48px', { lineHeight: '1.1', letterSpacing: '-0.04em' }],
        hero: ['64px', { lineHeight: '1.1', letterSpacing: '-0.04em' }],
        code: ['13px', { lineHeight: '1.6', letterSpacing: '0em' }],
      },
      letterSpacing: {
        'tight-s1': '-0.04em',
        s1: '-0.03em',
        caps: '0.06em',
      },
      colors: {
        neutral: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f2f2f2',
          200: '#e8e8e8',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#707070',
          600: '#525252',
          700: '#3a3a3a',
          800: '#1f1f1f',
          900: '#141414',
          950: '#0a0a0a',
        },
        sky: {
          50: '#f0faff',
          100: '#ddf4ff',
          200: '#b6e3ff',
          400: '#58a6ff',
          600: '#0969da',
          800: '#0a3069',
        },
        brand: {
          red: '#fe3c34',
          orange: '#fe8b4b',
        },
        ink: '#0a0a0a',
        gray: '#707070',
        surface: '#f2f2f2',
        success: { DEFAULT: '#1a7f37', bg: '#dafbe1' },
        warning: { DEFAULT: '#9a6700', bg: '#fff8c5' },
        danger: { DEFAULT: '#cf222e', bg: '#ffebe9' },
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '10px',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, #fe3c34, #fe8b4b)',
      },
      boxShadow: {
        raised: '0 2px 8px rgba(0, 0, 0, 0.04)',
        overlay: '0 8px 32px rgba(0, 0, 0, 0.08)',
      },
      transitionTimingFunction: {
        s1: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
};
