/** Words that keep their own casing in tag labels. */
const SPELLINGS: Record<string, string> = {
  ai: "AI",
  aeo: "AEO",
  api: "API",
  devrel: "DevRel",
  dx: "DX",
  geo: "GEO",
  github: "GitHub",
  llm: "LLM",
  seo: "SEO",
};

/** Whole tags whose label isn't a word-by-word title case of the slug. */
const TAG_LABELS: Record<string, string> = {
  "llms-txt": "llms.txt",
  "x-twitter": "X (Twitter)",
};

/** Human label for a tag slug, e.g. "developer-experience" -> "Developer Experience". */
export function tagLabel(tag: string) {
  const known = TAG_LABELS[tag.toLowerCase()];
  if (known) return known;
  return tag
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(
      (word) =>
        SPELLINGS[word.toLowerCase()] ??
        (word.length <= 3 && word === word.toUpperCase() ? word : word[0].toUpperCase() + word.slice(1)),
    )
    .join(" ");
}
