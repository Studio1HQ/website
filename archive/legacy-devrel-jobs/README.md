# Legacy DevRel Jobs page (pre-paper)

The DevRel Jobs page as it looked before the "paper" redesign (night header, glass cards).
This folder is not routed; it is kept only for reference.

- `components/devrel-jobs/devrel-jobs-page.tsx`: the original page component.

`app/(site)/devrel-jobs/page.tsx` and `layout.tsx` were not changed by the redesign.

## Restore

Copy the file back over the live one:

```sh
cp archive/legacy-devrel-jobs/components/devrel-jobs/devrel-jobs-page.tsx components/devrel-jobs/devrel-jobs-page.tsx
```

`/devrel-jobs` is also listed in `PAPER_PATHS` in `lib/paper.ts`; remove it there to put the navbar and footer back in their default style.
