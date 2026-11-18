import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { IMAGE_FALLBACKS, IMAGE_FOLDERS } from "./image-paths";

// Next's own copy of path-to-regexp, the one it matches rewrites with (it ships no types).
const { pathToRegexp } = createRequire(import.meta.url)(
  "next/dist/compiled/path-to-regexp",
) as {
  pathToRegexp: (route: string) => RegExp;
};

const IMAGE = /\.(?:webp|png|jpe?g)$/i;
/** Same as SKIP_PUBLIC in scripts/image-variants.mjs. */
const SKIPPED = ["_img", "brand", "email"];

function hasImages(dir: string): boolean {
  return readdirSync(dir, { withFileTypes: true }).some((entry) =>
    entry.isDirectory()
      ? hasImages(path.join(dir, entry.name))
      : IMAGE.test(entry.name),
  );
}

const served = (url: string) =>
  IMAGE_FALLBACKS.some((rule) => pathToRegexp(rule.source).test(url));

describe("/_img fallback rewrite", () => {
  it("covers every public/ folder with images", () => {
    const publicDir = path.join(process.cwd(), "public");
    const folders = readdirSync(publicDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !SKIPPED.includes(entry.name))
      .filter((entry) => hasImages(path.join(publicDir, entry.name)))
      .map((entry) => entry.name);
    for (const folder of folders)
      expect(IMAGE_FOLDERS, `add "${folder}" to IMAGE_FOLDERS`).toContain(
        folder,
      );
  });

  it("serves public images, imported images and blog covers", () => {
    expect(served("/_img/640/assets/logos/copilotkit-mark.webp.webp")).toBe(
      true,
    );
    expect(
      served("/_img/96/blog/uploads/viral-launch-on-x/cover.png.webp"),
    ).toBe(true);
    expect(
      served(
        "/_img/1920/case-studies/jozu/devfest-pune-2025-portrait.webp.webp",
      ),
    ).toBe(true);
    expect(served("/_img/256/_next/static/media/jozu.41e3bd9b.webp.webp")).toBe(
      true,
    );
    expect(
      served(
        "/_img/256/_next/static/immutable/media/copilotkit-mark.35zozz-gzgq1o.webp.webp",
      ),
    ).toBe(true);
    expect(
      served("/_img/1280/blog-cover/answer-engine-optimization-guide.webp"),
    ).toBe(true);
  });

  it("never reaches pages, API routes, scripts or other folders", () => {
    expect(served("/_img/96/internal/money.webp")).toBe(false);
    expect(served("/_img/96/internal/blog-media/x.png.webp")).toBe(false);
    expect(served("/_img/96/api/internal/export.png.webp")).toBe(false);
    expect(served("/_img/96/admin.webp")).toBe(false);
    expect(served("/_img/96/assets/../internal/money.png.webp")).toBe(false);
    expect(served("/_img/96/assets/./x.png.webp")).toBe(false);
    expect(served("/_img/96/assets.webp")).toBe(false);
    expect(served("/_img/96/_next/static/chunks/app.js.webp")).toBe(false);
    expect(served("/_img/96/_next/static/media/../chunks/x.png.webp")).toBe(
      false,
    );
    expect(served("/_img/96/blog-cover/../internal.webp")).toBe(false);
    expect(served("/_img/96/brand/logo.png.webp")).toBe(false);
  });
});
