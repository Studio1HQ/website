# Studio1 Design System

The rules for anything that carries the Studio1 brand: websites, SaaS product UI, docs, code snippets, featured images, social posts, slides and video. Follow them exactly. When a rule doesn't cover a case, choose the quieter option.

Exact values live in [tokens/tokens.json](tokens/tokens.json). If this file and the tokens disagree, the tokens win. This is version 2, the **paper design** used on studio1hq.com.

## 1. Principles

1. **Paper first.** Most of every canvas is empty warm paper (`#f4efe7`) with ink (`#141414`) type.
2. **One accent.** Print orange (`#f97316`) is the only colour besides ink. Use it on one or two things per view: a headline keyword, a block print, a selection frame, a badge.
3. **Type does the work.** Studio1 Sans in two weights. Hierarchy comes from size and spacing, never from heavy weights.
4. **Print, don't render.** Flat colour, paper grain, dither and halftone. No glossy 3D, glass, glow or decorative gradients.
5. **Show the work.** Selection frames, layer labels, cursors and real product UI make a piece look like a working design file.

## 2. Typography

| Role | Class | Weight | Size | Line height | Letter spacing |
|---|---|---|---|---|---|
| Hero | `.s1-hero` | 500 | 68px (38px on mobile) | 1.1 | -0.045em |
| Display | `.s1-display` | 500 | 46px | 1.2 | -0.045em |
| Title | `.s1-title` | 500 | 32px | 1.2 | -0.045em |
| Heading | `.s1-heading` | 500 | 24px | 1.3 | -0.035em |
| Subhead (card title) | `.s1-subhead` | 500 | 20px | 1.3 | -0.025em |
| Body large (lead) | `.s1-body-lg` | 400 | 18px | 1.6 | -0.03em |
| **Body (default)** | `.s1-body` | 400 | **16px** | 1.6 | -0.03em |
| Body small (product UI) | `.s1-body-sm` | 400 | 14px | 1.3 | -0.03em |
| Caption | `.s1-caption` | 400 | 12px | 1.3 | -0.03em, ink 60% |
| Label (eyebrow) | `.s1-label` | 500 | 12px | 1.3 | +0.1em, UPPERCASE, ink 60% |
| Frame label | `.s1-frame > b` | 500 | 11px | 1 | -0.01em, white on print orange |
| Big number | `.s1-number` | 500 | 28–40px | 1 | -0.045em |
| Code | `.s1-code` | 400 | 13px | 1.6 | 0, system monospace |

Rules:
- **Only two weights: 400 (Regular) and 500 (Medium).** Never 600, 700, 800, 900 or 100–300. Headings are 500.
- **No italics.** There is no italic file, and `font-synthesis: none` stops browsers faking one.
- **Studio1 Sans is the only brand font.** It is Inter renamed for Studio1: identical letterforms, spacing and kerning. Stack: `"Studio1 Sans", "Inter", Arial, sans-serif`. The old serif-italic accent is retired.
- **Accent words:** colour one or two keywords of a headline in print orange with `.s1-accent` ("Developer Marketing & **DevRel** Agency for **DevTools**"). Never a whole line, never body text.
- Stats are written `35+`, `3M+`, with the "+" in `.s1-accent`.
- Headlines and buttons use Title Case. Body copy and captions use sentence case. Uppercase is only for small labels.
- Install the TTF files from `fonts/` for Figma, Keynote, Word, Google Slides or video editors, and set tracking to -3% to match the web. If you can't install fonts, use Inter.
- Code uses the device's monospace font, and only code. Labels, numbers and hex codes stay in Studio1 Sans (`font-variant-numeric: tabular-nums` where numbers line up).
- Body lines 60–75 characters wide (about `max-width: 640px`). Don't center paragraphs longer than two lines.

## 3. Colour

### Core
| Token | Hex | Use |
|---|---|---|
| `paper` | `#f4efe7` | Page background. Light text and the mark on print orange and Night. |
| `ink` | `#141414` | Text, icons, lines, primary buttons |
| `print-500` | `#f97316` | The one accent: headline keywords, block prints, selection frames, badges |
| `night` | `#0d0d0d` | Dark bands between paper sections, dark mode, code blocks |
| `white` | `#ffffff` | Cards and UI panels on paper |
| `surface` / neutral-200 | `#ece6dc` | Panels, sidebars, inline code |

**Proportion:** about 80% paper, 15% ink, 5% orange.

### Tints
- Text and lines on paper are **ink at reduced opacity**, not new greys: 70% secondary text (6.4:1), 60% captions (4.6:1, the floor for small text; use 70% on `surface`), 32% separators, 14% hairlines and borders, 5% background grid.
- On Night, use paper at 70%, 60% and 14% the same way.
- Warm solid neutrals (100 `#f4efe7`, 200 `#ece6dc`, 300 `#ddd5c8`, 400 `#c4bbad`, 500 `#8f877b`, 600 `#7a7268`, 700 `#5e574e`, 800 `#3a352f`) are for places that need a solid colour.

### Print ramp
50 `#fdf0e4` · 200 `#fbd9bd` · 300 `#f9bb8c` · 400 `#f89a5c` · **500 `#f97316`** · 600 `#e2620d` · 700 `#c2410c` · 800 `#9a3412`. Use it for charts, shading in illustrations, the swatch strip, soft fills (50) and small orange text (700). Don't treat other steps as new accents.

### Gradients
Only two exist:
- **The mark** is solid Studio1 orange, `#f97316`; it carries no gradient.
- **The print panel** for blog covers: base `#fb8a1e`, a `#ff3a00` glow from both top corners, fading down through `#f7a54a` and `#eeb795` to `#f2b38a`, with a soft cream horizon arc rising from the bottom.

### Contrast rules
| Pair | Ratio | Rule |
|---|---|---|
| Ink on paper / white | 16.1 / 18.4:1 | Any text |
| Ink 70% on paper | 6.4:1 | Any text |
| Ink 60% on paper | 4.6:1 | Small text floor |
| Ink on print orange | 6.6:1 | Text on orange fills (badges, buttons) |
| Print 700 on paper | 4.5:1 | Small orange text, link hovers |
| Print orange on Night | 6.9:1 | Fine for text |
| Print orange on paper | 2.5:1 | **Display type (40px+) and shapes only** |
| Paper or white on print orange | 2.5–2.8:1 | The logo, frame labels and display type only |

- **Links** are ink with a 1px underline; on hover they turn print 700. On Night: paper, turning print orange.
- **Focus rings** are 2px solid ink, offset 2px (paper on Night). Never orange on paper.
- **Status colours** (product UI only, real states): success `#1a7f37` on `#dafbe1`, warning `#9a6700` on `#fff8c5`, danger `#cf222e` on `#ffebe9`. Always pair them with a word or icon.
- Never add colours outside this list. No blue, no purple, no neon, no other gradients.
- **Dark mode** is Night: bg `#0d0d0d`, surface `#1b1b1a`, card `#141414`, text paper, secondary paper 70%, borders paper 14%. Use the semantic `--s1-*` variables and dark mode switches automatically.

## 4. Space, shape and depth

- **Spacing** uses a 4px grid: 4, 8, 12, 16, 24, 32, 48, 64, 96. Page gutters are 24px on desktop and 16px on mobile. Section gaps are 64–96px.
- **Radius:** square (0) for selection frames, block prints, images, stat cards, tags and labels. 6px for content tiles, inputs, panels and code blocks. Fully round (999px) for buttons, avatars and status dots. 4px for inline code. No other radii.
- **Borders:** 1px hairlines in ink 14% on paper (paper 14% on Night). 1.5px for selection frames and outline buttons.
- **Shadows:** `card` (`0 1px 0 rgba(27,23,20,0.06)`) on white cards, `raised` (`0 8px 30px -10px rgba(0,0,0,0.12)`) on hover and menus, `print` (`0 30px 60px -30px rgba(90,30,0,0.55)`) for white cards floating on the print panel. Nothing heavier.
- **Paper grain:** fine fractal noise (`--s1-grain`) multiplied over paper at 30% and over print orange at 40% (`.s1-grain`, `.s1-print`).
- **Motion:** `cubic-bezier(0.16, 1, 0.3, 1)` for everything. 300ms hovers, 500ms state changes, 900ms section entrances, 1200ms headline reveals (each line rises from behind a mask, 120ms after the one before). Rise-and-fade only: no bounce, elastic, spin, 3D flips or glitch. Respect `prefers-reduced-motion`; nothing may depend on an animation to be readable.

## 5. Components

- **Primary button** (`.s1-btn`): an ink pill, 48px tall (56px with `--lg`), Medium 15–16px paper text, 24px side padding. Add `.s1-btn__dot`, a 36px print-orange circle holding a white arrow or icon, at the right end. On hover, opacity 0.88.
- **Secondary button** (`.s1-btn--secondary`): a transparent pill with a 1.5px ink border and ink text. On hover it fills white.
- **Input** (`.s1-input`): 44px tall, white, 1px ink 14% border, 6px radius. Focus: 2px ink ring offset 2px.
- **Stat / UI card** (`.s1-card`): white, square, `card` shadow, 16px padding. Inside: an eyebrow, a big number with an orange "+", a sparkline (ink line, orange end dot), a row of three small stats.
- **Content tile** (`.s1-tile`): white, 1px ink 14% border, 6px radius, 24px padding. `raised` shadow on hover.
- **Badge / tag** (`.s1-badge`): square, 22px tall, Medium 12px. Print orange with ink text; `--ink` for ink with paper text; `--soft` for print 50 with ink text.
- **Label (eyebrow)** (`.s1-label`): Medium 12px, uppercase, +0.1em, ink 60%. It goes above headings and inside cards.
- **Selection frame** (`.s1-frame`): a 1.5px print-orange line with 6px padding, 9 × 9px square corner handles filled with the background colour, and a layer label (11px Medium, white on orange) at the bottom right (`--label-top` moves it to the top left). Layer names are kebab-case like real Figma layers: `card-metrics`, `button-filled-enabled`, `studio1-mark`. Blog covers use an ink frame with `.fig` names (`content.fig`).
- **Cursor** (`.s1-cursor`): a solid ink arrow, `<path d="M3.5 2.5 21 10.2l-7.6 2.3-3.3 7.8z"/>` on a 24px viewBox, placed just outside a frame's corner. One or two per view.
- **Block print** (`.s1-print`): a flat print-orange rectangle with grain, holding a cream dithered image or the cream mark. It often bleeds off the edge of the canvas.
- **Code block** (`.s1-codeblock`): Night background, paper text, system monospace 13px, line height 1.6, 6px radius, 16 × 24px padding. Syntax: keywords print 500, strings print 200, comments paper 60%, functions white Medium.
- **Inline code:** system monospace 13px on `surface`, 4px radius, 1 × 5px padding.
- **Icons:** [Phosphor Icons](https://phosphoricons.com). Bold weight for small UI icons and arrows, Regular inside 44px ink square tiles (paper icon). ↗ for links. No emoji, one icon set per view.

## 6. Logo

**The main logo is the orange mark with the wordmark** ([logo/studio1-logo-on-light.svg](logo/studio1-logo-on-light.svg)). Use it by default: the site nav, footer, docs, slides, templates, partner pages. The dark-mode logo (the same orange mark with white cut-outs and a white wordmark) is only for dark backgrounds; never use it in place of the main logo on light backgrounds.

| File | Use it on |
|---|---|
| [logo/studio1-logo-on-light.svg](logo/studio1-logo-on-light.svg) | **Main logo.** Paper and white backgrounds: the orange mark with the black wordmark |
| [logo/studio1-logo-on-dark.svg](logo/studio1-logo-on-dark.svg) | **Dark-mode logo.** Night and other dark backgrounds: the orange mark with white cut-outs, white wordmark |
| [logo/studio1-mark-gradient.svg](logo/studio1-mark-gradient.svg) | The main mark on its own; the favicon |
| [logo/studio1-mark-dark.svg](logo/studio1-mark-dark.svg) | The dark-mode mark on its own: the orange mark with white cut-outs |
| [logo/studio1-mark-black.svg](logo/studio1-mark-black.svg) | One colour, black: print, embossing, watermarks on light backgrounds |
| [logo/studio1-mark-white.svg](logo/studio1-mark-white.svg) | One colour, white: on photos and dark backgrounds where colour can't be used |

- The mark is a rounded square with an **S** and a **1** cut out of it. Always place a file; never redraw, trace or AI-generate it.
- **Wordmark lockup:** the mark, then "Studio1" in Studio1 Sans Medium, vertically centred. On the site: mark 32px, gap 8px, name 24px. Scale them together.
- The name is always **Studio1**: one word, capital S, the digit 1. Handle **@Studio1HQ**, site **studio1hq.com**.
- Clear space: a quarter of the mark's width on every side. Minimum size: 16px on screen, 8mm in print.
- Don't put the orange mark on orange, recolour it, outline it, add shadows or glows, rotate, stretch or tilt it, or set "Studio1" in another font or in bold. Don't swap the main logo for the dark-mode mark on light backgrounds.

## 7. Recipes by format

**Marketing website:** paper page with grain and a faint 50px grid. The hero headline is Hero 500 with one or two orange keywords, a lead paragraph in ink 70%, one ink pill button with the orange dot plus one outline pill. Sections alternate paper and Night bands; each starts with a Label. Decorate with two or three design-file details (a selection frame around a stat card, a cursor, a block print), never all of them.

**SaaS product UI:** paper background, white cards and tables, sidebar on `surface`. Body 14–16px, tables 14px. Status colours only for real states. Data stays in ink; orange marks the one primary action or the selected item.

**Docs:** body 16px, line height 1.6, content max-width 680px, headings use Heading and Subhead, code in the Code block component.

**Code snippets (social and blog):** [templates/code-snippet.html](templates/code-snippet.html). A Night card on a paper sheet, filename in mono at the top left, the dark-mode mark at the top right, 18 lines at most.

**Featured / OG images (1200×630):** [templates/og-image.html](templates/og-image.html). Paper with grain, the orange lockup top left, a square orange tag in a selection frame top right, a 72px Medium title with one orange keyword, domain and metadata in ink 60% at the bottom. Night variant for dark posts.

**Blog covers (1600×900):** made automatically on the site. The print panel gradient full-bleed, a white UI card that shows the topic (comparison, benchmark bars, checklist, terminal) inside an ink selection frame labelled `<topic>.fig`, an ink cursor at its corner. No title on the image.

**Social headers:** X 1500×500 (keep the bottom-left ~400×170px clear for the avatar), LinkedIn cover 1128×191 (keep the left ~200px of the bottom half clear).

**Slides (1920×1080):** paper, 80px margins, Title or Display headlines, one idea per slide, Night slides for section breaks.

**Video:** open on paper with the headline or mark; captions in Studio1 Sans Medium, sentence case, two lines at most; lower thirds in a selection frame labelled with the person's handle; straight cuts or an orange block wipe; end card with the mark, studio1hq.com and one call to action.

## 8. Imagery, voice and AI

- **Dither photos:** people, hands and objects become 1-bit or halftone images, cream on print orange or ink on paper. The reaching hands (after *The Creation of Adam*) are the house motif.
- **Real people and real UI only.** Dither real photos; never generate stand-ins for the team or clients. Show real product screenshots, never invented dashboards or numbers.
- **Voice:** plain, specific, short sentences, the way an engineer explains something to another engineer. Numbers and names over adjectives ("400+ deliverables, 29 framework integrations"). "We" is Studio1, "you" is the reader. No hype words (revolutionary, game-changing, unlock, supercharge, leverage, seamless), no emoji, no exclamation marks.
- **AI images and video:** generate without text or logos, then add type and the mark from these files. Paste this style block into the prompt:

  > Studio1 house style: a flat printed graphic on warm off-white paper (#F4EFE7) with a subtle paper grain. Only two colours besides the paper: black ink (#141414) and one vivid print orange (#F97316). Risograph and screen-print feel; coarse halftone and 1-bit pixel dither for any shading or photographic subject. Editorial and minimal, with lots of empty paper, generous margins and square corners. Optional design-tool details: a thin orange selection frame with small square corner handles, a small orange layer-name tag, a solid black arrow cursor. No text.

  Negative prompt: purple, blue, neon, rainbow, gradient background, glossy 3D, glassmorphism, lens flare, glow, stock photo, robot, brain, circuit board, emoji, text, logo, watermark.

## 9. Don'ts

- Bold (600 and up), light weights or italics
- Any font other than Studio1 Sans (the system monospace is allowed for code only)
- Blue, purple or any colour outside the palette; gradients other than the print panel
- Orange body text or small orange text on paper (use print 700); orange focus rings
- Glossy 3D, glassmorphism, glows, heavy or coloured drop shadows (except `print` on the print panel)
- Rounded corners on frames, block prints, images, stat cards or tags; radii other than 0, 4, 6 and 999px
- Emoji as icons, stock photos, AI-generated people or logos
- Positive letter spacing on body text

## 10. How to use the files

| You're building | Use |
|---|---|
| Plain HTML/CSS | `<link rel="stylesheet" href="design-system/css/studio1.css">` and `class="s1"` on `<body>` |
| Only the variables | `css/fonts.css` + `css/tokens.css` (`--s1-*` variables) |
| Tailwind v3 | `presets: [require('./design-system/tailwind/preset.cjs')]` + import `css/fonts.css` |
| Tailwind v4 | `@import "./design-system/css/fonts.css"; @import "./design-system/tailwind/theme.css";` |
| Figma or token tooling | `tokens/tokens.json` (W3C Design Tokens format) |
| Social or blog images | `templates/` |

### Upgrading from version 1 (ink on white, sky accent)
- `--s1-sky-*`, Tailwind `sky-*` and `radius-lg` are gone. Use `--s1-print-*` / `print-*` and `radius-md`.
- `--s1-bg` is now paper, `--s1-text` is ink `#141414`, `--s1-border` is ink at 14%, `--s1-accent` is print orange (use `--s1-accent-soft` for the old pale fill), and `--s1-link` is ink.
- Default body text is 16px with line height 1.6 (use `.s1-body-sm` for 14px product UI). Buttons are pills; badges are square and orange.
