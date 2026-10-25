/** Words that keep their own casing in tag labels. */
const SPELLINGS: Record<string, string> = {
  ai: "AI",
  aeo: "AEO",
  api: "API",
  devrel: "DevRel",
  dx: "DX",
  geo: "GEO",
  llm: "LLM",
  seo: "SEO",
};

/** Human label for a tag slug, e.g. "developer-experience" -> "Developer Experience". */
export function tagLabel(tag: string) {
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
