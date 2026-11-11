# Amitesh review notes

Design items to review before any changes. Nothing here has been changed in code yet. Each item says where the drift is and which rule in [DESIGN.md](public/brand/design-system/DESIGN.md) it breaks. Add notes under any item, and tick it once it's decided.

Audit run on 9 Nov 2026 against the `ui` branch. Overall the redesign is consistent: 143 uses of `rounded-[6px]` against about 10 outlier radii. `tailwind.config.ts:39-47` maps semibold and bold to 500, so the ~35 `font-bold` / `font-semibold` classes don't render heavier; they're code cleanup only.

## Functional bug (not only design)

- [ ] **Mobile menu ignores the paper theme.** `components/landing/navbar.tsx:586-610` uses `bg-background`, `shadow-2xl` and `rounded-md`. On paper pages the menu shows white, or near-black when the phone is in dark mode. Suggested: paper background, the `raised` shadow, 6px corners.

## Home

- [ ] **Blue verified badge** `#1d9bf0` next to testimonial names: `components/paper/paper-sections.tsx:2318`, `app/(site)/testimonials/page.tsx:260`. Rule: no blue (§3). Suggested: ink `#141414`.
- [ ] **Georgia serif italic**: margin note at `components/paper/paper-sections.tsx:1434` and the hero SVG at `components/paper/paper-hero.tsx:189-190`. Rule: Studio1 Sans only, no italics (§2). Suggested: Studio1 Sans, upright.
- [ ] **Gradients outside the two allowed ones**: `#fe3200 → #fc8c04` at `components/paper/paper-sections.tsx:850, 2103` and `components/pages/shared/paper-service-kit.tsx:453`. Rule: only the mark gradient and the print panel (§3). Suggested: flat `#f97316` with grain.
- [ ] **Rubber stamp colours**: `#7c2d12`, `#ea580c`, `#fdba74` and an SVG `fontWeight="700"` at `components/paper/paper-sections.tsx:1488-1561`. Rule: print ramp only, weights 400/500. Suggested: print 600 `#e2620d` / 700 `#c2410c`, weight 500.
- [ ] **Off-palette insets**: `#fbf9f5` (1782), `#f8f6f2` (1809), `#f5f1ea` (2348), `#fbfaf7` (2514) in `paper-sections.tsx`; `#f6f3ee` in the navbar and footer; `#f1ece4` ×21 in the case-study components. Rule: surface is `#ece6dc`, cards are white (§3). Suggested: `#ece6dc` for wells, white for cards.
- [ ] **Night card** `#1d1d1d` (`paper-sections.tsx:101`). Rule: Night card is `#141414`, surface `#1b1b1a`.
- [ ] **H2 case is mixed**: sentence case at `paper-sections.tsx:818, 2058`; Title Case for "Why Tech Companies Choose Studio1", "What Our Clients Say", "How Developers Find and Adopt Your Product". All service-page H2s are sentence case. Rule: headlines use Title Case (§2). Decide which way and apply it everywhere.

## Navbar (every page)

- [ ] **Ink is `#1b1714`**, not `#141414`: `components/landing/navbar.tsx:474, 478, 560`.
- [ ] **Tabler icons** (13) instead of Phosphor. Rule: one icon set, Phosphor (§5).

## Buttons and CTAs

- [ ] **Three primary button variants**:
  - `StrategyCallButton` (`components/paper/paper-hero.tsx:271`): h-14, 16px, 40px dot.
  - `BookCall` (`components/pages/shared/service-story.tsx:160`): h-12, 15px, 36px dot, white sheen gradient (189), heavy shadow.
  - `PaperCta` (`components/paper/paper-sections.tsx:2690`): h-12, orange-brown shadow.

  Rule: one `.s1-btn` (§5): 48px (56px hero), 36px orange dot, hover opacity .88. Suggested: one shared component.
- [ ] **Service hero secondary action** is an underlined link (`service-story.tsx:282`) while `OutlineLink` (`paper-sections.tsx:233`) exists. Rule: secondary button is the outline pill.

## Shadows and cards

- [ ] **Bespoke shadows**: 18 in `paper-sections.tsx`, 14 in `service-story.tsx`, 15 in `paper-service-kit.tsx`. Rule: only `card`, `raised` and `print` (§4).
- [ ] **Two card styles**: the canonical `.s1-tile` (white, 1px ink 14% border, 6px, `raised` on hover) vs the de facto `CELL` (`paper-sections.tsx:113`: `bg-white/80`, ring 10%, heavier hover shadow). Pick one.

## Services

- [ ] **Off-palette hex**: 11 in `service-story.tsx` (`#fff1e4`, `#ffd9b8`, `#ea580c` ×3, `#000`), 13 in `paper-service-kit.tsx`.
- [ ] **Radii of 3/4/5px**: `paper-service-kit.tsx:216, 483, 903-978`; `components/pages/shared/hero-sides.tsx:344, 430, 479`. Rule: 0, 4, 6 or 999 only.
- [ ] **H2 scale outliers**: `paper-service-kit.tsx:696` (34px), `:911` (44px), `PaperCta` (52px, `paper-sections.tsx:2684`). Canonical: `SectionHead` 32/40/46.

## Case studies

- [ ] **Orange gradient chips** `#fb923c → #f97316 → #ea580c`: `components/case-studies/case-hero.tsx:99`, `results-panel.tsx:79`, `case-story.tsx:64, 229`, `case-chapters.tsx:140`, `table-of-contents.tsx:165`. Suggested: flat `#f97316`, no orange-tinted shadows.
- [ ] **MDX code and tables fall back to old styles**: case-study MDX doesn't override `pre` / `table`, so `mdx-components.tsx:79` (`rounded-lg`, `bg-zinc-950`) and `:129` (18px glass card) render. Suggested: reuse `BlogPre` / `BlogTable` from `components/blog/mdx.tsx`.
- [ ] **Heading scale**: detail H1 30/40px (`case-hero.tsx:70`) vs 52 on the index and 64 on services; H2s are 28, 30 and 48 in different components.
- [ ] **Italic and old font classes** in `case-study-quote.tsx:70-84`.

## Blog

- [ ] **Base blockquote style** (`mdx-components.tsx:122`: `rounded-r-2xl`, italic, `bg-primary/5`) fights the post styles (`components/blog/post-layout.tsx:339`).
- [ ] **Links are orange text** (`prose-a:text-[#c2410c]`, `post-layout.tsx:339`). Rule: links are ink with an underline, turning print 700 on hover.
- [ ] **Code block and banner blacks**: `#0c0908` / zinc in `components/blog/code-block.tsx:47`; `#0b0b0b` in `post-layout.tsx:270`, `paper-blog-index.tsx:94`, `latest-articles.tsx:40`. Rule: Night `#0d0d0d`.
- [ ] **H1 sizes**: 76px on the blog index (`paper-blog-index.tsx:373`), 62px on posts (`post-layout.tsx:186`). Hero spec is 68px.

## Forms and focus

- [ ] **Orange focus rings** (not allowed on paper): `components/paper/paper-form.tsx:14, 156` (contact form), `devrel-jobs-page.tsx` ×4, hackathon pages. Rule: 2px ink ring, offset 2px.
- [ ] **Contact form inputs**: `bg-[#f8f5ef]`, ring 12%, placeholder 35%, error `#c0341d`. Rule: white input, 1px ink 14% border, error `#cf222e`.

## Secondary routes

- [ ] **Radii**: DevRel cohort page 18/14/12/10px (`components/devrel-cohort/devrel-cohort-page.tsx:63, 390-643, 904`); events 7/10/14/8px (`components/events/event-gallery.tsx:202-451`, `events-page.tsx:51`); hackathon boards 10px.
- [ ] **Product page colours**: blue `#0E63D1` (`components/product/product-hero.tsx:196`), green `#16a34a` (`raah-chapter.tsx:310`), teal swatches (`assetsnip-chapter.tsx:34-38`). Could be fine if they're real product UI colours; decide.
- [ ] **Hackathons**: `#fbbf24` (`flap.tsx:24`, `departures-board.tsx:371`), `#fb923c` gradient (`spotlight.tsx:88`).
- [ ] **Legacy glow orbs** still mounted, hidden behind the paper page: `app/(site)/product/layout.tsx:25`.
- [ ] **Machine view** (`components/paper/machine-view.tsx`): `text-neutral-*` ×14, bold, italic.

## Contrast

- [ ] **Small text below the 60% floor**: ink at 40–55% on 9.5–11.5px text in `hero-sides.tsx` (×23, lines 95-902), `paper-hero.tsx:254-587`, `paper-sections.tsx:1671-1928, 2514-2533`, `case-studies/table-of-contents.tsx:157-304`, `case-hero.tsx:172`. Rule: 60% minimum for small text, 12px minimum.
- [ ] **`--p-muted` is 0.62** (`lib/paper.ts:25`, `paper-sections.tsx:89`). Rule: 70% for secondary text.
- [ ] **Empty alt on content images**: the "Why Studio1" screenshots on home (`paper-sections.tsx:2259`).

## Layer labels

- [ ] **Labels that break the kebab-case rule** (§5): `card / service-selected` (`paper-sections.tsx:836`), `quote / client` (`:2293`), `quote / featured` (testimonials page), `stat · reddit`-style labels in `hero-sides.tsx`. Suggested: `card-service-selected`, `quote-client`, `quote-featured`, `stat-reddit`.
- Kept as they are by decision (9 Nov): 6px corners on images, and the `.yml` workflow labels on service pages (`repo-growth.yml` and others).

## Notes

_Add notes here._
