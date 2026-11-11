/**
 * Case studies written but not yet approved by the client. Their pages are
 * drafts (`draft: true` in content/case-studies/<locale>/<slug>.mdx) and 404,
 * so nothing on the site may link to them. To publish one, remove `draft`
 * from its MDX files and its slug from this list.
 */
export const HIDDEN_CASE_STUDIES: ReadonlySet<string> = new Set([
  "nebius",
  "brightdata",
]);

/** True when `/case-studies/<slug>` is a live page that can be linked. */
export function isCaseStudyPublic(slugOrHref: string) {
  const slug = slugOrHref.split("/").filter(Boolean).pop() ?? "";
  return !HIDDEN_CASE_STUDIES.has(slug);
}
