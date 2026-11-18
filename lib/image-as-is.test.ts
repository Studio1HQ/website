import { describe, expect, it } from "vitest";
import { servedAsIs } from "./image-as-is";

describe("servedAsIs", () => {
  it("matches the listed images by public path or static import", () => {
    expect(servedAsIs("/assets/logos/copilotkit-mark.webp")).toBe(true);
    expect(
      servedAsIs({
        src: "/_next/static/media/copilotkit-mark.35zozz-gzgq1o.webp",
        width: 400,
        height: 400,
      }),
    ).toBe(true);
    expect(servedAsIs("/assets/people/Nathan.webp")).toBe(true);
    expect(
      servedAsIs("/case-studies/entelligence-ai/entelligence-homepage.webp"),
    ).toBe(true);
  });

  it("leaves every other image to the optimizer", () => {
    expect(servedAsIs("/assets/logos/Copilotkit-full.webp")).toBe(false);
    expect(servedAsIs("/assets/logos/litellm.webp")).toBe(false);
    expect(servedAsIs("/assets/people/Nathaniel.webp")).toBe(false);
    expect(servedAsIs(undefined)).toBe(false);
  });
});
