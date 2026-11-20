import { describe, expect, it } from "vitest";
import {
  cleanJob,
  cleanLink,
  cleanTags,
  isDay,
} from "@/lib/internal/job-board/clean";

const TODAY = "2026-11-21";

const base = {
  title: "  Senior   Developer Advocate ",
  company: "Acme",
  url: "https://jobs.ashbyhq.com/acme/123",
  location: "Remote, Global",
};

describe("checking a DevRel jobs listing", () => {
  it("keeps a minimal listing and fills the rest with defaults", () => {
    const result = cleanJob(base, TODAY);
    expect(result).toEqual({
      ok: true,
      job: {
        title: "Senior Developer Advocate",
        company: "Acme",
        website: null,
        url: "https://jobs.ashbyhq.com/acme/123",
        location: "Remote, Global",
        workplace: "Unspecified",
        category: "Developer Relations",
        job_type: "Full-time",
        level: "Unspecified",
        salary: null,
        posted_on: TODAY,
        tags: [],
        featured: false,
        live: true,
      },
    });
  });

  it("keeps what was filled in", () => {
    const result = cleanJob(
      {
        ...base,
        website: "acme.com/careers",
        workplace: "Hybrid",
        category: "Developer Experience",
        job_type: "Contract",
        level: "Staff",
        salary: "$150K - $190K",
        posted_on: "2026-11-02",
        tags: "AI, Databases, ai",
        featured: true,
        live: false,
      },
      TODAY,
    );
    expect(result.ok && result.job).toMatchObject({
      website: "https://acme.com",
      workplace: "Hybrid",
      category: "Developer Experience",
      job_type: "Contract",
      level: "Staff",
      salary: "$150K - $190K",
      posted_on: "2026-11-02",
      tags: ["AI", "Databases"],
      featured: true,
      live: false,
    });
  });

  it("asks for the title, company, apply link and location", () => {
    expect(cleanJob({ ...base, title: " " }, TODAY)).toMatchObject({
      ok: false,
      message: expect.stringMatching(/title/),
    });
    expect(cleanJob({ ...base, company: "" }, TODAY)).toMatchObject({
      ok: false,
      message: expect.stringMatching(/company/),
    });
    expect(cleanJob({ ...base, url: "" }, TODAY)).toMatchObject({
      ok: false,
      message: expect.stringMatching(/apply link/),
    });
    expect(cleanJob({ ...base, location: "" }, TODAY)).toMatchObject({
      ok: false,
      message: expect.stringMatching(/where/),
    });
    expect(cleanJob(null, TODAY).ok).toBe(false);
  });

  it("refuses links that aren't public web addresses", () => {
    for (const url of [
      "javascript:alert(1)",
      "ftp://acme.com/x",
      "http://localhost:3000/jobs",
      "https://10.0.0.1/x",
      "not a link",
    ]) {
      expect(cleanJob({ ...base, url }, TODAY).ok).toBe(false);
    }
    expect(
      cleanJob({ ...base, website: "https://user:pass@acme.com" }, TODAY),
    ).toMatchObject({
      ok: false,
      message: expect.stringMatching(/website/),
    });
  });

  it("takes posted dates up to today, wherever the editor is", () => {
    expect(cleanJob({ ...base, posted_on: "2026-11-22" }, TODAY).ok).toBe(true);
    expect(cleanJob({ ...base, posted_on: "2026-11-23" }, TODAY).ok).toBe(
      false,
    );
    expect(cleanJob({ ...base, posted_on: "2026-02-30" }, TODAY).ok).toBe(
      false,
    );
    expect(cleanJob({ ...base, posted_on: "1999-12-31" }, TODAY).ok).toBe(
      false,
    );
  });

  it("won't store something that looks like a key", () => {
    expect(
      cleanJob({ ...base, salary: "api_key=abcdef123456" }, TODAY),
    ).toMatchObject({
      ok: false,
      message: expect.stringMatching(/password or a key/),
    });
  });
});

describe("the pieces", () => {
  it("reads bare domains as https", () => {
    expect(cleanLink("acme.com")?.href).toBe("https://acme.com/");
    expect(cleanLink("http://acme.com/a")?.href).toBe("http://acme.com/a");
    expect(cleanLink("")).toBeNull();
  });

  it("splits, trims and caps tags", () => {
    expect(cleanTags(" AI ,, Postgres\nai ")).toEqual(["AI", "Postgres"]);
    expect(
      cleanTags(Array.from({ length: 20 }, (_, i) => `t${i}`)),
    ).toHaveLength(12);
    expect(cleanTags(7)).toEqual([]);
  });

  it("knows a real day", () => {
    expect(isDay("2026-11-21")).toBe(true);
    expect(isDay("2026-13-01")).toBe(false);
    expect(isDay("21/11/2026")).toBe(false);
  });
});

describe("what a save changed", () => {
  it("lists only the fields that differ", async () => {
    const { jobChanges } = await import("@/lib/internal/job-board/clean");
    const saved = cleanJob(base, TODAY);
    if (!saved.ok) throw new Error("expected a listing");
    expect(jobChanges({ ...saved.job }, saved.job)).toEqual({});
    expect(
      jobChanges({ ...saved.job, title: "Old", tags: ["x"] }, saved.job),
    ).toEqual({
      title: ["Old", "Senior Developer Advocate"],
      tags: [["x"], []],
    });
  });
});
