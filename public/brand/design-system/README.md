# Studio1 Design System

Studio1's fonts, colours, tokens, components, logos and templates in one place: the **paper design** used on studio1hq.com. It works for websites, SaaS products, docs, code snippets, featured images, social posts and slides. Any AI tool (Claude, Cursor, Copilot, v0, Lovable and others) can read it and produce on-brand work.

The look: warm paper (`#f4efe7`), ink type (`#141414`) and one print orange (`#f97316`), with selection frames, cursors and dithered block prints. Type is **Studio1 Sans**, our renamed cut of Inter: Regular and Medium only, tight -0.03em letter spacing, 16px body text. Code uses the system monospace font, so there is nothing extra to load.

## Quick start

```html
<link rel="stylesheet" href="design-system/css/studio1.css">
<body class="s1 s1-grain">
  <span class="s1-label">Case study</span>
  <h1 class="s1-hero">Docs developers <span class="s1-accent">finish</span> reading</h1>
  <p class="s1-body-lg s1-muted">Technical content for developer tools.</p>
  <a class="s1-btn" href="#">Book a Strategy Call <span class="s1-btn__dot">↗</span></a>
</body>
```

Tailwind: see the table at the end of [DESIGN.md](DESIGN.md).

## Using it with AI

Copy this folder into any project, or add it as a git submodule. Then tell the AI tool:

> Follow `design-system/DESIGN.md` for all styling.

Claude Code picks up `CLAUDE.md` automatically, and tools that read `AGENTS.md` or `llms.txt` find the rules on their own. For AI images and video, paste the style block from section 8 of DESIGN.md into your prompt.

## Contents

```
design-system/
├── DESIGN.md          rules (start here)
├── AGENTS.md          AI checklist
├── CLAUDE.md          Claude Code entry point
├── llms.txt           index for LLM tools
├── tokens/tokens.json source of truth (W3C Design Tokens)
├── css/               fonts.css · tokens.css · studio1.css
├── tailwind/          preset.cjs (v3) · theme.css (v4)
├── fonts/             Studio1 Sans 400/500 (WOFF2 + TTF) + license
├── logo/              main logo (orange mark + wordmark), dark-mode logo (orange mark, white cut-outs), the mark in orange, dark mode, black and white
└── templates/         og-image.html · code-snippet.html
```

## Licenses

Studio1 Sans is a renamed version of Inter (© The Inter Project Authors) and stays under the SIL Open Font License 1.1. It is free to use commercially and to embed, but the font files cannot be sold on their own. See `fonts/LICENSE.txt`.
