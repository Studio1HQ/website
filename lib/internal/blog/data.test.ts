import { describe, expect, it } from "vitest";
import { cleanFields } from "@/lib/internal/blog/data";

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
