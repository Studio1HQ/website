# Studio1 graphic language

The look: **a designer's working sheet.** Warm paper, black ink and one print orange, marked up with
the tools of a design file (selection frames, layer names, cursors), plus dithered block-print
images. Flat and printed, never rendered. Sources: `brand/AI-SYSTEM-PROMPT.md`, `brand/README.md`,
`public/brand/design-system/DESIGN.md` and `app/blog-cover/cover.tsx` in the website repo. Values
are in `tokens.json`; this file is how to compose with them.

## Five rules

1. **Paper first.** At least 60% of every canvas is empty paper, `#f4efe7`.
2. **One accent.** Print orange `#f97316` on one or two things per piece: a headline keyword, a
   selection frame, a small tag. Block prints and the sunrise panel are the exceptions.
3. **One typeface, two weights.** Studio1 Sans Regular 400 and Medium 500. No bold, no italics, no
   second font.
4. **Print, don't render.** Flat colour, grain, dither, halftone. No glossy 3D, glass, glow, bokeh,
   heavy shadows or stock photos.
5. **Show the work.** Selection frames, layer tags, cursors and real product UI. Two or three of
   these per piece, never all of them.

## Ground and texture

- **Grain:** `grain.svg` in this folder, multiplied over the whole canvas at 30% opacity (40% over
  orange blocks). Barely visible. It is a texture, not a colour.
  Example: `.grain::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: url("/workspace/brand/grain.svg"); mix-blend-mode: multiply; opacity: 0.3; }`
- **Grid:** faint square grid, 1px lines in ink at 5%, 50px cells (32px on short banners), fading out
  toward the edges.
- **Night** (`#0d0d0d`) is the dark ground: paper text, orange accents (6.9:1, fine as text there).

## Covers and share cards: the sunrise panel

Blog covers (1600x900) and the share cards made from them sit on the sunrise gradient panel,
`sunrise-panel.css` (`.s1-sunrise`): a `#fb8a1e` base, a `#ff3a00` glow from both top corners,
fading down through `#f7a54a` and `#eeb795` to `#f2b38a`, with a soft cream horizon arc rising from
the bottom. Never a flat orange cover.

- On top: a white UI card that shows the topic (a comparison, benchmark bars, a checklist, a
  terminal), inside an **ink** selection frame labelled `<topic>.fig`, with an ink cursor at its
  bottom-right corner. The card floats with the `print` shadow `0 30px 60px -30px rgba(90, 30, 0, 0.55)`.
- No title text on a blog cover; the page shows it.
- This is the only gradient background. The reds and peaches are not palette colours; they are
  declared as official asset colours in `tokens.json`.

## Selection frame, layer tag, cursor

- **Frame:** a 1.5px orange outline with 6px padding and 9x9px square handles on the four corners
  (paper fill, orange border).
- **Layer tag, one per piece:** 11px Medium white text on a square orange tag, outside the frame at
  the top-left or bottom-right, named in kebab-case like a Figma layer: `card-metrics`,
  `button-filled-enabled`, `block-print`, `print-swatches`. The tag element carries
  `data-brand-case="explicit"`: its kebab-case name is deliberate, not lowercase copy.
- **One orange selection frame per piece.** The frame is the orange thing; keep other orange small.
- **Cursor:** a solid ink arrow, 32px at 1500px wide, tip up-left, just outside a frame's
  bottom-right corner, as if about to click. SVG path `M3.5 2.5 21 10.2l-7.6 2.3-3.3 7.8z` on a 24px
  box. One or two per canvas.

## Other pieces

- **Metric card:** white, square, 1px soft bottom shadow `0 1px 0 rgba(27, 23, 20, 0.06)`. An
  eyebrow, a 40px Medium number with an orange "+", a thin ink sparkline with an orange end dot, a
  hairline, three small stats.
- **Pill button:** fully round, ink fill, paper Medium label, a 40px orange circle with a white
  up-right arrow at the right end. Secondary: outline pill, 1.5px ink border.
- **Block print:** a flat orange rectangle with grain holding a cream dithered image, often the
  reaching hand after The Creation of Adam. It bleeds off a canvas edge.
- **Swatch strip:** the eight print-ramp squares (`#fdf0e4` to `#9a3412`), no gaps, in a frame
  labelled `print-swatches`.
- **Imagery:** people are dithered real photos only (cream on orange, or ink on paper). Product is a
  real screenshot or simple UI pieces in ink, white and orange.
- **Icons:** Phosphor, Bold for small icons, one set per piece, no emoji.

## Diagrams

Draw them in the same paper style: paper ground with grain and the faint grid, white cards or ink
outlines, ink lines and labels, one orange element for the thing that matters, a layer tag in the
frame. Chart series use the print ramp (`design.roles.series`); data stays in ink and orange marks
the one thing. Build the numbers from the brief only.

## Type

| Level | Weight | Size | Tracking | Notes |
| --- | --- | --- | --- | --- |
| Headline | 500 | 60px on 1500x500, 72px on 1200x630, 40px on 1128x191 | -0.045em, leading 1.1 | Title Case, centred, usually two lines, one or two orange keywords |
| Subline | 400 | a third of the headline, 22px below it | -0.03em | Ink at 60%, items split by a middle dot at ink 32% |
| Body | 400 | 16px, leading 1.6 | -0.03em | Sentence case |
| Eyebrow | 500 | 12px | +0.1em | Uppercase, ink at 55-60% |
| Frame label | 500 | 11px | -0.01em | White on orange |
| Big number | 500 | 28-40px | -0.045em | The "+" in orange |

Orange text on paper only at 40px and up; below that use `#c2410c`. Orange headline keywords are
40px and up.

Pick headline sizes that give a whole-pixel line box at leading 1.1 (80px, 100px, 120px): the lint
warns on fractional line boxes.

The mono stack leads with Liberation Mono because code uses the system monospace and that is what the
agent's Linux computer has; `ui-monospace` does not resolve there.

## Shape and layout

- Square corners (0) on frames, cards, tags, images and block prints. 6px only on content tiles,
  inputs and code blocks. Buttons, avatars and dots fully round. No big rounded cards, no blobs.
- Margins: 52px on a 1500x500 banner, 60px on social posts, 80px on slides. Spacing on a 4px grid.
- Headline centred. Card, button, block print and swatches toward the edges, balanced, with empty
  paper between. Nothing overlaps the headline. Flat and straight-on: no perspective, no device
  mockups.
- Safe zones: X header 1500x500 keeps the bottom-left 400x170 empty; LinkedIn cover 1128x191 keeps
  the left 200px of the bottom half empty and text centred; link preview 1200x630 keeps text inside
  the centre 1000x500.

## Logo

Place the file, never redraw, recolour or generate it (`brand.toml` lists each variant). Main logo
on paper and white, dark-mode logo on Night only. Clear space a quarter of the mark's width.
Never the orange mark on orange. Minimum 16px on screen.

## Motion

- Easing `cubic-bezier(0.16, 1, 0.3, 1)` for everything. 0.25-0.5s hovers and small moves, 0.9s
  entrances, 1.2s headline reveals, each line rising from behind a mask 0.12s after the one before.
- Allowed: rise and fade over a short distance, frames drawing on, a cursor gliding in and clicking,
  a block print sliding in from its edge, straight cuts, an orange block wipe.
- Never: bounce, elastic, spin, 3D flips, zoom blur, glitch, camera shake, lens flares.
- Open on paper with the headline or the mark. End on paper with the mark, studio1hq.com and one
  call to action ("Book a Strategy Call"). Captions: Studio1 Sans Medium, sentence case, two lines
  at most. Nothing may depend on animation to be readable.

## Don't

- Bold, light weights, italics or another font.
- Blue, purple, teal, green, neon or rainbow; any gradient background but the sunrise panel.
- Glow, glass, chrome, bokeh, heavy or coloured shadows (except the `print` shadow on the panel).
- Stock photos, handshakes, robots, brains, circuit boards, emoji, clip art, generated people.
