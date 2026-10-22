![Studio1](app/opengraph-image.png)

<h1 align="center">Studio1 website</h1>

<p align="center">
  Marketing site for <a href="https://studio1hq.com">Studio1</a>, the technical content and DevRel partner for devtool teams.
</p>

<p align="center">
  Next.js 16 · React 19 · TypeScript · Tailwind CSS · next-intl · MDX · Three.js
</p>

---

## Quick start

Requirements: **Node 22** and **pnpm 9** (`corepack enable` picks up the pinned version).

```bash
pnpm install
cp .env.example .env.local   # only needed for the CMS login
pnpm dev                     # http://localhost:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Local dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build (smoke-test before deploying) |
| `pnpm lint` | ESLint via Next |
| `pnpm format` | Prettier over the repo |
| `pnpm cms:local` | Local Decap CMS backend for editing content without GitHub |
| `pnpm test:agent-readiness` | Checks `llms.txt`, Markdown routes and other AI-crawler signals (set `AGENT_READINESS_BASE_URL`) |

There is no unit-test runner yet. Before opening a PR, run `pnpm lint`, `npx tsc --noEmit` and a `pnpm build`.

## Project structure

```
app/
  (site)/              Pages: home, blog, case-studies, about-us, product,
                       careers, devrel-jobs, privacy, terms
    (services)/        The four service pages
  [locale]/            Localized routes (fr, es, hi, zh)
  blog-md/[slug]/      Markdown version of each post (served at /blog/<slug>.md)
  api/cms/             GitHub OAuth for the CMS
  globals.css          Design tokens (--home-*) and glass utilities
components/
  home/                Homepage sections (night hero, 3D glass logo, hands,
                       campaign slides, process, reach band)
  shared/              NightHeader used at the top of every inner page
  blog/                Post layout, article index, "On this page", AI actions
  pages/, sections/    Service-page sections
  landing/             Navbar, footer, CTA, FAQ
content/
  blog/                Blog posts (MDX + front matter)
  case-studies/        Case studies (MDX, per locale)
  careers/, legal/     Job posts, privacy and terms
messages/              UI strings per locale (en, fr, es, hi, zh)
public/                Static assets; public/admin is the Decap CMS
lib/                   Content loaders, SEO, i18n helpers
```

## Content

**Blog posts** live in `content/blog/<slug>.mdx`. Front matter:

```yaml
---
title: Post title
slug: post-slug
description: One or two sentences for cards and SEO.
tldrSummary: Optional summary for the TL;DR box.
tldrBullets:
  - Optional key takeaways
date: 2026-09-28
draft: false
authors:
  - Studio1 Team
bannerImage: /blog/uploads/post-slug/banner.png
---
```

`##` and `###` headings automatically feed the "On this page" sidebar and the mobile chapter pill.

**Case studies** live in `content/case-studies/<locale>/<slug>.mdx`. Client logos are registered in `components/case-studies/client-logos.ts`.

**The CMS** at `/admin` (Decap) edits the same files through GitHub and opens a PR per change. It needs the variables in `.env.example`.

## AI and LLM readiness

- Every post is also served as clean Markdown at `/blog/<slug>.md`, with front matter, a TL;DR and absolute links. Each post links to it in its head and offers **Copy as Markdown**, **Open in ChatGPT** and **Open in Claude**.
- `public/llms.txt` indexes the site for AI tools.

## Design system

The UI follows one system across all pages:

- **Colour tokens:** the `--home-*` variables in `app/globals.css` (`cream`, `paper`, `ink`, `ink-soft`, `line`, …), with light and dark values. The theme follows the visitor's system setting.
- **Surfaces:** `.s1-glass-card` (frosted card), `.s1-glass-dark`, `.s1-glass-btn` (ember pill) and `.s1-glass-btn-light`. Add `.s1-glass-raised` to a card that overlaps a dark header.
- **Page headers:** `components/shared/night-header.tsx`, a dark header with a slowly drifting orange glow.
- **Building blocks:** `Container`, `SectionIntro`, `Eyebrow`, `PillLink` and `Rise` in `components/home/ui.tsx`.
- **Type:** Studio1 Sans (`app/fonts`).
- **Motion:** `motion/react` for scroll-linked animation, with smooth scrolling from `lenis`. Everything respects `prefers-reduced-motion`. Mark inner scroll areas with `data-lenis-prevent`.
- **Big screens:** above 1800px the page scales up in steps. Full-height sections use `calc(100svh / var(--s1-zoom, 1))`.

## Localization

Locales are `en` (default), `fr`, `es`, `hi` and `zh`, defined in `lib/i18n.ts`. UI strings live in `messages/<locale>.json`. When you add a key, add it to every locale file.

## Environment variables

Only the CMS login needs them. See `.env.example`:

| Variable | Purpose |
| --- | --- |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth app for Decap CMS |
| `GITHUB_OAUTH_SCOPE` | OAuth scope (default `public_repo`) |
| `CMS_SITE_URL` | Public site URL used in the OAuth callback |

Keep secrets in `.env.local`, which is untracked.

## Contributing

- Branch off `main` and keep each PR to one feature or fix.
- Commit messages follow `<verb>: <scope>`, for example `update: blog layout`.
- In the PR, say what changed, how you checked it (commands run, pages viewed), and attach screenshots for visual changes.
- See [`AGENTS.md`](AGENTS.md) for the full repository guidelines.
