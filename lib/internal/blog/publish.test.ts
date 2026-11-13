import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlogPostRow } from "@/lib/internal/blog/shared";

const words = Array.from({ length: 320 }, (_, index) => `word${index}`).join(" ");

function row(overrides: Partial<BlogPostRow> = {}): BlogPostRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    created_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-10T10:00:00.000Z",
    created_by: "writer@example.com",
    updated_by: "writer@example.com",
    status: "approved",
    reviewers: [],
    title: "How to launch a developer tool",
    seo_title: "",
    slug: "launch-a-developer-tool",
    description: "A practical guide to launching a developer tool: the audience, the channels, and the posts that bring the first thousand users in.",
    tldr_summary: "",
    tldr_bullets: [],
    tags: ["launch", "devrel", "marketing"],
    authors: ["Arindam Majumder"],
    publish_date: "2026-11-10",
    unlisted: false,
    cover_art: null,
    banner_image: null,
    banner_image_alt: null,
    body: `## Why it matters\n\n${words}\n\nSee [our launch service](/product-launch-service).`,
    extra_frontmatter: {},
    source_path: null,
    source_sha: null,
    published_at: null,
    published_by: null,
    published_commit: null,
    ...overrides,
  };
}

const data = vi.hoisted(() => ({
  getPost: vi.fn(),
  markPublished: vi.fn(),
  addEvent: vi.fn(),
  takenSlugs: vi.fn(),
  sitePosts: vi.fn(),
}));
const github = vi.hoisted(() => ({ commitFiles: vi.fn(), repoFileSha: vi.fn() }));
const media = vi.hoisted(() => ({ readImage: vi.fn(), removePostImages: vi.fn() }));

vi.mock("@/lib/internal/blog/data", () => data);
vi.mock("@/lib/internal/blog/github", async (original) => ({
  ...(await original<typeof import("@/lib/internal/blog/github")>()),
  isGithubConfigured: () => true,
  repoFileUrl: (path: string) => `https://github.com/x/y/blob/main/${path}`,
  ...github,
}));
vi.mock("@/lib/internal/blog/media", async (original) => ({
  ...(await original<typeof import("@/lib/internal/blog/media")>()),
  ...media,
}));

import { blobSha } from "@/lib/internal/blog/github";
import { publishBlocker, publishPost } from "@/lib/internal/blog/publish";
import { toMdx } from "@/lib/internal/blog/shared";

const reviewer = { email: "reviewer@studio1hq.com", blog: "reviewer" as const };
const base = "2026-11-10T10:00:00.000Z";

beforeEach(() => {
  vi.clearAllMocks();
  data.getPost.mockResolvedValue(row());
  data.takenSlugs.mockResolvedValue([]);
  data.sitePosts.mockReturnValue([]);
  data.markPublished.mockResolvedValue("ok");
  data.addEvent.mockResolvedValue("event");
  github.repoFileSha.mockResolvedValue(null);
  github.commitFiles.mockResolvedValue({ ok: true, commit: "abc", url: "https://github.com/x/y/commit/abc", shas: {} });
});

describe("publishBlocker", () => {
  it("needs an approval, except for the publisher's own post", () => {
    expect(publishBlocker({ status: "approved", created_by: "a@x.com" }, "r@x.com")).toBeNull();
    expect(publishBlocker({ status: "in_review", created_by: "a@x.com" }, "r@x.com")).toMatch(/Approve/);
    expect(publishBlocker({ status: "draft", created_by: "a@x.com" }, "r@x.com")).toMatch(/Approve/);
    expect(publishBlocker({ status: "draft", created_by: "r@x.com" }, "r@x.com")).toBeNull();
    expect(publishBlocker({ status: "published", created_by: "r@x.com" }, "r@x.com")).toMatch(/already live/);
  });
});

describe("publishPost", () => {
  it("commits an approved post and clears its draft images", async () => {
    const result = await publishPost(reviewer, row().id, { base });
    expect(result.ok).toBe(true);
    expect(github.commitFiles).toHaveBeenCalledTimes(1);
    expect(data.markPublished).toHaveBeenCalledWith(row().id, expect.objectContaining({ source_path: "content/blog/launch-a-developer-tool.mdx" }), base);
    expect(media.removePostImages).toHaveBeenCalled();
  });

  it("only lets reviewers publish", async () => {
    const result = await publishPost({ email: "writer@example.com", blog: "writer" }, row().id, { base });
    expect(result.ok).toBe(false);
    expect(github.commitFiles).not.toHaveBeenCalled();
  });

  it("refuses when the post changed since the reviewer opened it", async () => {
    const result = await publishPost(reviewer, row().id, { base: "2026-11-10T09:00:00.000Z" });
    expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/changed since/) });
    expect(github.commitFiles).not.toHaveBeenCalled();
  });

  it("refuses a post nobody approved", async () => {
    data.getPost.mockResolvedValue(row({ status: "in_review" }));
    expect(await publishPost(reviewer, row().id, { base })).toMatchObject({ ok: false, message: expect.stringMatching(/Approve/) });
    expect(github.commitFiles).not.toHaveBeenCalled();
  });

  it.each([
    ["an escaped backtick", 'hi \\`<script src="https://evil.example/x.js"></script>\\` there'],
    ["a tag split over lines", '<iframe\n  srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"\n></iframe\n>'],
    ["a component", "<Foo />"],
    ["an expression", "total: {1 + 1}"],
  ])("refuses HTML or code hidden behind %s", async (_, extra) => {
    data.getPost.mockResolvedValue(row({ body: `${row().body}\n\n${extra}` }));
    const result = await publishPost(reviewer, row().id, { base });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.checks?.map((check) => check.id)).toContain("html");
    expect(github.commitFiles).not.toHaveBeenCalled();
  });

  it("fails loudly when an image is missing", async () => {
    const id = row().id;
    data.getPost.mockResolvedValue(row({ body: `${row().body}\n\n![a chart](/internal/blog-media/${id}/chart-abc123.webp)` }));
    media.readImage.mockResolvedValue({ ok: false, notFound: true, message: "404" });
    expect(await publishPost(reviewer, id, { base })).toMatchObject({ ok: false, message: expect.stringMatching(/chart-abc123\.webp/) });
    expect(github.commitFiles).not.toHaveBeenCalled();
  });

  it("keeps the draft images when the dashboard can't record the publish", async () => {
    data.markPublished.mockResolvedValue("failed");
    const result = await publishPost(reviewer, row().id, { base });
    expect(result.ok).toBe(false);
    expect(media.removePostImages).not.toHaveBeenCalled();
    expect(data.addEvent).not.toHaveBeenCalled();
  });

  it("keeps the draft images when someone saved an edit meanwhile", async () => {
    data.markPublished.mockResolvedValue("edited");
    const result = await publishPost(reviewer, row().id, { base });
    expect(result).toMatchObject({ ok: true, warning: expect.stringMatching(/isn't live yet/) });
    expect(media.removePostImages).not.toHaveBeenCalled();
  });

  it("counts a file that's already on GitHub with this content as published", async () => {
    const post = row();
    github.repoFileSha.mockResolvedValue(blobSha(toMdx(post, { date: "2026-11-10", updatedDate: "2026-11-10", extra: {} })));
    const result = await publishPost(reviewer, post.id, { base });
    expect(result.ok).toBe(true);
    expect(github.commitFiles).not.toHaveBeenCalled();
    expect(data.markPublished).toHaveBeenCalled();
  });

  it("still refuses a new post whose file exists with other content", async () => {
    github.repoFileSha.mockResolvedValue("0000000000000000000000000000000000000000");
    expect(await publishPost(reviewer, row().id, { base })).toMatchObject({ ok: false, message: expect.stringMatching(/already exists/) });
  });
});

describe("blobSha", () => {
  it("matches git's own hash", () => {
    // `printf 'hello\n' | git hash-object --stdin`
    expect(blobSha("hello\n")).toBe("ce013625030ba8dba906f756967f9e9ca394464a");
  });
});
