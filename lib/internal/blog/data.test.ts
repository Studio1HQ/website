import { describe, expect, it } from "vitest";
import { cleanFields, landed } from "@/lib/internal/blog/data";

const id = "11111111-1111-4111-8111-111111111111";

describe("cleanFields", () => {
  it("drops fields the editor doesn't own", () => {
    expect(cleanFields(id, { status: "published", created_by: "x@y.z", source_path: ".github/workflows/x.yml", title: "Hi" })).toEqual({ title: "Hi" });
  });

  it("keeps one-line fields on one line", () => {
    const fields = cleanFields(id, { title: "A\ntitle", seo_title: "S\r\nE O", description: "one\n\ntwo", authors: ["Jane\nDoe"], banner_image_alt: "a\nb" });
    expect(fields).toEqual({ title: "A title", seo_title: "S E O", description: "one two", authors: ["Jane Doe"], banner_image_alt: "a b" });
  });

  it("only takes slugs made of lowercase letters, numbers and hyphens", () => {
    expect(cleanFields(id, { slug: "../../App/Page" }).slug).toBe("apppage");
  });

  it("only takes this post's uploads or site files as the cover", () => {
    expect(cleanFields(id, { banner_image: `/internal/blog-media/${id}/a-123abc.webp` }).banner_image).toBe(`/internal/blog-media/${id}/a-123abc.webp`);
    expect(cleanFields(id, { banner_image: "/internal/blog-media/22222222-2222-4222-8222-222222222222/a.webp" }).banner_image).toBeNull();
    expect(cleanFields(id, { banner_image: "https://evil.example/x.png" }).banner_image).toBeNull();
  });
});

describe("a save whose answer was lost", () => {
  const id = "11111111-2222-4333-8444-555555555555";
  const me = "writer@studio1hq.com";
  const post = {
    id,
    title: "Launch notes",
    body: "First line.",
    tags: ["launch"],
    updated_by: me,
  } as unknown as Parameters<typeof landed>[0];

  it("is recognised when the stored post is theirs and holds what they sent", () => {
    expect(landed(post, me, [{ title: "Launch notes", body: "First line." }])).toBe(true);
    expect(landed(post, me, [{ tags: ["launch"] }])).toBe(true);
    // The earlier of two unanswered saves is checked too.
    expect(landed(post, me, [{ title: "Launch notes" }, { title: "Something newer" }])).toBe(true);
  });

  it("is not claimed when someone else saved last, or the text differs", () => {
    expect(landed(post, "reviewer@studio1hq.com", [{ title: "Launch notes" }])).toBe(false);
    expect(landed(post, me, [{ title: "Launch notes", body: "Another line." }])).toBe(false);
  });

  it("needs something that was actually sent", () => {
    expect(landed(post, me, undefined)).toBe(false);
    expect(landed(post, me, [])).toBe(false);
    expect(landed(post, me, [{}])).toBe(false);
    expect(landed(post, me, [{ not_a_field: "x" }])).toBe(false);
  });
});
