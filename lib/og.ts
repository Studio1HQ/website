/*
 * Open Graph share cards. Every card is 1200x630 (1.91:1), the shape Facebook,
 * LinkedIn, X, Slack and WhatsApp crop to, so nothing is letterboxed:
 *
 * - home:       /og/home, built once at deploy time (app/og/home)
 * - blog posts: /og/blog/<slug>, the post's banner art (app/og/blog/[slug])
 * - all others: /og?title=…&path=…, drawn on the first request and then
 *               served from the CDN for a year (app/og/route.tsx)
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

/** Bump when the card design changes, so CDNs and social networks refetch. */
export const OG_VERSION = 1;

export const HOME_OG_IMAGE = `/og/home?v=${OG_VERSION}`;
export const HOME_OG_ALT =
  "Studio1, the developer marketing and DevRel agency for devtools. Book a strategy call.";

/** Longest title a card prints; longer ones are cut at a word. */
const OG_TITLE_MAX = 90;

type OgSection = { kicker: string; cta: string };

const BOOK = "Book a strategy call";

/** What each part of the site is called on its card, and what the card asks. */
const SECTIONS: [RegExp, OgSection][] = [
  [/^\/blog\/author(\/|$)/, { kicker: "Author", cta: "Read their posts" }],
  [/^\/blog(\/|$)/, { kicker: "Blog", cta: "Read the blog" }],
  [/^\/case-studies(\/|$)/, { kicker: "Case study", cta: BOOK }],
  [/^\/(careers|devrel-jobs)(\/|$)/, { kicker: "Careers", cta: "See open roles" }],
  [/^\/devrel-cohort(\/|$)/, { kicker: "DevRel Cohort", cta: "Apply now" }],
  [/^\/(events|calendar|hackathons)(\/|$)/, { kicker: "Events", cta: "See what's on" }],
  [/^\/compare(\/|$)/, { kicker: "Compare", cta: BOOK }],
  [/^\/best-developer-marketing-agencies(\/|$)/, { kicker: "Guide", cta: BOOK }],
  [/^\/(team|about-us)(\/|$)/, { kicker: "About Studio1", cta: "Meet the team" }],
  [/^\/oss(\/|$)/, { kicker: "Open source", cta: "Explore the projects" }],
  [/^\/product(\/|$)/, { kicker: "Product", cta: "See the product" }],
  [/^\/(results|testimonials)(\/|$)/, { kicker: "Results", cta: BOOK }],
  [/^\/(privacy|terms)(\/|$)/, { kicker: "Legal", cta: "Visit studio1hq.com" }],
];

/** Service pages live at the root (/aeo-agency, /services…), so they are the default. */
const DEFAULT_SECTION: OgSection = { kicker: "Services", cta: BOOK };

export function ogSection(path: string): OgSection {
  return SECTIONS.find(([pattern]) => pattern.test(path))?.[1] ?? DEFAULT_SECTION;
}

/** Only site paths, so a hand-made URL can't put arbitrary text in the label. */
export function cleanOgPath(path: string | null | undefined) {
  return path && /^\/[a-z0-9/-]*$/i.test(path) ? path : "/";
}

export function cleanOgTitle(title: string | null | undefined) {
  const text = (title ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s*\|\s*Studio1$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= OG_TITLE_MAX) return text;
  const cut = text.slice(0, OG_TITLE_MAX - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:–—-]+$/, "")}…`;
}

/**
 * Studio1 Sans covers Latin scripts only. Hindi and Chinese pages share the
 * home card instead of printing missing glyphs.
 */
const LATIN_ONLY = /^[ -ɏ‐-‧‰-⁞€]*$/;

/** Card for any page other than home and blog posts. */
export function ogImageUrl(title: string, path: string) {
  const cleanTitle = cleanOgTitle(title);
  if (!cleanTitle || !LATIN_ONLY.test(cleanTitle)) return HOME_OG_IMAGE;
  const params = new URLSearchParams({
    title: cleanTitle,
    path: cleanOgPath(path),
    v: String(OG_VERSION),
  });
  return `/og?${params}`;
}
