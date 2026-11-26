---
name: studio1-pitch-deck
description: Build an intro or pitch deck for a named company from a research brief. Writes a slide outline first, then a 1920x1080 static deck rendered to PDF. Use for "pitch deck for X", an intro deck or a proposal deck.
---

# Studio1 pitch deck

A deck for a named company shows that we looked at them and know how to help. The outline is the
source of truth: slides are built from it, and every edit goes to the outline first. The editable
PowerPoint is built from the same outline, so keep it structured.

## 1. Research first

Read `research/brief.md` in the project folder. If it is missing, run `studio1-company-research`
and come back when it is done. Also read `skills/studio1-context/SKILL.md` and its
`references/services.md`, `references/case-studies.md` and `references/testimonials.md`. Facts
about Studio1 come from there, never from memory.

If the brief reports a conflict with a current client, stop and tell a founder before building.

## 2. Write the outline

Write `deck/outline.json` before any HTML, to [the outline schema](references/outline.schema.json).
It is the source of truth: `company`, `deck_title`, and one entry per slide with `n`, `kind`,
`purpose`, `headline`, `body` (lines), `proof` (claim and source pairs), `visual` and `notes`. Only
`n`, `kind` and `headline` are required. Then generate `deck/outline.md` from it, the readable copy
a person can skim, one block per slide:

```
## 03. The gap
- purpose: why this slide exists, in one line
- headline: the sentence on the slide
- body: the few lines under it, verbatim
- proof: the source of every fact on it (brief section or studio1-context file)
- visual: what the eye sees (real screenshot, diagram, number, quote)
```

Edit the JSON first and regenerate the markdown, never the other way round.

Slides are numbered `01` and up. `kind` picks the PowerPoint layout: the seven default slides use
`cover`, `observations`, `gap`, `plan`, `proof`, `how` and `next`; use `section` for a divider and
`generic` for anything else. A `proof` slide holds up to three claims. Copy the words as final: what the outline says is what ships.

### The default intro: seven slides

| # | Slide | What it holds |
| --- | --- | --- |
| 01 | Cover | their name and ours; offer two cover options (section 3) |
| 02 | What we noticed about them | two or three specific observations from the brief, each checkable |
| 03 | The gap | where they are behind the competitors in how they reach developers |
| 04 | What we would do | two or three moves that close the gap, named plainly |
| 05 | Proof | the two or three closest case studies, each named |
| 06 | How we work | the working rhythm and who they would meet |
| 07 | Next step | one ask: a call, with the person's own dates if given |

A proposal deck may add slides: scope per service, a timeline, a team page, terms. Add one only
when it carries something the person asked for, and keep the order above for the first seven.

### Rules for the words

- Specific beats flattering. "Your last three launches had no tutorial" beats "you are a leader in
  your space". If the brief cannot back a line, cut it.
- Proof numbers come from `studio1-context` only, each with the case study named beside it. Never
  round up, merge two case studies' numbers or use a case study that file marks as not public.
- Only items a founder approved from the brief go on slides. Competitor pricing, guesses and the
  "still unknown" list stay in the brief. If nobody approved items yet, ask which, with the list.
  When the run was started by an event and nobody is there to answer, build a draft anyway: use
  only observations about the company itself that its own public pages back, mark the cover
  "Draft for review", and list every brief item you used under "Waiting on a founder".
- Never name, link, quote or show another agency.
- Money: never write a price, rate, discount or deal value unless a founder typed it in this
  thread. Leave a marked blank in the outline and the slide (`[price: founder to fill]`) and ask.
  A blank on a slide is checked by eye and listed in the note.

## 3. Build

Static HTML rendered to PDF through `stills` (read it, and `brand-design`). The brand pack decides
every design choice: grounds, type, accents, the cover, logos. Do not restate or override it here.

1. One page per slide in `deck/slides/NN.html`, built from one shared page style at 1920x1080.
2. Offer two cover options (two finished pages, rendered, with `start_looks` or side by side on
   one sheet) and carry on with the first unless the person picks the other.
3. Real assets: the client's real product screenshots from their public pages
   (`fetch_asset`), our case-study images from `studio1-context`. Nothing invented.
4. Render each slide to PNG, `html2png.mjs --size 1920x1080`, and the set to PDF with
   `html2pdf.mjs --size 20x11.25in --brand-fonts`.

## 4. Gates, then look

Before delivery, in this order:

1. `node /workspace/tools/brand-lint.mjs deck/slides/NN.html` for every slide; exit 0.
2. `node /workspace/tools/text-fidelity.mjs --html deck/slides/NN.html --expect deck/NN.txt` for
   each slide, where `NN.txt` holds the headline and body lines from the outline, one per line; then
   `node /workspace/tools/text-fidelity.mjs deck/deck.pdf` for the PDF.
3. Copy [the example contract](references/deck-contract.example.json) to
   `projects/<slug>/deck/artifact-contract.json` with the real slug and requirements, then run
   `node /workspace/tools/artifact-contract.mjs --contract projects/<slug>/deck/artifact-contract.json
   --phase plan` at the start and `--phase final` at the end, with one
   `--expect projects/<slug>/deck/renders/slide-NN-1920x1080.png:1920x1080` per slide. The gate sizes
   PNGs, not PDFs, so the PDF is checked by `text-fidelity` and your eyes. The seven-slide default
   is the floor.
4. Look at every slide, as a sheet (`visual-verify`): one idea per slide, nothing clipped, the
   eye lands on the headline, no blank left unmarked. Fix what is off.

Exit 2 from any gate is a tooling failure you report, not a pass.

## 5. Deliver

Nothing goes to the company by itself: you prepare, a person sends. Deliver the PDF and
`deck/outline.json` with `upload_files`, so the PowerPoint can be built from it, and reply with
three lines:

- **Done:** what is built (slide count, the cover chosen).
- **Waiting on a founder:** blanks for price, approved brief items, anything unconfirmed.
- **Next:** what you will do on a yes (edits to the outline, the PowerPoint, a one-pager).
