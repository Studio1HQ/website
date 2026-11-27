import {
  AS_IS_DIR,
  AS_IS_IMAGE,
  IMAGE_FOLDERS,
  IMAGE_WIDTHS,
  MEDIA_DIR,
  SIZED_IMAGE,
  webpName,
} from "./image-config.mjs";

/**
 * Where a site image is served from. next/image reaches this through
 * lib/image-loader.ts; plain <img> tags, video posters and CSS masks call it
 * directly. A plain module (no "use client"), so server components can too.
 *
 * Images are sized once, before `next build` (scripts/image-variants.mjs),
 * into fixed widths under /_img. They're plain files, so Cloudflare caches
 * and serves them, with no per-image cost and no cap.
 *
 *   /assets/logos/x.png                   → /_img/<width>/assets/logos/x.webp
 *   /_next/static/media/x.3f2a1b.webp     → /_img/<width>/_media/x.webp
 *   /assets/site/logo.svg                 → /_img/as-is/assets/site/logo.svg
 *   /_next/static/media/x.3f2a1b.svg      → /_img/as-is/_media/x.svg
 *   /blog-cover/<slug>?v=5                → /blog-cover/<slug>/cover.webp?v=5
 *
 * In production these are on cdn.studio1hq.com (IMAGE_ORIGIN, set in
 * next.config.ts); previews and local builds use their own host.
 *
 * Anything else (other sites' images, other folders) is left as it is. In
 * `next dev` the sizes don't exist, so pages get the original files.
 */

/** An image imported in code: /_next/static/[immutable/]media/<name>.<hash>.<ext> */
const STATIC_MEDIA =
  /^\/_next\/static\/(?:[\w-]+\/)?media\/(.+)\.[\w-]+\.(webp|png|jpe?g|avif|svg)$/i;
const BLOG_COVER = /^\/blog-cover\/([a-z0-9-]+)$/;

/** The smallest made width that covers what the browser asked for. */
export function imageWidth(width: number) {
  return (
    IMAGE_WIDTHS.find((made) => made >= width) ??
    IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]
  );
}

/** The largest made width: the image itself as WebP, unless it's wider. */
export const LARGEST_WIDTH = IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];

export function imageUrl({ src, width }: { src: string; width: number }) {
  // Split at the first "?" only, so the whole query (even one with a "?" in
  // it) is kept.
  const mark = src.indexOf("?");
  const path = mark === -1 ? src : src.slice(0, mark);
  const query = mark === -1 ? "" : src.slice(mark + 1);
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
  if (media) {
    if (AS_IS_IMAGE.test(path))
      return `${origin}/_img/${AS_IS_DIR}/${MEDIA_DIR}/${media[1]}.svg${keep}`;
    return `${origin}/_img/${made}/${MEDIA_DIR}/${media[1]}.webp${keep}`;
  }
  // Only the site's own files (/assets/..., /blog/...): relative paths and
  // other sites' images stay as they are.
  if (!path.startsWith("/") || !IMAGE_FOLDERS.includes(path.split("/")[1]))
    return src;
  if (AS_IS_IMAGE.test(path))
    return `${origin}/_img/${AS_IS_DIR}${path}${keep}`;
  if (SIZED_IMAGE.test(path))
    return `${origin}/_img/${made}${webpName(path)}${keep}`;
  return src;
}
