# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js app router routes and pages (e.g., `about-us`, `pricing`, `case-studies`), `layout.tsx`, global styles in `globals.css`, SEO helpers (`sitemap.ts`, `robots.ts`).
- `components/`: Reusable UI primitives and composite blocks; prefer PascalCase filenames that mirror component names.
- `lib/`, `constants/`, `data/`: Domain helpers, shared configuration, and structured content sources; keep cross-cutting logic here instead of duplicating inside routes.
- `public/`: Static assets exposed as-is; keep exported images referenced with relative `/` paths.
- `docs/`, `mdx-components.tsx`: Documentation and MDX bindings; keep MDX-specific components scoped here.

## Build, Test, and Development Commands
- `pnpm dev`: Start the local Next.js dev server (webpack); updates reflect changes in `app/` and shared modules.
- `pnpm build`: Production build; run before tagging a release or deploying.
- `pnpm start`: Serve the production build locally for smoke-testing.
- `pnpm lint`: ESLint via Next; catches TypeScript/React issues and basic accessibility concerns.
- `pnpm format`: Prettier over the repo; run before opening PRs to avoid churn.
- `pnpm test`: Vitest, once (`pnpm test:watch` to keep it running). `pnpm exec tsc --noEmit` checks types. CI (`.github/workflows/ci.yml`) runs lint, types and tests on every PR.

## Coding Style & Naming Conventions
- TypeScript-first; use functional React components and hooks. Co-locate component-specific styles or utility functions with the component when reasonable.
- Formatting: Prettier defaults (2-space indent, semicolons, double quotes); do not hand-tune spacing that conflicts with the formatter.
- Styling: TailwindCSS for layout/spacing; use `clsx`/`tailwind-merge` for conditional classes; keep utility class order logical (layout → spacing → color).
- Naming: Components and exported hooks in `PascalCase`/`camelCase`; route segments and asset files in `kebab-case` to match existing folders.
- Types: Prefer explicit prop types and narrow unions; avoid `any` unless necessary and documented.

## Testing Guidelines
- Vitest is wired (`pnpm test`). Rules and anything pure (`lib/internal/**/rules.ts`, cleaning, wording) have tests beside them; add one with every new rule.
- Server actions and pages have no automated tests yet: check them by hand in `pnpm dev`, and remember every server action must check the session and role itself.
- Name test files alongside sources with `.test.ts(x)`; keep fixtures small and deterministic.

## Commit & Pull Request Guidelines
- Commit history favors short, tagged summaries like `update: docs` or concise imperatives; match that style (`<verb>: <scope>`), keep bodies focused on rationale and side effects.
- PRs should describe scope, risks, and how to validate (commands run, screens checked). Link issues when applicable and attach screenshots for visual changes.
- Keep changesets scoped: one feature/fix per PR. Update docs or configuration in the same PR when behavior changes.

## Security & Configuration Tips
- Avoid committing secrets; prefer environment variables loaded via `.env.local` (untracked). Document required vars in PRs when new ones are introduced.
- Static assets should be optimized before landing; large media belongs in a CDN, referenced from `public/` only when small.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
