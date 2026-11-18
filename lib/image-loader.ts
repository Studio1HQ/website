"use client";

import { IMAGE_FOLDERS, IMAGE_WIDTHS, MEDIA_DIR } from "./image-config.mjs";

/**
 * Every next/image on the site goes through this loader instead of Vercel's
 * Image Optimization (which has a monthly cap: past it, new images 402).
 *
 * Images are sized once, before `next build` (scripts/image-variants.mjs),
 * into fixed widths under /_img. They're plain files, so Cloudflare caches
 * and serves them, with no per-image cost and no cap.
 *
 *   /assets/logos/x.webp                  → /_img/<width>/assets/logos/x.webp.webp
 *   /_next/static/media/x.3f2a1b.webp     → /_img/<width>/_media/x.webp.webp
 *   /blog-cover/<slug>?v=5                → /blog-cover/<slug>/cover.webp?v=5
 *
 * In production these are on cdn.studio1hq.com (IMAGE_ORIGIN, set in
 * next.config.ts); previews and local builds use their own host.
 *
 * Anything else (other sites' images, other folders) is left as it is. In
 * `next dev` the sizes don't exist, so pages get the original files.
 */

const IMAGE_FILE = /\.(?:webp|png|jpe?g)$/i;
/** An image imported in code: /_next/static/[immutable/]media/<name>.<hash>.<ext> */
const STATIC_MEDIA =
  /^\/_next\/static\/(?:[\w-]+\/)?media\/(.+)\.[\w-]+\.(webp|png|jpe?g)$/i;
const BLOG_COVER = /^\/blog-cover\/([a-z0-9-]+)$/;

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
  const keep = query ? `?${query}` : "";
  const origin = process.env.IMAGE_ORIGIN ?? "";
  // Covers: a WebP drawn at build time by app/blog-cover/[slug]/cover.webp.
  const cover = BLOG_COVER.exec(path);
  if (cover) return `${origin}/blog-cover/${cover[1]}/cover.webp${keep}`;
  const made = imageWidth(width);
  if (process.env.NODE_ENV === "development") {
    // No sizes in dev: the original (the width only keeps Next's loader check quiet).
    return `${src}${query ? "&" : "?"}w=${made}`;
  }
  const media = STATIC_MEDIA.exec(path);
  if (media)
    return `${origin}/_img/${made}/${MEDIA_DIR}/${media[1]}.${media[2]}.webp${keep}`;
  if (IMAGE_FILE.test(path) && IMAGE_FOLDERS.includes(path.split("/")[1]))
    return `${origin}/_img/${made}${path}.webp${keep}`;
  return src;
}
