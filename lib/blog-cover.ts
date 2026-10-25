/** Every blog cover renders at this one size (16:9), so cards and headers line up. */
export const BLOG_COVER_SIZE = { width: 1600, height: 900 };

/**
 * Bump when the cover artwork in app/blog-cover changes. Optimized images and
 * browsers cache covers by URL for weeks, so a new version is what makes
 * readers see the new design.
 */
const COVER_VERSION = 3;

/** `updated` is the post's updated date, so editing a title refreshes its cover too. */
function version(updated?: string) {
  return `?v=${COVER_VERSION}${updated ? `-${updated}` : ""}`;
}

/** Paper-design cover generated for a post by app/blog-cover/[slug]. */
export function blogCoverUrl(slug: string, updated?: string) {
  return `/blog-cover/${slug}${version(updated)}`;
}
