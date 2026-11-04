# Instructions for AI agents

This folder is the Studio1 design system (version 2, the paper design). Before you build or style anything for Studio1 (a website, SaaS UI, docs, code snippet, featured image, social post, slide or video):

1. Read [DESIGN.md](DESIGN.md) and follow it exactly.
2. Take values from [tokens/tokens.json](tokens/tokens.json) or the `--s1-*` variables in [css/tokens.css](css/tokens.css). Don't make up colours, sizes or fonts.
3. Load fonts with [css/fonts.css](css/fonts.css). Don't link Google Fonts or any other CDN.
4. Use the logo files in [logo/](logo/). Never draw or generate the mark. The main logo is the gradient mark with the wordmark (`logo/studio1-logo-on-light.svg`); the dark-mode version (`logo/studio1-logo-on-dark.svg`, the same gradient mark with white cut-outs) is only for dark backgrounds.

The rules people break most often:
- Studio1 Sans (renamed Inter), weights 400 and 500 only. No bold, no italics.
- Letter spacing is -0.03em by default, -0.045em on headlines. Body text is 16px with line height 1.6.
- The page is paper `#f4efe7`, text is ink `#141414`, cards are white. Secondary text is ink at 70%, captions ink at 60%, borders ink at 14%. No new greys, no blue.
- The one accent is print orange `#f97316`: one or two headline keywords, block prints, selection frames, badges. It is 2.5:1 on paper, so never use it for body text, links or focus rings (use print 700 `#c2410c` for small orange text). Put ink text on orange fills.
- Buttons are ink pills, often with a 36px orange circle holding the icon. Frames, cards, images and tags are square; tiles and inputs use 6px.
- The mark gradient (`#fe3c34` → `#fe8b4b`) is only for the mark. The only other gradient is the print panel on blog covers.
- Studio1 Sans is the only brand font. Code uses the system monospace stack (`--s1-font-mono`), and only code.

If you change a token, update it everywhere it appears: `tokens/tokens.json`, `css/tokens.css`, `tailwind/preset.cjs`, `tailwind/theme.css` and DESIGN.md.
