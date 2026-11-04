# Instructions for AI agents

This folder is the Studio1 design system. Before you build or style anything for Studio1 (a website, SaaS UI, docs, code snippet, featured image or slide):

1. Read [DESIGN.md](DESIGN.md) and follow it exactly.
2. Take values from [tokens/tokens.json](tokens/tokens.json) or the `--s1-*` variables in [css/tokens.css](css/tokens.css). Don't make up colors, sizes or fonts.
3. Load fonts with [css/fonts.css](css/fonts.css). Don't link Google Fonts or any other CDN.

The rules people break most often:
- Studio1 Sans (renamed Inter), weights 400 and 500 only. No bold, no italics.
- Letter spacing is -0.03em by default. Body text is 14px with line height 1.3.
- Colors are ink `#0a0a0a`, gray `#707070`, surface `#f2f2f2`, border `#e8e8e8` and white. The only UI accent is sky `#ddf4ff`, used as a fill.
- The logo colors (red `#fe3c34` to orange `#fe8b4b`) are for the mark and brand moments only, never for UI.
- Borders are 1px. Radius is 4, 6 or 10px. No gradients, no heavy shadows.
- Studio1 Sans is the only brand font. Code uses the system monospace stack (`--s1-font-mono`), and only code.

If you change a token, update it everywhere it appears: `tokens/tokens.json`, `css/tokens.css`, `tailwind/preset.cjs`, `tailwind/theme.css` and DESIGN.md.
