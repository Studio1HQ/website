/**
 * What the /_img fallback rewrite (next.config.ts) may serve when a size
 * wasn't made: public image files, images imported in code and blog covers.
 * Never a page or an API route. /_img URLs skip proxy.ts (they have a dot)
 * and Cloudflare caches them publicly, so a rewrite to anything else could
 * put a signed-in dashboard page in a public cache.
 */

/**
 * Top-level public/ folders whose images go through next/image. A test keeps
 * this in step with public/ and scripts/image-variants.mjs.
 */
export const IMAGE_FOLDERS = [
  "assets",
  "blog",
  "case-studies",
  "careers",
  "products",
] as const;

/** One path segment that is never "." or "..". */
const SEGMENT = "[A-Za-z0-9_@-][A-Za-z0-9._@-]*";
const IMAGE_EXT = "\\.(?:webp|png|jpe?g)";

export const IMAGE_FALLBACKS = [
  {
    // /_img/640/assets/logos/x.webp.webp → /assets/logos/x.webp
    source: `/_img/:width(\\d+)/:file((?:${IMAGE_FOLDERS.join("|")})(?:/${SEGMENT})+${IMAGE_EXT})\\.webp`,
    destination: "/:file",
  },
  {
    // /_img/96/_next/static/media/x.3f2a.webp.webp → /_next/static/media/x.3f2a.webp
    source: `/_img/:width(\\d+)/_next/static/:file((?:immutable/)?media/${SEGMENT}${IMAGE_EXT})\\.webp`,
    destination: "/_next/static/:file",
  },
  {
    // /_img/1280/blog-cover/some-post.webp?v=5 → /blog-cover/some-post?v=5
    source: "/_img/:width(\\d+)/blog-cover/:slug([a-z0-9-]+)\\.webp",
    destination: "/blog-cover/:slug",
  },
];
