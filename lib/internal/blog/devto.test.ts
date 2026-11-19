import { describe, expect, it } from "vitest";
import {
  absoluteLinks,
  canonicalSlug,
  canonicalUrl,
  devDraft,
  devEditUrl,
  devPath,
  devSort,
  devTags,
  devTotals,
  isDevPath,
  notOnDev,
  readDevArticles,
  sortDevArticles,
  type DevArticle,
} from "@/lib/internal/blog/devto";

const SITE = "https://www.studio1hq.com";

const article = (patch: Partial<DevArticle>): DevArticle => ({
  id: 1,
  title: "A post",
  url: "https://dev.to/studio1/a-post-1a2b",
  published: true,
  publishedAt: "2026-11-10T09:00:00Z",
  reactions: 0,
  comments: 0,
  views: 0,
  slug: null,
  ...patch,
});

describe("DEV copies of Studio1 posts", () => {
  it("reads the post slug from studio1hq.com blog URLs only", () => {
    expect(canonicalSlug(`${SITE}/blog/aeo-guide`)).toBe("aeo-guide");
    expect(canonicalSlug("https://studio1hq.com/blog/aeo-guide/")).toBe(
      "aeo-guide",
    );
    expect(
      canonicalSlug("http://www.studio1hq.com/blog/aeo-guide?utm_source=dev"),
    ).toBe("aeo-guide");
    expect(canonicalSlug("https://dev.to/studio1/aeo-guide-1a2b")).toBeNull();
    expect(
      canonicalSlug("https://studio1hq.com.evil.com/blog/aeo-guide"),
    ).toBeNull();
    expect(canonicalSlug(`${SITE}/fr/blog/aeo-guide`)).toBeNull();
    expect(canonicalSlug(`${SITE}/blog`)).toBeNull();
    expect(canonicalSlug(`${SITE}/blog/tag/aeo`)).toBeNull();
    expect(canonicalSlug("not a url")).toBeNull();
    expect(canonicalSlug(null)).toBeNull();
  });

  it("points the canonical URL at the site", () => {
    expect(canonicalUrl("aeo-guide")).toBe(`${SITE}/blog/aeo-guide`);
    expect(canonicalSlug(canonicalUrl("aeo-guide"))).toBe("aeo-guide");
  });

  it("keeps four DEV tags, letters and digits only", () => {
    expect(
      devTags([
        "ai-agents",
        "AI",
        "open source",
        "",
        "aiagents",
        "llms",
        "tutorial",
      ]),
    ).toEqual(["aiagents", "ai", "opensource", "llms"]);
    expect(devTags("developer-experience, startups")).toEqual([
      "developerexperience",
      "startups",
    ]);
    expect(devTags(["---", 42, null])).toEqual([]);
    expect(devTags(undefined)).toEqual([]);
    expect(devTags(["a".repeat(40)])[0]).toHaveLength(30);
  });
});

describe("making links absolute", () => {
  it("rewrites root-relative Markdown links, images and reference definitions", () => {
    expect(
      absoluteLinks(
        "See [the guide](/blog/aeo-guide) and ![chart](/blog/uploads/x/chart.webp).",
      ),
    ).toBe(
      `See [the guide](${SITE}/blog/aeo-guide) and ![chart](${SITE}/blog/uploads/x/chart.webp).`,
    );
    expect(absoluteLinks('[guide](/blog/x "The guide")')).toBe(
      `[guide](${SITE}/blog/x "The guide")`,
    );
    expect(absoluteLinks("[guide][1]\n\n[1]: /blog/x")).toBe(
      `[guide][1]\n\n[1]: ${SITE}/blog/x`,
    );
  });

  it("rewrites src and href in HTML", () => {
    expect(
      absoluteLinks(`<img src="/a.png" alt=""> <a href='/pricing'>Pricing</a>`),
    ).toBe(
      `<img src="${SITE}/a.png" alt=""> <a href='${SITE}/pricing'>Pricing</a>`,
    );
  });

  it("leaves absolute links, anchors and protocol-relative links alone", () => {
    const text =
      "[a](https://example.com/x) [b](#faq) [c](//cdn.example.com/x.png) [d](mailto:hi@example.com)";
    expect(absoluteLinks(text)).toBe(text);
  });

  it("leaves code alone", () => {
    const fenced = [
      "```html",
      '<img src="/logo.png">',
      "[x](/y)",
      "```",
      "[after](/z)",
    ].join("\n");
    expect(absoluteLinks(fenced)).toBe(
      [
        "```html",
        '<img src="/logo.png">',
        "[x](/y)",
        "```",
        `[after](${SITE}/z)`,
      ].join("\n"),
    );
    const tilde = ["~~~", "[x](/y)", "~~~"].join("\n");
    expect(absoluteLinks(tilde)).toBe(tilde);
    const nested = ["1. Run it:", "    ```md", "    [x](/y)", "    ```"].join(
      "\n",
    );
    expect(absoluteLinks(nested)).toBe(nested);
    expect(absoluteLinks("Use `[x](/y)` for [links](/blog)")).toBe(
      `Use \`[x](/y)\` for [links](${SITE}/blog)`,
    );
    expect(absoluteLinks('Write ``a `src="/x"` b`` here')).toBe(
      'Write ``a `src="/x"` b`` here',
    );
  });
});

describe("turning a post into a DEV draft", () => {
  const source = [
    "---",
    'title: "Ship a launch that converts"',
    'description: "What a launch needs."',
    "date: 2026-11-12",
    "updatedDate: 2026-11-18",
    "bannerImage: /blog/uploads/launch/cover.png",
    "tags:",
    "  - ai-agents",
    "  - launch",
    "---",
    "",
    "# Ship a launch that converts",
    "",
    "Read [the guide](/blog/aeo-guide).",
    "",
  ].join("\n");

  it("drops the frontmatter and the repeated title, and keeps the draft unpublished", () => {
    const draft = devDraft(source, "ship-a-launch");
    expect(draft).toEqual({
      title: "Ship a launch that converts",
      body_markdown: `Read [the guide](${SITE}/blog/aeo-guide).\n`,
      published: false,
      canonical_url: `${SITE}/blog/ship-a-launch`,
      description: "What a launch needs.",
      tags: ["aiagents", "launch"],
      main_image: `${SITE}/blog/uploads/launch/cover.png`,
    });
  });

  it("posts under an organization only when one is given", () => {
    expect(
      devDraft(source, "x", { organizationId: 4321 }).organization_id,
    ).toBe(4321);
    expect(devDraft(source, "x", { organizationId: null })).not.toHaveProperty(
      "organization_id",
    );
  });

  it("uses the site's drawn cover when the post has no banner image", () => {
    const draft = devDraft(
      "---\ntitle: Plain\ndate: 2026-11-12\n---\nBody",
      "plain",
    );
    expect(draft.main_image).toMatch(
      new RegExp(`^${SITE}/blog-cover/plain\\?v=\\d+-2026-11-12$`),
    );
    expect(draft).not.toHaveProperty("description");
    expect(draft.tags).toEqual([]);
  });

  it("keeps a banner that is already a full URL", () => {
    const draft = devDraft(
      "---\ntitle: T\nbannerImage: https://cdn.example.com/c.png\n---\nBody",
      "t",
    );
    expect(draft.main_image).toBe("https://cdn.example.com/c.png");
  });

  it("keeps a first heading that isn't the title, and never starts with a frontmatter fence", () => {
    expect(
      devDraft("---\ntitle: T\n---\n# Another heading\n\nText", "t")
        .body_markdown,
    ).toBe("# Another heading\n\nText\n");
    expect(
      devDraft("---\ntitle: T\n---\n\n---\n\nText", "t").body_markdown,
    ).toBe("***\n\nText\n");
  });

  it("caps a long title at DEV's limit", () => {
    const title = Array.from({ length: 40 }, () => "word").join(" ");
    const draft = devDraft(`---\ntitle: ${title}\n---\nBody`, "t");
    expect(draft.title.length).toBeLessThanOrEqual(128);
    expect(draft.title.endsWith("…")).toBe(true);
  });
});

describe("reading the DEV account", () => {
  it("cleans DEV's articles and matches Studio1 copies", () => {
    const rows = readDevArticles([
      {
        id: 7,
        title: "  Launch   post ",
        url: "https://dev.to/studio1/launch-post-1a2b",
        published: true,
        published_at: "2026-11-12T10:00:00Z",
        public_reactions_count: 12,
        positive_reactions_count: 99,
        comments_count: 3,
        page_views_count: 450,
        canonical_url: `${SITE}/blog/launch-post`,
      },
      {
        id: 8,
        title: "Draft",
        url: "https://evil.example.com/x/y",
        published: false,
        published_at: null,
        positive_reactions_count: 2,
        canonical_url: "https://dev.to/studio1/draft-temp-slug-1",
      },
      { title: "no id" },
      "junk",
    ]);
    expect(rows).toEqual([
      {
        id: 7,
        title: "Launch post",
        url: "https://dev.to/studio1/launch-post-1a2b",
        published: true,
        publishedAt: "2026-11-12T10:00:00Z",
        reactions: 12,
        comments: 3,
        views: 450,
        slug: "launch-post",
      },
      {
        id: 8,
        title: "Draft",
        url: null,
        published: false,
        publishedAt: null,
        reactions: 2,
        comments: 0,
        views: 0,
        slug: null,
      },
    ]);
    expect(readDevArticles({ error: "unauthorized" })).toEqual([]);
  });

  it("reads and trusts only dev.to article paths", () => {
    expect(devPath("https://dev.to/studio1/launch-post-1a2b/")).toBe(
      "/studio1/launch-post-1a2b",
    );
    expect(devPath("http://dev.to/studio1/launch-post")).toBeNull();
    expect(devPath("https://dev.to.evil.com/a/b")).toBeNull();
    expect(devPath("https://dev.to/studio1")).toBeNull();
    expect(isDevPath("/studio1/launch-post-1a2b")).toBe(true);
    expect(isDevPath("//evil.com/x")).toBe(false);
    expect(isDevPath("/a/b/c")).toBe(false);
    expect(devEditUrl("/studio1/launch-post-1a2b")).toBe(
      "https://dev.to/studio1/launch-post-1a2b/edit",
    );
  });

  it("adds up the published articles only", () => {
    const totals = devTotals([
      article({ reactions: 10, comments: 2, views: 300, slug: "a" }),
      article({ id: 2, reactions: 5, comments: 1, views: 100 }),
      article({
        id: 3,
        published: false,
        publishedAt: null,
        reactions: 9,
        views: 9,
      }),
    ]);
    expect(totals).toEqual({
      reactions: 15,
      comments: 3,
      views: 400,
      published: 2,
      drafts: 1,
      studio1Views: 300,
    });
  });

  it("sorts newest first with drafts on top, or by a number", () => {
    const rows = [
      article({ id: 1, publishedAt: "2026-10-01T00:00:00Z", views: 900 }),
      article({ id: 2, publishedAt: "2026-11-01T00:00:00Z", views: 10 }),
      article({ id: 3, published: false, publishedAt: null }),
      article({ id: 4, published: false, publishedAt: null }),
    ];
    expect(sortDevArticles(rows).map((row) => row.id)).toEqual([4, 3, 2, 1]);
    expect(sortDevArticles(rows, "views").map((row) => row.id)).toEqual([
      1, 2, 4, 3,
    ]);
    expect(devSort("views")).toBe("views");
    expect(devSort("anything")).toBe("new");
    expect(devSort(undefined)).toBe("new");
  });

  it("lists the live posts no DEV article points back to", () => {
    const posts = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
    expect(
      notOnDev(posts, [article({ slug: "b" }), article({ id: 2, slug: null })]),
    ).toEqual([{ slug: "a" }, { slug: "c" }]);
  });
});
