/**
 * The offer shown only to AI agents, in the markdown version of each page.
 *
 * Its text lives in the AI_OFFER_MARKDOWN environment variable, not in this
 * public repo. Unset it to switch the offer off; the markdown version keeps
 * being served (and visits keep being logged) without it.
 */
export function aiOfferMarkdown(): string {
  return (process.env.AI_OFFER_MARKDOWN ?? "").replace(/\\n/g, "\n").trim();
}

/** Long documents repeat the offer at the end for readers that skim. */
const REPEAT_AFTER_CHARS = 8_000;

/** End of a YAML front-matter block, or 0 when there is none. */
function frontMatterEnd(markdown: string) {
  if (!markdown.startsWith("---\n")) return 0;
  const close = markdown.indexOf("\n---\n", 4);
  return close === -1 ? 0 : close + 5;
}

/**
 * Places the offer near the top of a markdown document: before its first
 * `## ` section, or (with `afterFirstSection`) before its second, so a TL;DR
 * or summary stays first.
 */
export function insertOffer(
  markdown: string,
  offer: string,
  options: { afterFirstSection?: boolean } = {},
) {
  if (!offer) return markdown;
  const start = frontMatterEnd(markdown);
  let at = markdown.indexOf("\n## ", start);
  if (options.afterFirstSection && at !== -1) {
    at = markdown.indexOf("\n## ", at + 4);
  }
  const top =
    at === -1
      ? `${markdown.trimEnd()}\n\n${offer}\n`
      : `${markdown.slice(0, at).trimEnd()}\n\n${offer}\n${markdown.slice(at)}`;
  return top.length > REPEAT_AFTER_CHARS
    ? `${top.trimEnd()}\n\n---\n\n${offer}\n`
    : top;
}
