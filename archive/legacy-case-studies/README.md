# Legacy case studies (archived)

The pre-paper version of the case studies index (`/case-studies`) and the case
study detail page (`/case-studies/<slug>`), from before they were restyled in
the paper design (cream sheet, ink type, print orange). Not routed: Next.js
only serves pages under `app/`.

The folder mirrors the repo layout:

- `app/(site)/case-studies/` — index page, layout (metadata) and `[slug]` page
- `components/case-studies/` — cards, featured card, detail layout, panels,
  quotes, table of contents and MDX components

To restore, copy the files back over their live counterparts, e.g.
`archive/legacy-case-studies/components/case-studies/*` to
`components/case-studies/` and `archive/legacy-case-studies/app/(site)/case-studies/*`
to `app/(site)/case-studies/`. The legacy pages use `NightHeader` from
`components/shared/night-header`, which is still in the repo.
