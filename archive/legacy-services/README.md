# Legacy service pages (pre-paper)

Snapshot of the four service pages and their components before they were
restyled into the paper design (cream sheet, ink type, print orange):

- `/technical-content-marketing`
- `/developer-relations-growth-campaigns`
- `/developer-video-production`
- `/developer-documentation-dx-audit`

Files mirror their original paths relative to the repo root. `archive/` is
not routed, so nothing here is served.

## Restore

Copy a file back over its live counterpart, e.g.

```sh
cp "archive/legacy-services/components/pages/shared/service-night-hero.tsx" components/pages/shared/
cp "archive/legacy-services/app/(site)/(services)/technical-content-marketing/page.tsx" "app/(site)/(services)/technical-content-marketing/"
```

To restore everything, copy the whole tree back (`cp -r archive/legacy-services/* .`).
The paper version added `components/pages/shared/paper-service-kit.tsx`; it can
stay (unused) or be deleted after a full restore.
