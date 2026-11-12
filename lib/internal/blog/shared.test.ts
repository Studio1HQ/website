import { describe, expect, it } from "vitest";
import {
  cleanQuote,
  commentThreads,
  locateQuote,
  nameFromEmail,
  postChecks,
  slugify,
  toMdx,
  type BlogEvent,
  type BlogFields,
} from "@/lib/internal/blog/shared";

const words = (count: number) => Array.from({ length: count }, (_, index) => `word${index}`).join(" ");

function post(overrides: Partial<BlogFields> = {}): BlogFields {
  return {
    title: "How to launch a developer tool",
    seo_title: "",
    slug: "launch-a-developer-tool",
    description: "A practical guide to launching a developer tool: the audience, the channels, and the posts that bring the first thousand users in.",
    tldr_summary: "",
    tldr_bullets: [],
    tags: ["launch", "devrel", "marketing"],
    authors: ["Arindam Majumder"],
    publish_date: null,
    unlisted: false,
    cover_art: null,
    banner_image: null,
    banner_image_alt: null,
    body: `## Why it matters\n\n${words(320)}\n\nSee [our launch service](/product-launch-service).`,
    ...overrides,
  };
}

const ids = (fields: BlogFields, taken: string[] = []) => postChecks(fields, taken).map((check) => `${check.level}:${check.id}`);

describe("postChecks", () => {
  it("passes a complete post", () => {
    expect(postChecks(post()).filter((check) => check.level === "error")).toEqual([]);
  });

  it("needs a title, slug, description, tag and author", () => {
    const result = ids(post({ title: "", slug: "", description: "", tags: [], authors: [] }));
    expect(result).toEqual(expect.arrayContaining(["error:title", "error:slug", "error:description", "error:tags", "error:authors"]));
  });

  it("keeps SEO titles to 60 characters", () => {
    expect(ids(post({ seo_title: "x".repeat(61) }))).toContain("error:seo_title");
    expect(ids(post({ title: "x".repeat(61) }))).toContain("error:seo_title");
    expect(ids(post({ title: "x".repeat(61), seo_title: "Short title" }))).not.toContain("error:seo_title");
  });

  it("refuses a slug another post uses", () => {
    expect(ids(post(), ["launch-a-developer-tool"])).toContain("error:slug");
  });

  it("blocks raw HTML but allows it in code", () => {
    expect(ids(post({ body: `${post().body}\n\n<script>alert(1)</script>` }))).toContain("error:html");
    expect(ids(post({ body: `${post().body}\n\n<iframe src="x"></iframe>` }))).toContain("error:html");
    expect(ids(post({ body: `${post().body}\n\nUse \`<div>\` here.\n\n\`\`\`html\n<div></div>\n\`\`\`` }))).not.toContain("error:html");
    expect(ids(post({ body: `${post().body}\n\nH<sub>2</sub>O` }))).not.toContain("error:html");
  });

  it("needs alt text and no Notion-hosted images", () => {
    expect(ids(post({ body: `${post().body}\n\n![](/blog/uploads/x/a.webp)` }))).toContain("error:alt");
    expect(ids(post({ body: `${post().body}\n\n![chart](https://prod-files-secure.notion-static.com/a.png)` }))).toContain("error:notion-images");
  });

  it("warns about dashes and missing internal links", () => {
    const result = ids(post({ body: `${words(320)} — like this` }));
    expect(result).toContain("warning:dashes");
    expect(result).toContain("warning:internal-link");
  });
});

describe("toMdx", () => {
  it("writes frontmatter the site reads", () => {
    const mdx = toMdx(post({ cover_art: "rocket", tags: ["launch"] }), { date: "2026-11-20", updatedDate: "2026-11-20", extra: { faq: [{ q: "a" }] } });
    expect(mdx).toMatch(/^---\ntitle: "How to launch a developer tool"\n/);
    expect(mdx).toContain('slug: "launch-a-developer-tool"');
    expect(mdx).toContain("date: 2026-11-20");
    expect(mdx).toContain("draft: false");
    expect(mdx).toContain('tags:\n  - "launch"');
    expect(mdx).toContain('coverArt: "rocket"');
    expect(mdx).toContain('faq:\n  - {"q":"a"}');
    expect(mdx).not.toContain("unlisted");
    expect(mdx.trim().endsWith("(/product-launch-service).")).toBe(true);
  });

  it("escapes quotes in values", () => {
    expect(toMdx(post({ title: 'Say "hi"' }), { date: "2026-11-20", updatedDate: "2026-11-20" })).toContain('title: "Say \\"hi\\""');
  });
});

describe("names and slugs", () => {
  it("turns an email into a name", () => {
    expect(nameFromEmail("arindam.majumder@studio1hq.com")).toBe("Arindam Majumder");
  });
  it("makes URL slugs", () => {
    expect(slugify("Crème brûlée: 10 tips & tricks!")).toBe("creme-brulee-10-tips-tricks");
  });
});

describe("comment threads", () => {
  const event = (id: string, extra: Partial<BlogEvent> = {}): BlogEvent => ({
    id,
    post_id: "p",
    created_at: "2026-11-13T10:00:00Z",
    actor: "a@studio1hq.com",
    kind: "comment",
    body: id,
    ...extra,
  });

  it("groups replies under their thread and skips other events", () => {
    const threads = commentThreads([
      event("one", { quote: "launch" }),
      event("approve", { kind: "approved" }),
      event("two"),
      event("reply", { parent_id: "one" }),
      event("orphan", { parent_id: "gone" }),
    ]);
    expect(threads.map((thread) => thread.root.id)).toEqual(["one", "two"]);
    expect(threads[0].replies.map((reply) => reply.id)).toEqual(["reply"]);
  });

  it("cleans quotes", () => {
    expect(cleanQuote("  two\n\nlines  ")).toBe("two lines");
    expect(cleanQuote("x".repeat(400))).toHaveLength(300);
    expect(cleanQuote(42)).toBe("");
  });
});

describe("locateQuote", () => {
  it("finds a quote inside one piece", () => {
    expect(locateQuote(["Hello brave world"], "brave")).toEqual({ start: [0, 6], end: [0, 11] });
  });

  it("finds a quote across pieces, ignoring whitespace differences", () => {
    // A selection over two paragraphs reads "first line second" but the text nodes have no space between them.
    const pieces = ["The first line", "second paragraph"];
    expect(locateQuote(pieces, "first line second")).toEqual({ start: [0, 4], end: [1, 6] });
  });

  it("returns null when the text changed", () => {
    expect(locateQuote(["Hello world"], "goodbye")).toBeNull();
    expect(locateQuote(["Hello world"], "   ")).toBeNull();
  });
});
