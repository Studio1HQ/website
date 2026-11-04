# Studio1 Design System

The rules for anything that carries the Studio1 brand: websites, SaaS product UI, docs, code snippets, featured images and slides. Follow them exactly. When a rule doesn't cover a case, choose the quieter option.

Exact values live in [tokens/tokens.json](tokens/tokens.json). If this file and the tokens disagree, the tokens win.

## 1. Principles

1. **Type does the work.** Hierarchy comes from size and spacing, not from heavy weights, color or decoration.
2. **Monochrome first.** Ink on white, with gray for secondary text. The one accent color, sky blue, is used sparingly.
3. **Quiet surfaces.** Thin 1px borders, flat fills, almost no shadows, and no gradients except on the logo mark.
4. **Tight and precise.** Negative letter spacing everywhere, compact line height, and spacing on a 4px grid.

## 2. Typography

| Role | Font | Weight | Size | Line height | Letter spacing |
|---|---|---|---|---|---|
| Hero | Studio1 Sans | 500 | 64px | 1.1 | -0.04em |
| Display | Studio1 Sans | 500 | 48px | 1.1 | -0.04em |
| Title | Studio1 Sans | 500 | 32px | 1.1 | -0.04em |
| Heading | Studio1 Sans | 500 | 24px | 1.3 | -0.03em |
| Subhead | Studio1 Sans | 500 | 18px | 1.3 | -0.03em |
| Body large | Studio1 Sans | 400 | 16px | 1.55 | -0.03em |
| **Body (default)** | Studio1 Sans | 400 | **14px** | 1.3 | -0.03em |
| Caption | Studio1 Sans | 400 | 12px | 1.3 | -0.03em, gray |
| Label | Studio1 Sans | 500 | 12px | 1.3 | +0.06em, UPPERCASE, muted |
| Code | System monospace | 400 | 13px | 1.6 | 0 |

Rules:
- **Only two weights: 400 (Regular) and 500 (Medium).** Never use 600, 700, 800, 900 or 100–300. Headings are 500, not bold.
- **No italics.** There is no italic file, and `font-synthesis: none` stops browsers faking one. For emphasis, use Medium weight or gray color.
- Default letter spacing is **-0.03em**. Large sizes (32px and up) go to -0.04em. Uppercase labels and code use 0 or positive spacing.
- Set `font-synthesis: none` on `:root`.
- **Studio1 Sans is the only brand font.** It is Inter renamed for Studio1: identical letterforms, spacing and kerning. Font stack: `"Studio1 Sans", "Inter", Arial, sans-serif`.
- Install the TTF files from `fonts/` to use Studio1 Sans in Figma, Keynote, Word or Google Slides. Set tracking to -3% to match the web.
- Code blocks and inline code use the device's own monospace font: `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`. Use it for code only. Labels, numbers, hex codes and UI text stay in Studio1 Sans (use `font-variant-numeric: tabular-nums` where numbers need to line up).
- Body text lines should be 60–75 characters wide (about `max-width: 640px` at 14–16px).
- Don't center paragraphs longer than two lines.

## 3. Color

### Core (use these 95% of the time)
| Token | Hex | Use |
|---|---|---|
| `ink` / neutral-950 | `#0a0a0a` | Primary text, primary buttons, dark surfaces |
| `gray` / neutral-500 | `#707070` | Secondary text, metadata |
| `surface` / neutral-100 | `#f2f2f2` | Panels, inline code, subtle fills |
| `white` / neutral-0 | `#ffffff` | Page background |
| `border` / neutral-200 | `#e8e8e8` | All 1px borders and dividers |
| `sky` / sky-100 | `#ddf4ff` | Accent: highlights, tags, hover fills, selected states |

### Extended
- Neutral scale: 0 `#ffffff`, 50 `#fafafa`, 100 `#f2f2f2`, 200 `#e8e8e8`, 300 `#d4d4d4`, 400 `#a3a3a3`, 500 `#707070`, 600 `#525252`, 700 `#3a3a3a`, 800 `#1f1f1f`, 900 `#141414`, 950 `#0a0a0a`.
- Sky scale: 50 `#f0faff`, 100 `#ddf4ff`, 200 `#b6e3ff`, 400 `#58a6ff`, 600 `#0969da` (links and focus rings on light), 800 `#0a3069`.
- Brand (logo colors, as on studio1hq.com): red `#fe3c34`, orange `#fe8b4b`, and the logo gradient `linear-gradient(90deg, #fe3c34, #fe8b4b)`.
- Status, product UI only: success `#1a7f37` on `#dafbe1`, warning `#9a6700` on `#fff8c5`, danger `#cf222e` on `#ffebe9`.

### Rules
- Text is ink or gray. Never put body text in sky, and never use colored text for decoration.
- Sky-100 is a **fill**, never a text color. Put ink text on it.
- Links are `#0969da` (light) or `#58a6ff` (dark), underlined with a 1px line.
- Brand red, orange and the logo gradient belong to the Studio1 mark and big brand moments (a cover slide, a hero sticker, the favicon). Never use them for UI text, links, buttons or status. On them, put ink text, not white.
- Never add brand colors outside this list. No purple, no other gradients, no neon.
- Dark mode: bg `#0a0a0a`, surface `#141414`, border `#1f1f1f`, text `#f2f2f2`, secondary `#a3a3a3`. Use the semantic `--s1-*` variables and dark mode switches automatically.

## 4. Space, shape and depth

- **Spacing** uses a 4px grid: 4, 8, 12, 16, 24, 32, 48, 64, 96. Page gutters are 24px on desktop and 16px on mobile. Section gaps are 64–96px.
- **Radius:** 4px for badges, tags and inline code. 6px for buttons and inputs. 10px for cards, code blocks and images. Full (999px) only for avatars and status dots.
- **Borders:** always 1px, `#e8e8e8` on light and `#1f1f1f` on dark.
- **Shadows:** none by default. Use `raised` (`0 2px 8px rgba(0,0,0,.04)`) on hover cards and `overlay` (`0 8px 32px rgba(0,0,0,.08)`) on menus, modals and snippet cards.
- **Motion:** `cubic-bezier(0.16, 1, 0.3, 1)` at 150ms (hover), 200ms (state change) or 400ms (enter). Avoid bounce and large movement; 4px is the most a hover should move something.

## 5. Components

- **Primary button:** ink background, white text, Medium 14px, 36px tall, 16px side padding, 6px radius. On hover, drop opacity to 0.85.
- **Secondary button:** white background, ink text, 1px `#e8e8e8` border. On hover, the border turns ink.
- **Input:** 36px tall, 12px side padding, 1px border, 6px radius. On focus, a 2px `#0969da` outline offset by 2px.
- **Card:** white, 1px border, 10px radius, 24px padding. No shadow until hover.
- **Badge/tag:** sky-100 fill, ink text, Medium 12px, 22px tall, 4px radius.
- **Label (eyebrow):** Medium 12px, uppercase, +0.06em, muted gray. It goes above headings and section names.
- **Code block:** `#0a0a0a` background, `#f2f2f2` text, system monospace 13px, line height 1.6, 10px radius, 16px × 24px padding. Syntax colors come only from neutrals and sky (keywords `#58a6ff`, strings `#b6e3ff`, comments `#707070`).
- **Inline code:** system monospace 13px on the surface color, 4px radius, 1px × 5px padding.

## 6. Logo

- Full logo (mark + wordmark, text outlined): [logo/studio1-logo-on-dark.svg](logo/studio1-logo-on-dark.svg) for dark backgrounds and [logo/studio1-logo-on-light.svg](logo/studio1-logo-on-light.svg) for light ones. Use these wherever the name should appear with the mark.
- Mark files: [logo/studio1-mark-gradient.svg](logo/studio1-mark-gradient.svg) is the full-color brand mark (red to orange) for covers, avatars and the favicon. [logo/studio1-mark-black.svg](logo/studio1-mark-black.svg) is for light backgrounds and [logo/studio1-mark-white.svg](logo/studio1-mark-white.svg) for dark ones.
- Wordmark: "Studio1" set in Studio1 Sans Medium 500 with -0.04em letter spacing, next to the mark. The gap between them is half the mark's height.
- Keep clear space equal to a quarter of the mark's height. The mark must be at least 16px. Don't recolor, stretch, outline or rotate it.

## 7. Recipes by format

**Marketing website:** white page with a 1px-bordered grid of panels. The hero headline is Display or Hero 500, with one phrase in gray for contrast. Body text is 14–16px. Each section starts with a Label. One ink primary button per view.

**SaaS product UI:** body 14px, tables and lists 13–14px, sidebar on the surface color. Status colors appear only for real states (success, warning or error), always paired with their background color. Data stays in ink, not color.

**Docs:** body large (16px, line height 1.55), content max-width 680px, headings use the Heading and Subhead roles, code in the Code block component.

**Code snippets (social and blog):** use [templates/code-snippet.html](templates/code-snippet.html). Dark card, filename in mono at the top left, the Studio1 mark at the top right, 18 lines at most.

**Featured / OG images (1200×630):** use [templates/og-image.html](templates/og-image.html). 72–80px padding, a 72px title at weight 500 and -0.045em, the logo at the top left, a sky tag at the top right, and the domain and metadata in gray at the bottom. Light or dark (ink) background only.

## 8. Don'ts

- Bold (600 and up), light weights or italics
- Any font other than Studio1 Sans (the system monospace is allowed for code only)
- Gradients, glows, glassmorphism, colored shadows
- Colored text for emphasis, or sky as a text color on white
- Rounded "pill" buttons (except status dots and avatars)
- Emoji as icons
- Borders thicker than 1px, or borders in mixed colors
- Positive letter spacing on body text

## 9. How to use the files

| You're building | Use |
|---|---|
| Plain HTML/CSS | `<link rel="stylesheet" href="design-system/css/studio1.css">` and `class="s1"` on `<body>` |
| Only the variables | `css/fonts.css` + `css/tokens.css` (`--s1-*` variables) |
| Tailwind v3 | `presets: [require('./design-system/tailwind/preset.cjs')]` + import `css/fonts.css` |
| Tailwind v4 | `@import "./design-system/css/fonts.css"; @import "./design-system/tailwind/theme.css";` |
| Figma or token tooling | `tokens/tokens.json` (W3C Design Tokens format) |
| Social or blog images | `templates/` |
