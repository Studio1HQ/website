/**
 * Shared by lib/image-loader.ts (the image URLs pages ask for) and
 * scripts/image-variants.mjs (the files the build makes), so the two can't
 * drift apart.
 */

/** The widths every image is made in. */
export const IMAGE_WIDTHS = [96, 256, 640, 1280, 1920];

/**
 * Top-level public/ folders whose images go through next/image. A test keeps
 * this in step with public/.
 */
export const IMAGE_FOLDERS = [
  "assets",
  "blog",
  "case-studies",
  "careers",
  "products",
];

/** Images imported in code get their sizes at /_img/<width>/_media/<file name>.webp. */
export const MEDIA_DIR = "_media";

/**
 * Production pages load the sizes and covers from here: a domain on the same
 * Vercel project, proxied and cached by Cloudflare. Its paths other than
 * /_img and /blog-cover redirect to www (a Cloudflare redirect rule).
 */
export const IMAGE_CDN = "https://cdn.studio1hq.com";
