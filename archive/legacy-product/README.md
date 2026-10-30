# Legacy Product page (archived)

The pre-paper version of the Product page (dark NightHeader hero, glass
cards), kept for reference while the paper design is live. Not routed:
Next.js only serves pages under `app/`.

Paths mirror the repo. To restore, copy the files back over the live ones:

- `app/(site)/product/page.tsx` -> `app/(site)/product/page.tsx`
- `components/product/*.tsx` -> `components/product/`
- `constants/products.ts` -> `constants/products.ts` (the live file has since
  moved to a new shape, without `highlights` or `longDescription`)

`components/shared/night-header.tsx` (used by the old hero) is unchanged.

`archive/` is excluded from `tsconfig.json`, so these files are not
type-checked against the live code.
