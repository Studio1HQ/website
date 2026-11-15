import { describe, expect, it } from "vitest";
import { publishedBy, statusLabel } from "@/lib/internal/clients/schema";

describe("stage names", () => {
  it("reads a blog's stages as writing", () => {
    expect(statusLabel("planned", "blog")).toBe("Not started");
    expect(statusLabel("in_progress", "blog")).toBe("Writing");
    expect(statusLabel("client_review", "blog")).toBe("Sent for approval");
    expect(statusLabel("published", "blog")).toBe("Published");
  });

  it("keeps the plain names for other kinds and when the kind is unknown", () => {
    expect(statusLabel("in_progress", "video")).toBe("In progress");
    expect(statusLabel("client_review")).toBe("Client review");
  });
});

describe("who published it", () => {
  it("counts Medium and dev.to as ours", () => {
    expect(publishedBy("https://medium.com/@studio1/how-to-x-123")).toEqual({
      by: "studio1",
      where: "Medium",
    });
    expect(publishedBy("https://someone.medium.com/post")).toEqual({
      by: "studio1",
      where: "Medium",
    });
    expect(publishedBy("https://dev.to/studio1/post")).toEqual({
      by: "studio1",
      where: "dev.to",
    });
  });

  it("counts any other site as the client's", () => {
    expect(publishedBy("https://www.brightdata.com/blog/x")).toEqual({
      by: "client",
      where: "brightdata.com",
    });
  });

  it("doesn't take a look-alike host for ours", () => {
    expect(publishedBy("https://notmedium.com/x")?.by).toBe("client");
    expect(publishedBy("https://dev.to.example.com/x")?.by).toBe("client");
  });

  it("has nothing to say without a valid link", () => {
    expect(publishedBy(null)).toBeNull();
    expect(publishedBy("not a url")).toBeNull();
  });
});
