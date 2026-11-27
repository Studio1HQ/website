import { readdirSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import imageLoader, { imageWidth } from "./image-loader";
import { imageUrl } from "./image-url";
import { IMAGE_FOLDERS } from "./image-config.mjs";
import {
  importedImages,
  plan,
  publicImages,
  sizedFiles,
} from "../scripts/image-variants.mjs";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("imageLoader", () => {
  it("points public images at their build-time size, as name.webp", () => {
    expect(imageLoader({ src: "/assets/logos/litellm.webp", width: 48 })).toBe(
      "/_img/96/assets/logos/litellm.webp",
    );
    expect(imageLoader({ src: "/blog/uploads/x/cover.png", width: 700 })).toBe(
      "/_img/1280/blog/uploads/x/cover.webp",
    );
    expect(imageLoader({ src: "/careers/team/Photo.JPG", width: 256 })).toBe(
      "/_img/256/careers/team/Photo.webp",
    );
  });

  it("points images imported in code at their sizes by file name", () => {
    expect(
      imageLoader({
        src: "/_next/static/media/jozu.41e3bd9b.webp",
        width: 256,
      }),
    ).toBe("/_img/256/_media/jozu.webp");
    expect(
      imageLoader({
        src: "/_next/static/immutable/media/copilotkit-mark.35zozz-gzgq1o.webp",
        width: 64,
      }),
    ).toBe("/_img/96/_media/copilotkit-mark.webp");
    expect(
      imageLoader({ src: "/_next/static/media/nathan.1a2b3c.png", width: 96 }),
    ).toBe("/_img/96/_media/nathan.webp");
  });

  it("sends SVGs, unchanged, to /_img/as-is", () => {
    expect(
      imageLoader({ src: "/assets/site/studio1-logo.svg", width: 640 }),
    ).toBe("/_img/as-is/assets/site/studio1-logo.svg");
    expect(
      imageLoader({
        src: "/_next/static/media/Crawlee-full.0a1b2c3d.svg",
        width: 256,
      }),
    ).toBe("/_img/as-is/_media/Crawlee-full.svg");
    expect(imageLoader({ src: "/brand/logo.svg", width: 640 })).toBe(
      "/brand/logo.svg",
    );
  });

  it("leaves relative paths alone, even ones that look like a site folder", () => {
    expect(imageUrl({ src: "docs/assets/demo.png", width: 640 })).toBe(
      "docs/assets/demo.png",
    );
    expect(imageUrl({ src: "assets/x.png", width: 640 })).toBe("assets/x.png");
  });

  it("sizes AVIFs like the other photos", () => {
    expect(
      imageLoader({ src: "/products/raah-poster.avif", width: 1000 }),
    ).toBe("/_img/1280/products/raah-poster.webp");
  });

  it("serves blog covers as their WebP, keeping the version", () => {
    expect(
      imageLoader({ src: "/blog-cover/aeo-guide?v=5-2026-11-18", width: 3840 }),
    ).toBe("/blog-cover/aeo-guide/cover.webp?v=5-2026-11-18");
    // Split at the first "?" only: the rest of the query stays whole.
    expect(imageLoader({ src: "/blog-cover/x?v=a?b", width: 640 })).toBe(
      "/blog-cover/x/cover.webp?v=a?b",
    );
  });

  it("leaves everything else alone", () => {
    expect(imageLoader({ src: "https://example.com/a.png", width: 640 })).toBe(
      "https://example.com/a.png",
    );
    expect(imageLoader({ src: "//cdn.example.com/a.png", width: 640 })).toBe(
      "//cdn.example.com/a.png",
    );
    expect(imageLoader({ src: "/internal/blog-media/x.png", width: 640 })).toBe(
      "/internal/blog-media/x.png",
    );
    expect(imageLoader({ src: "/brand/logo.png", width: 640 })).toBe(
      "/brand/logo.png",
    );
    expect(imageLoader({ src: "/api/favicon?d=example.com", width: 64 })).toBe(
      "/api/favicon?d=example.com",
    );
  });

  it("loads sizes and covers from the CDN when IMAGE_ORIGIN is set", () => {
    vi.stubEnv("IMAGE_ORIGIN", "https://cdn.studio1hq.com");
    expect(imageLoader({ src: "/assets/logos/litellm.webp", width: 48 })).toBe(
      "https://cdn.studio1hq.com/_img/96/assets/logos/litellm.webp",
    );
    expect(
      imageLoader({
        src: "/_next/static/media/jozu.41e3bd9b.webp",
        width: 256,
      }),
    ).toBe("https://cdn.studio1hq.com/_img/256/_media/jozu.webp");
    expect(imageUrl({ src: "/assets/site/studio1-logo.svg", width: 96 })).toBe(
      "https://cdn.studio1hq.com/_img/as-is/assets/site/studio1-logo.svg",
    );
    expect(imageLoader({ src: "/blog-cover/aeo-guide?v=5", width: 640 })).toBe(
      "https://cdn.studio1hq.com/blog-cover/aeo-guide/cover.webp?v=5",
    );
    // Other sites' images and other folders still stay as they are.
    expect(imageLoader({ src: "/brand/logo.png", width: 640 })).toBe(
      "/brand/logo.png",
    );
    expect(imageLoader({ src: "https://example.com/a.png", width: 640 })).toBe(
      "https://example.com/a.png",
    );
  });

  it("serves originals in next dev, where the sizes don't exist", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(imageLoader({ src: "/assets/logos/litellm.webp", width: 48 })).toBe(
      "/assets/logos/litellm.webp?w=96",
    );
    expect(imageLoader({ src: "/blog-cover/aeo-guide?v=5", width: 640 })).toBe(
      "/blog-cover/aeo-guide/cover.webp?v=5",
    );
  });

  it("rounds up to a made width, capped at the largest", () => {
    expect(imageWidth(1)).toBe(96);
    expect(imageWidth(96)).toBe(96);
    expect(imageWidth(97)).toBe(256);
    expect(imageWidth(5000)).toBe(1920);
  });
});

describe("image-variants script", () => {
  it("makes every width: resized below the image's own, its own size above", () => {
    expect(plan(400)).toEqual([
      { width: 96, resize: true },
      { width: 256, resize: true },
      { width: 640, resize: false },
      { width: 1280, resize: false },
      { width: 1920, resize: false },
    ]);
  });

  it("covers every public/ folder with images", () => {
    const IMAGE = /\.(?:webp|png|jpe?g)$/i;
    const hasImages = (dir: string): boolean =>
      readdirSync(dir, { withFileTypes: true }).some((entry) =>
        entry.isDirectory()
          ? hasImages(path.join(dir, entry.name))
          : IMAGE.test(entry.name),
      );
    const publicDir = path.join(process.cwd(), "public");
    // brand (a static site of its own) and email (email images) never go through next/image.
    const folders = readdirSync(publicDir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !["_img", "brand", "email"].includes(entry.name),
      )
      .filter((entry) => hasImages(path.join(publicDir, entry.name)))
      .map((entry) => entry.name);
    for (const folder of folders)
      expect(IMAGE_FOLDERS, `add "${folder}" to IMAGE_FOLDERS`).toContain(
        folder,
      );
  });

  it("gives every image its own name.webp, and stops on a clash", async () => {
    const sources = [...(await publicImages()), ...(await importedImages())];
    const files = sizedFiles(sources);
    expect(files.every(({ target }) => !/\.\w+\.webp$/.test(target))).toBe(
      true,
    );
    expect(files.map(({ target }) => target)).toContain(
      "assets/logos/litellm.webp",
    );
    expect(() =>
      sizedFiles([
        { file: "/p/assets/x.png", name: "assets/x.png" },
        { file: "/p/assets/x.webp", name: "assets/x.webp" },
      ]),
    ).toThrow(/would both be/);
  });

  it("copies SVGs as they are and never renames them to .webp", async () => {
    const files = sizedFiles([
      ...(await publicImages()),
      ...(await importedImages()),
    ]);
    const targets = files.map(({ target }) => target);
    expect(targets).toContain("assets/site/studio1-logo.svg");
    expect(targets).toContain("_media/Crawlee-full.svg");
    expect(targets).toContain("products/raah-poster.webp");
  });

  it("finds the images imported in code, each with its own file name", async () => {
    const images = await importedImages();
    expect(images.length).toBeGreaterThan(50);
    expect(new Set(images.map((image) => image.name)).size).toBe(images.length);
    expect(images.map((image) => image.name)).toContain(
      "_media/copilotkit-mark.webp",
    );
  });
});
