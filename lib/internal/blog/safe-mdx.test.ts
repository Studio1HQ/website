import { describe, expect, it } from "vitest";
import { serialize } from "next-mdx-remote/serialize";
import { transformBlogMdxContent } from "@/components/blog/mdx";
import { bodyProblem, findUnsafeMdx, remarkSafeMdx } from "@/lib/internal/blog/safe-mdx";
import { postChecks, roughHtml } from "@/lib/internal/blog/shared";

const labels = async (body: string) => (await findUnsafeMdx(body)).found.map((issue) => issue.label);

describe("findUnsafeMdx", () => {
  it("passes plain Markdown, code and the harmless tags", async () => {
    const body = "## Title\n\nUse `<div>` here, H<sub>2</sub>O and a<br />break.\n\n```html\n<script>alert(1)</script>\n```\n";
    expect(await findUnsafeMdx(body)).toEqual({ parsed: true, found: [] });
  });

  it("finds tags, components, expressions and imports", async () => {
    expect(await labels('hi <script src="https://evil.example/x.js"></script>')).toEqual(["<script>"]);
    expect(await labels("<Foo />")).toEqual(["<Foo>"]);
    expect(await labels("total: {1 + 1}")).toEqual(["{ } code"]);
    expect(await labels('import x from "y"\n\ntext')).toEqual(["import/export"]);
  });

  it("finds a tag behind an escaped backtick", async () => {
    expect(await labels('hi \\`<script src="https://evil.example/x.js"></script>\\` there')).toEqual(["<script>"]);
  });

  it("finds a tag split over several lines", async () => {
    expect(await labels('<iframe\n  srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"\n></iframe\n>')).toEqual(["<iframe>"]);
  });

  it("refuses attributes on the harmless tags", async () => {
    expect(await labels('<kbd style="position:fixed">x</kbd>')).toEqual(["<kbd>"]);
  });

  it("refuses the blog's own components when a writer types them", async () => {
    expect(await labels('<YouTubeEmbed url="https://evil.example/" />')).toEqual(["<YouTubeEmbed>"]);
  });

  it("falls back to a quick look when the text can't be parsed", async () => {
    const result = await findUnsafeMdx("a stray { and <script src=x></script>");
    expect(result.parsed).toBe(false);
    expect(result.found.map((issue) => issue.label)).toContain("<script>");
  });
});

describe("bodyProblem", () => {
  it("lets Markdown and unfinished text save, but not tags", async () => {
    expect(await bodyProblem("## Fine\n\nNo tags here.")).toBeNull();
    expect(await bodyProblem("a stray { while typing")).toBeNull();
    expect(await bodyProblem("{later}")).toBeNull();
    expect(await bodyProblem('<details open ontoggle="alert(1)">x</details>')).toMatch(/<details>/);
    expect(await bodyProblem('\\`<img src=x onerror="alert(1)" />\\`')).toMatch(/<img>/);
  });
});

describe("the editor's quick look", () => {
  it("catches both ways around the old check", () => {
    expect(roughHtml('hi \\`<script src="x"></script>\\` there')).toContain("<script>");
    expect(roughHtml('<iframe\n  srcdoc="x"\n></iframe\n>')).toContain("<iframe>");
  });

  it("leaves code, harmless tags and wrapped addresses alone", () => {
    expect(roughHtml("Use `<div>` and H<sub>2</sub>O.\n\n```html\n<div></div>\n```")).toEqual([]);
    expect(roughHtml("![a chart](</blog/uploads/x/a b.webp>)")).toEqual([]);
  });

  it("postChecks takes the server's findings over its own", () => {
    const fields = {
      title: "T", seo_title: "", slug: "t", description: "", tldr_summary: "", tldr_bullets: [], tags: [], authors: [],
      publish_date: null, unlisted: false, cover_art: null, banner_image: null, banner_image_alt: null, body: "plain text",
    };
    expect(postChecks(fields, [], ["{ } code"]).some((check) => check.id === "html")).toBe(true);
    expect(postChecks(fields, [], []).some((check) => check.id === "html")).toBe(false);
  });
});

describe("remarkSafeMdx", () => {
  const render = async (body: string, generated: boolean) =>
    (await serialize(body, { mdxOptions: { remarkPlugins: [[remarkSafeMdx, { generated }]] } })).compiledSource;

  it("drops tags, components and code", async () => {
    const out = await render('before\n\n<script src="x"></script>\n\n<Foo />\n\n{1 + 1}\n\nafter', false);
    expect(out).not.toMatch(/script|Foo|1 \+ 1/);
    expect(out).toContain("after");
  });

  it("keeps the generated FAQ and YouTube embed, with their text attributes only", async () => {
    const source = transformBlogMdxContent(
      "## FAQ\n\n### Is it free?\n\nYes.\n\n## Watch\n\nhttps://www.youtube.com/watch?v=abcdefghijk\n",
    );
    const out = await render(source, true);
    expect(out).toContain("BlogFaqItem");
    expect(out).toContain('question: "Is it free?"');
    expect(out).toContain('url: "https://www.youtube.com/embed/abcdefghijk"');
  });

  it("drops a generated component's attributes it doesn't expect", async () => {
    const out = await render('<YouTubeEmbed url="https://evil.example/" onLoad="x" />', true);
    expect(out).toContain("YouTubeEmbed");
    expect(out).not.toMatch(/evil|onLoad/);
  });

  it("drops the generated components unless asked to keep them", async () => {
    expect(await render('<YouTubeEmbed url="https://www.youtube.com/embed/abcdefghijk" />', false)).not.toContain("YouTubeEmbed");
  });
});
