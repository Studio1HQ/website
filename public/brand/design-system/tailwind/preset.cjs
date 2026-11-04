// Studio1 Tailwind v3 preset: the paper design. Mirrors tokens/tokens.json.
// tailwind.config.js:  presets: [require('./design-system/tailwind/preset.cjs')]
// Also import design-system/css/fonts.css once in your global CSS.
// Ink and paper tints: use opacity modifiers, e.g. text-ink/70, text-ink/60, border-ink/[0.14], text-paper/70.

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
        frame: ['11px', { lineHeight: '1' }],
        caption: ['12px', { lineHeight: '1.3' }],
        'body-sm': ['14px', { lineHeight: '1.3' }],
        body: ['16px', { lineHeight: '1.6' }],
        'body-lg': ['18px', { lineHeight: '1.6' }],
        subhead: ['20px', { lineHeight: '1.3', letterSpacing: '-0.025em' }],
        heading: ['24px', { lineHeight: '1.3', letterSpacing: '-0.035em' }],
        title: ['32px', { lineHeight: '1.2', letterSpacing: '-0.045em' }],
        display: ['46px', { lineHeight: '1.2', letterSpacing: '-0.045em' }],
        hero: ['68px', { lineHeight: '1.1', letterSpacing: '-0.045em' }],
        code: ['13px', { lineHeight: '1.6', letterSpacing: '0em' }],
      },
      letterSpacing: {
        'tight-s1': '-0.045em',
        s1: '-0.03em',
        caps: '0.1em',
      },
      colors: {
        paper: '#f4efe7',
        ink: '#141414',
        night: '#0d0d0d',
        surface: '#ece6dc',
        neutral: {
          0: '#ffffff',
          100: '#f4efe7',
          200: '#ece6dc',
          300: '#ddd5c8',
          400: '#c4bbad',
          500: '#8f877b',
          600: '#7a7268',
          700: '#5e574e',
          800: '#3a352f',
          900: '#141414',
          950: '#0d0d0d',
        },
        print: {
          DEFAULT: '#f97316',
          50: '#fdf0e4',
          200: '#fbd9bd',
          300: '#f9bb8c',
          400: '#f89a5c',
          500: '#f97316',
          600: '#e2620d',
          700: '#c2410c',
          800: '#9a3412',
        },
        brand: {
          red: '#fe3c34',
          orange: '#fe8b4b',
        },
        success: { DEFAULT: '#1a7f37', bg: '#dafbe1' },
        warning: { DEFAULT: '#9a6700', bg: '#fff8c5' },
        danger: { DEFAULT: '#cf222e', bg: '#ffebe9' },
      },
      borderRadius: {
        none: '0px',
        sm: '4px',
        md: '6px',
      },
      borderWidth: {
        frame: '1.5px',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, #fe3c34, #fe8b4b)',
      },
      boxShadow: {
        card: '0 1px 0 rgba(27, 23, 20, 0.06)',
        raised: '0 8px 30px -10px rgba(0, 0, 0, 0.12)',
        print: '0 30px 60px -30px rgba(90, 30, 0, 0.55)',
      },
      transitionTimingFunction: {
        s1: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        fast: '300ms',
        base: '500ms',
        slow: '900ms',
        reveal: '1200ms',
      },
    },
  },
};
