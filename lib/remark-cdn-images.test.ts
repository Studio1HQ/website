import { serialize } from "next-mdx-remote/serialize";
import { afterEach, describe, expect, it, vi } from "vitest";
import { remarkCdnImages } from "./remark-cdn-images";

afterEach(() => {
  vi.unstubAllEnvs();
});

const compile = async (source: string) =>
  (
    await serialize(source, {
      mdxOptions: { remarkPlugins: [remarkCdnImages] },
    })
  ).compiledSource;

describe("remarkCdnImages", () => {
  it("points JSX <img> tags at the CDN's largest size", async () => {
    vi.stubEnv("IMAGE_ORIGIN", "https://cdn.studio1hq.com");
    const out = await compile(
      '<Frame>\n  <img src="/case-studies/litellm/litellm-after.webp" alt="After" />\n</Frame>\n\nText with <img src="/assets/site/studio1-logo.svg" alt="" /> inline.',
    );
    expect(out).toContain(
      "https://cdn.studio1hq.com/_img/1920/case-studies/litellm/litellm-after.webp",
    );
    expect(out).toContain(
      "https://cdn.studio1hq.com/_img/as-is/assets/site/studio1-logo.svg",
    );
    expect(out).not.toContain('"/case-studies/litellm/litellm-after.webp"');
  });

  it("leaves other sites' images and relative paths alone", async () => {
    vi.stubEnv("IMAGE_ORIGIN", "https://cdn.studio1hq.com");
    const out = await compile(
      '<img src="https://example.com/a.png" alt="" />\n\n<img src="docs/assets/demo.png" alt="" />',
    );
    expect(out).toContain("https://example.com/a.png");
    expect(out).toContain("docs/assets/demo.png");
  });
});
