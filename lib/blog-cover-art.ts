/**
 * The illustrations a blog cover can use (drawn in app/blog-cover/cover.tsx),
 * and the rules that pick one from the post's title when the writer hasn't
 * chosen. Plain data, safe for client components: the dashboard's cover
 * picker lists these. A post's frontmatter `coverArt` overrides the rules.
 */

export const COVER_ARTS = [
  { key: "citations", name: "Citations" },
  { key: "answer-box", name: "Answer box" },
  { key: "versus", name: "X vs Y" },
  { key: "benchmarks", name: "Benchmarks" },
  { key: "readme", name: "README file" },
  { key: "trending", name: "Trending list" },
  { key: "metrics", name: "GitHub metrics" },
  { key: "show-hn", name: "Ranked list" },
  { key: "star-history", name: "Star history" },
  { key: "llms-txt", name: "llms.txt file" },
  { key: "tutorial", name: "Tutorial file" },
  { key: "docs-index", name: "Docs index" },
  { key: "quickstart", name: "Quickstart doc" },
  { key: "answer", name: "AI answer" },
  { key: "scorecard", name: "Audit scorecard" },
  { key: "funnel", name: "Funnel" },
  { key: "dx-audit", name: "DX audit checklist" },
  { key: "creator-fit", name: "Reach vs fit" },
  { key: "creator-post", name: "Creator post" },
  { key: "pricing", name: "Pricing table" },
  { key: "checklist", name: "Checklist" },
  { key: "community", name: "Community network" },
  { key: "projects", name: "Project tiles" },
  { key: "calendar", name: "Calendar" },
  { key: "alternatives", name: "Incumbent vs your tool" },
  { key: "cross-post", name: "Cross-posting" },
  { key: "content", name: "Content pages" },
  { key: "demo-script", name: "Demo script" },
  { key: "video", name: "Video player" },
  { key: "youtube", name: "YouTube channel" },
  { key: "what-is", name: "Terminal: explain" },
  { key: "build", name: "Terminal: build" },
  { key: "hello-world", name: "Terminal: hello world" },
  { key: "devrel", name: "DevRel network" },
  { key: "launch-post", name: "Launch post" },
  { key: "launch-plan", name: "Launch plan" },
  { key: "mark", name: "Studio1 mark" },
] as const;

export type CoverArtKey = (typeof COVER_ARTS)[number]["key"];

export function isCoverArt(value: unknown): value is CoverArtKey {
  return typeof value === "string" && COVER_ARTS.some((art) => art.key === value);
}

export function coverArtName(key: CoverArtKey) {
  return COVER_ARTS.find((art) => art.key === key)?.name ?? key;
}

/** The part of a title before its colon: "Bun vs Deno: …" → "Bun vs Deno". */
export function titleLead(title: string) {
  return title.split(":")[0].trim();
}

type Rule = [CoverArtKey, (title: string, tags: readonly string[]) => boolean];

// First match wins, so narrow rules sit above broad ones. Two posts that hit
// the same rule get the same cover; the writer can pick another in the dashboard.
const RULES: Rule[] = [
  // The two pillar guides; narrow on purpose so other GEO and AEO posts keep their art.
  ["citations", (t) => /complete guide to geo\b/i.test(t)],
  ["answer-box", (t) => /complete guide to aeo\b/i.test(t)],
  ["versus", (t) => /\bvs\b/i.test(titleLead(t))],
  ["benchmarks", (t) => /\breviews?\b/i.test(t)],
  ["readme", (t) => /\breadme\b/i.test(t)],
  ["trending", (t) => /trending|trendshift/i.test(t)],
  ["metrics", (t) => /\bmetrics\b/i.test(t) && /open[- ]source|github|stars/i.test(t)],
  ["show-hn", (t) => /hacker news|show hn/i.test(t)],
  ["star-history", (t, tags) => /github|open[- ]source/i.test(t) || tags.some((tag) => /^(github|open-source)$/i.test(tag))],
  ["llms-txt", (t) => /llms\.txt/i.test(t)],
  ["tutorial", (t) => /developer tutorial/i.test(t)],
  ["docs-index", (t) => /documentation best practices/i.test(t)],
  ["quickstart", (t) => /\bdocs\b|documentation/i.test(t)],
  ["answer", (t) => /chatgpt|perplexity/i.test(t)],
  ["scorecard", (t) => /visibility/i.test(t)],
  ["funnel", (t) => /\broi\b/i.test(t)],
  ["dx-audit", (t) => /\baudit\b/i.test(t)],
  ["creator-fit", (t) => /influencer/i.test(t) && /\bfit\b/i.test(t)],
  ["creator-post", (t) => /influencer/i.test(t)],
  ["pricing", (t) => /\bcosts?\b/i.test(t)],
  ["checklist", (t) => /mistake/i.test(t)],
  ["community", (t) => /communit/i.test(t)],
  ["projects", (t) => /projects/i.test(t)],
  ["calendar", (t) => /calendar/i.test(t)],
  ["alternatives", (t) => /alternatives?\b|comparison/i.test(t)],
  ["cross-post", (t) => /cross-post|hashnode/i.test(t)],
  ["content", (t) => /content/i.test(t)],
  ["demo-script", (t) => /\bscript\b/i.test(t)],
  ["video", (t) => /\bvideos?\b/i.test(t)],
  ["youtube", (t) => /youtube/i.test(t)],
  ["what-is", (t) => /^what is/i.test(t)],
  ["build", (t) => /^build\b|step-by-step/i.test(t)],
  ["hello-world", (t) => /hello world/i.test(t)],
  ["devrel", (t) => /devrel for startups/i.test(t)],
  ["launch-post", (t) => /\blaunch/i.test(t) && /\bon x\b|twitter/i.test(t)],
  ["launch-plan", (t) => /\blaunch/i.test(t)],
];

/** The illustration the title picks, or the Studio1 mark when nothing matches. */
export function autoCoverArt(title: string, tags: readonly string[] = []): CoverArtKey {
  return RULES.find(([, test]) => test(title, tags))?.[0] ?? "mark";
}

/** The writer's choice when it's valid, else the title's pick. */
export function coverArtFor(post: { title: string; tags: readonly string[]; coverArt?: string | null }): CoverArtKey {
  return isCoverArt(post.coverArt) ? post.coverArt : autoCoverArt(post.title, post.tags);
}
