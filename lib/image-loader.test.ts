import { describe, expect, it } from "vitest";
import imageLoader, { IMAGE_WIDTHS, imageWidth } from "./image-loader";
import {
  IMAGE_WIDTHS as SCRIPT_WIDTHS,
  plan,
} from "../scripts/image-variants.mjs";

describe("imageLoader", () => {
  it("points local images at their build-time size", () => {
    expect(imageLoader({ src: "/assets/logos/litellm.webp", width: 48 })).toBe(
      "/_img/96/assets/logos/litellm.webp.webp",
    );
    expect(imageLoader({ src: "/blog/jev1.png", width: 700 })).toBe(
      "/_img/1280/blog/jev1.png.webp",
    );
    expect(
      imageLoader({
        src: "/_next/static/media/jozu.41e3bd9b.webp",
        width: 256,
      }),
    ).toBe("/_img/256/_next/static/media/jozu.41e3bd9b.webp.webp");
  });

  it("keeps a blog cover's version query", () => {
    expect(
      imageLoader({ src: "/blog-cover/aeo-guide?v=5-2026-11-18", width: 3840 }),
    ).toBe("/_img/1920/blog-cover/aeo-guide.webp?v=5-2026-11-18");
  });

  it("leaves other sites' images, SVGs and API pictures alone", () => {
    expect(imageLoader({ src: "https://example.com/a.png", width: 640 })).toBe(
      "https://example.com/a.png",
    );
    expect(imageLoader({ src: "//cdn.example.com/a.png", width: 640 })).toBe(
      "//cdn.example.com/a.png",
    );
    expect(
      imageLoader({ src: "/assets/site/studio1-logo.svg", width: 64 }),
    ).toBe("/assets/site/studio1-logo.svg");
    expect(imageLoader({ src: "/api/favicon?d=example.com", width: 64 })).toBe(
      "/api/favicon?d=example.com",
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
  it("makes the same widths the loader asks for", () => {
    expect(SCRIPT_WIDTHS).toEqual([...IMAGE_WIDTHS]);
  });

  it("resizes below an image's own width, and re-encodes PNG/JPEG at its own size above it", () => {
    expect(plan(400, true)).toEqual([
      { width: 96, resize: true },
      { width: 256, resize: true },
    ]);
    expect(plan(1600, false)).toEqual([
      { width: 96, resize: true },
      { width: 256, resize: true },
      { width: 640, resize: true },
      { width: 1280, resize: true },
      { width: 1920, resize: false },
    ]);
  });
});
