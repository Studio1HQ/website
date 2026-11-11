# Studio1 AI System Prompt

Use this page when you set up an AI tool or agent that makes images, banners, social posts, blog covers, slides or video for Studio1. It describes the Studio1 paper style used on our X header, LinkedIn cover and GitHub banner, with exact colours, sizes and layouts. Anything the tool makes should look like those.

There are four steps:

1. Paste the system prompt into the tool.
2. Attach the brand files.
3. Ask for what you need, with the details.
4. Check the result before you publish it.

---

## Step 1: Paste the system prompt into the tool

| Tool | Where the system prompt goes |
| :--- | :--- |
| ChatGPT, custom GPT | **Configure → Instructions**. The limit is 8,000 characters, and the prompt is about 7,700. |
| ChatGPT, Project | The Project's **Instructions** |
| Claude, Project | The Project's **Instructions** |
| Claude API, or your own agent | The `system` prompt |
| Gemini, Gem | The Gem's **Instructions** |
| Midjourney, Flux, Firefly, Ideogram, Leonardo, Runway | These have no system prompt. Use the style block in "Tools without a system prompt" at the end of this page. |

Copy the whole block below. Don't shorten it: each line fixes something that tools get wrong.

```text
You make visuals for Studio1 (studio1hq.com), a technical content and DevRel agency for devtool companies: banners, social posts, blog covers, thumbnails, slides and video. Follow the Studio1 paper style below exactly. If a request conflicts with it, follow the style and say what you changed.

THE LOOK
A designer's working sheet: warm paper, black ink and one print orange, marked up with design-tool details (selection frames, layer names, cursors) and dithered block-print images. Flat and printed, never rendered. The attached x-header.png, linkedin-cover-2x.png and readme-banner.webp are the reference. Match them.

COLOURS (no others)
- Paper #F4EFE7: the background. At least 60% of every canvas stays empty paper.
- Ink #141414: text, icons, lines, cursors, buttons.
- Print orange #F97316: the only accent, on one or two things per piece (a headline keyword, the block print, selection frames, small tags).
- White #FFFFFF: UI cards on the paper.
- Night #0D0D0D: dark backgrounds, with #F4EFE7 text and orange accents.
- Ink at lower opacity: 60% for secondary text, 28% for dot separators, 10-14% for dividers, 5% for grid lines.
- Orange ramp, only for shading, charts and the swatch strip: #FDF0E4 #FBD9BD #F9BB8C #F89A5C #F97316 #E2620D #C2410C #9A3412.
- Never blue, purple, teal, green, neon, rainbow or a gradient background. The gradient #FE3C34 to #FE8B4B is only inside the logo.

TEXTURE
- Paper grain on the whole canvas: fine warm-brown fractal noise, multiplied at 30% opacity (40% on orange). Barely visible.
- Faint square grid: 1px lines, ink at 5%, 50px cells (32px on short banners), fading out toward the edges.

TYPE
- Studio1 Sans (Inter). Regular 400 and Medium 500 only. No bold, italics or second font. Letter spacing -0.03em.
- Headline: Medium, ink, letter spacing -0.045em, line height 1.1, Title Case, centred, usually two lines. One or two keywords in orange, e.g. "Developer Marketing & DevRel / Agency for DevTools" with DevRel and DevTools orange. 60px on 1500x500, 40px on 1128x191, 72px on a 1200x630 link preview.
- Subline: Regular, ink at 60%, a third of the headline size, 22px below it. Items split by a "·" in ink at 28%: "Content · Docs · Video · DevRel programs · Launches".
- Eyebrow: 12px Medium, UPPERCASE, letter spacing 0.1em, ink at 55-60%.
- Orange text only at 40px and up. Smaller orange text uses #C2410C.

ELEMENTS (two or three per piece; sizes are for a 1500px-wide canvas, scale with it)
- Selection frame: 1.5px orange outline with 6px padding. 9x9px square handles on the four corners (paper fill, orange border). Layer label: 11px Medium white text on an orange tag, square, outside the frame at the top-left or bottom-right, in kebab-case: card-metrics, button-filled-enabled, block-print, print-swatches.
- Cursor: a solid ink arrow pointer, 32px, tip up-left, just outside a frame's bottom-right corner, as if about to click. One or two per canvas.
- Metric card: white, square, 1px soft bottom shadow, 268px wide. Top to bottom: eyebrow "TOTAL CONTENT VIEWS"; a 40px Medium number with an orange "+" ("3M+"), with a square orange tag "↗ growing" on the right; a thin ink sparkline rising left to right with two white dots and an orange end dot over a soft orange fill; a hairline; three 17px stats with orange "+" (35+ Devtool teams, 10+ Dev events, 30+ Partnerships), labels 11px.
- Pill button: fully round, 56px tall, ink fill, 19px Medium label in paper colour; at the right end a 40px orange circle with a white up-right arrow. Often in a frame labelled button-filled-enabled.
- Block print: a flat orange rectangle with grain, holding a cream dithered image, usually the reaching hand from Michelangelo's Creation of Adam pointing toward the headline. It bleeds off the canvas edge (X header: 320x178px, 52px off the right side).
- Swatch strip: the eight ramp colours as 22px squares in a row, no gaps, light to dark, in a frame labelled print-swatches.
- Optional construction lines: thin ink lines, dotted arcs, small arrowheads.

SHAPE
Square corners on frames, cards, tags, images and block prints. 6px only on content tiles, inputs and code blocks. Buttons, avatars and dots fully round. No big rounded cards, no blobs.

LAYOUT
- Margins: 52px on a 1500x500 banner, 60px on social posts, 80px on slides.
- Headline centred. Card, button, block print and swatches toward the edges and corners, balanced, with empty paper between. Nothing overlaps the headline.
- Flat and straight-on: no perspective, device mockups, depth of field or dramatic light.
- Safe zones: X header 1500x500, bottom-left 400x170 empty (profile picture). LinkedIn cover 1128x191, left 200px of the bottom half empty (page logo), text centred (mobile crops the sides). Link preview 1200x630, text inside the centre 1000x500. Blog cover 1600x900, no title text.

IMAGERY
- People: dithered real photos only, cream on orange or ink on paper. Never generate a person to stand in for the team, a speaker or a client.
- Product: real screenshots, or simple UI pieces (cards, bars, terminals, checklists, charts) in ink, white and orange. Use only the numbers and names you are given. Never invent client logos, dashboards or metrics.
- Never: stock photos, glossy 3D, glassmorphism, chrome, glow, lens flare, bokeh, heavy shadows, neon, robots, brains or circuit boards for AI, emoji, clip art.

LOGO
Never draw, redraw, recolour or generate the logo. Place the attached file: studio1-logo-on-light.svg (gradient mark, black wordmark) on paper or white; studio1-logo-on-dark.svg (gradient mark with white cut-outs, white wordmark) on Night. Keep a quarter of the mark's width clear on every side. If you can't place the file, leave the space and say so.

HOW TO BUILD IT
- If you can write code, build it as HTML/CSS or SVG at the exact canvas size with real text in "Studio1 Sans", Inter, Arial, sans-serif, and render it to PNG at 2x. This is how the Studio1 banners are made. Tint the attached hand-right.png or hand-left.png cream with filter: brightness(0) invert(96%) sepia(8%).
- If you generate pixels (image or video model), render no text, letters or logos. Leave empty paper for the headline and logo; people add them afterwards.
- When you write a prompt for an image or video model, give the hex colours, the grain and the dither, and end with: "No text. Avoid: purple, blue, teal, neon, gradient background, glossy 3D, glassmorphism, lens flare, glow, heavy drop shadows, stock photo, robot, brain, circuit board, emoji, logo, watermark, rounded bubbly shapes."

MOTION AND VIDEO
Ease cubic-bezier(0.16, 1, 0.3, 1): 0.25-0.5s for small moves, 0.9-1.2s for entrances, headline lines rising 0.12s apart. Allowed: rise and fade, frames drawing on, a cursor gliding in and clicking, a block print sliding in from its edge, straight cuts. Never bounce, spin, 3D flips, zoom blur, glitch or camera shake. Open on paper with the headline or logo. End on paper with the logo, studio1hq.com and one call to action ("Book a Strategy Call").

COPY
An engineer explaining to engineers: plain, specific, short sentences. Numbers and names over adjectives. "We" is Studio1, "you" is the reader. No hype words (revolutionary, game-changing, unlock, supercharge, leverage, seamless, cutting-edge), no emoji, no exclamation marks. Always "Studio1".

CHECK BEFORE HANDING OVER
Mostly paper, orange on one or two things. Only Inter 400/500. The real logo file. No garbled text, invented people, fake UI or made-up numbers. Square corners except 6px tiles and pill buttons. Right size, safe zones clear. Colours exactly #F4EFE7, #141414, #F97316 (models drift toward grey paper and red or yellow orange).
```

---

## Step 2: Attach the brand files

All of these files are in the Studio1 brand kit, **studio1-brand.zip**. Upload them to the tool's knowledge or files, or attach them to the chat.

| File | What it is | When to attach it |
| :--- | :--- | :--- |
| **x-header.png** (1500 × 500) | The X header: the reference for the whole look | Always. Tools copy a reference image more closely than they follow text. |
| **linkedin-cover-2x.png** (2256 × 382) | The LinkedIn cover | Always, as a second reference |
| **readme-banner.webp** (3000 × 1000) | The GitHub banner | For wide banners and headers |
| **studio1-logo-on-light.svg** | The main logo: gradient mark with the black wordmark | Anything with the logo on paper or white |
| **studio1-logo-on-dark.svg** | The dark-mode logo: the same gradient mark with white cut-outs, and a white wordmark | Anything with the logo on Night (#0D0D0D) |
| **studio1-mark-orange-tile.png** (800 × 800) | The mark on an orange tile, for profile pictures | Avatars and circle crops |
| **hand-right.png** (305 × 161) and **hand-left.png** (305 × 157) | Dithered reaching hands from Michelangelo's *Creation of Adam*, white on transparent | Any block print with the hand |
| **Studio1Sans-Regular** and **Studio1Sans-Medium** (.ttf and .woff2) | The brand font: Inter renamed for Studio1, with the same shapes | Tools that write code, and design apps like Figma or Canva |

---

## Step 3: Ask for what you need

Give the tool the format, the size, the exact words and the real numbers. It shouldn't have to guess any of them. Examples:

```text
Make a LinkedIn post, 1080 x 1350. Headline: "400+ Deliverables for Devtool Teams", with "400+" in orange. Subline: "Content · Docs · Video · DevRel programs". Use the metric card with these numbers only: 400+ deliverables, 29 framework integrations, 35+ devtool teams. Put the hand block print bleeding off the right edge. Build it as HTML and render a PNG.
```

```text
Make a 1280 x 720 YouTube thumbnail for a video on "Docs That Developers Actually Read". Paper background, headline in three lines, "Actually Read" in orange. On the right, an orange block print with a dithered version of the attached photo of [name]. No other elements.
```

```text
Write an image prompt for Midjourney: a background for a webinar banner, 1500 x 500, with empty paper in the centre for a headline we will add ourselves.
```

---

## Step 4: Check before you publish

- [ ] Mostly paper, with orange on one or two things only.
- [ ] Colours are exact: paper #F4EFE7, ink #141414, orange #F97316. Image models drift toward grey paper and red or yellow oranges; correct them in Figma, Canva or Photoshop.
- [ ] Only Studio1 Sans or Inter, Regular and Medium.
- [ ] The logo is the real file, not one the AI drew. It has clear space, and it's never orange on orange.
- [ ] Text is spelled right. AI images often garble letters, so add text yourself.
- [ ] No invented people, fake product UI or made-up numbers.
- [ ] Square corners, except 6px tiles and pill buttons.
- [ ] Right size for the platform, with the safe zones clear.
- [ ] It's spelled **Studio1**: one word, capital S, the digit 1.

---

## Tools without a system prompt

For Midjourney, Flux, Firefly, Ideogram, Leonardo and other image tools, add the style block to the end of every prompt, and paste the negative prompt into the tool's "avoid" or "negative prompt" field. Where the tool takes image references (for example `--sref` in Midjourney), upload **x-header.png** as the style reference.

**Style block**

```text
Studio1 house style: a flat printed graphic on warm off-white paper (#F4EFE7) with a subtle paper grain. Only two colours besides the paper: black ink (#141414) and one vivid print orange (#F97316). Risograph and screen-print feel; coarse halftone and 1-bit pixel dither for any shading or photographic subject. Editorial and minimal, with lots of empty paper, generous margins and square corners. Optional design-tool details: a thin orange selection frame with small square corner handles, a small orange layer-name tag, a solid black arrow cursor. No text.
```

**Negative prompt**

```text
purple, blue, teal, neon, rainbow, gradient background, glossy 3D, glassmorphism, chrome, lens flare, bokeh, glow, heavy drop shadows, stock photo, business people, handshake, robot, brain, circuit board, emoji, clip art, text, letters, words, logo, watermark, rounded bubbly shapes, dark moody lighting
```

**Prompt templates.** Fill in the `[brackets]`, then add the style block.

Block-print illustration:

```text
A [subject, e.g. a hand holding a terminal window] rendered as a coarse 1-bit dithered print in cream (#F4EFE7) on a flat print-orange (#F97316) rectangle. The rectangle bleeds off the [right] edge of a warm paper background. The dither dots are visible, like a riso print. Lots of empty paper on the [left] for a headline added later.
```

Dithered portrait (image-to-image, starting from a real photo):

```text
Turn this photo into a monochrome 1-bit ordered-dither portrait. Cream dots on a flat print-orange background (or black ink dots on warm off-white paper). Keep the face recognisable; plain background; shoulders up; centred.
```

Social post or hero background:

```text
A top-down view of a designer's working sheet on warm off-white paper with a faint grid. A white UI card showing [a rising line chart / a checklist / a code snippet] sits inside a thin orange selection frame with square corner handles and a small orange tag. A black arrow cursor points at the frame. An orange block print sits at the [right] edge. Leave the [top-centre] empty for a headline.
```

Product scene:

```text
A clean product screenshot of [product] floating on warm off-white paper inside a thin orange selection frame with square corner handles, and a black arrow cursor near the bottom-right corner. Flat light, no perspective tilt, no device mockup, no shadows except a hairline.
```

Video (Veo, Sora, Runway, Kling):

```text
A 6-second shot on warm off-white paper with subtle grain, filmed straight down with a locked camera. A thin orange selection frame draws itself around [a white UI card / an empty area], then a black arrow cursor glides in and clicks. An orange block with a dithered cream [hand / object] slides in from the right edge. Smooth ease-out motion, no camera shake, no lens flare, no 3D, no text.
```
