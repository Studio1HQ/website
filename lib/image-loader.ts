"use client";

/**
 * Every next/image on the site goes through this loader instead of Vercel's
 * Image Optimization (which has a monthly cap: past it, new images 402).
 *
 * Images are sized once, at build time (scripts/image-variants.mjs), into a
 * few fixed widths under /_img/<width>/<original path>.webp. They're plain
 * files, so Cloudflare (in front of the site) caches and serves them, with
 * no per-image cost and no cap.
 *
 * A size the build didn't make (the image is narrower than that width, or
 * it's new and the build hasn't run, as in `next dev`) falls back to the
 * original file through the /_img fallback rewrite in next.config.ts.
 */

/** The widths images are made in. Keep in step with scripts/image-variants.mjs. */
export const IMAGE_WIDTHS = [96, 256, 640, 1280, 1920] as const;

const IMAGE_FILE = /\.(?:webp|png|jpe?g)$/i;

/** Image routes that render a picture without a file extension. */
const IMAGE_ROUTES = ["/blog-cover/"];

/** The smallest made width that covers what the browser asked for. */
export function imageWidth(width: number) {
  return (
    IMAGE_WIDTHS.find((made) => made >= width) ??
    IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]
  );
}

export default function imageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  const [path, query] = src.split("?");
  // Other sites' images, SVGs, GIFs and API-made pictures go as they are.
  if (!path.startsWith("/") || path.startsWith("//")) return src;
  if (
    !IMAGE_FILE.test(path) &&
    !IMAGE_ROUTES.some((route) => path.startsWith(route))
  )
    return src;
  return `/_img/${imageWidth(width)}${path}.webp${query ? `?${query}` : ""}`;
}
