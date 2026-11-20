import { describe, expect, it } from "vitest";
import {
  devRelJobLogo,
  logoSite,
  sortDevRelJobs,
  toJobRecord,
  toPublicJob,
} from "@/lib/devrel-jobs";

describe("where a listing's logo comes from", () => {
  it("prefers the company's website", () => {
    expect(
      logoSite({
        website: "https://clickhouse.com",
        url: "https://jobs.ashbyhq.com/clickhouse/1",
      }),
    ).toBe("https://clickhouse.com");
  });

  it("uses the apply link when it's on the company's own site", () => {
    expect(
      logoSite({ website: null, url: "https://careers.acme.com/devrel" }),
    ).toBe("https://careers.acme.com/devrel");
  });

  it("never takes a hiring site's icon for the company's", () => {
    for (const url of [
      "https://jobs.ashbyhq.com/acme/1",
      "https://boards.greenhouse.io/acme/jobs/1",
      "https://jobs.lever.co/acme/1",
      "https://www.linkedin.com/jobs/view/1",
      "https://www.ycombinator.com/companies/acme/jobs/1",
    ]) {
      expect(logoSite({ website: "", url })).toBeNull();
    }
  });

  it("links our route with the host as the version", () => {
    expect(devRelJobLogo("abc", "https://www.acme.com/x")).toBe(
      "/api/devrel-jobs/logo/abc?v=acme.com",
    );
    expect(devRelJobLogo("abc", null)).toBeUndefined();
  });
});

describe("listing rows", () => {
  const row = {
    id: "6f1c2c1e-6b7a-4d0e-9a51-0d1b0f3a1d22",
    title: "Developer Advocate",
    company: "Acme",
    website: "https://acme.com",
    url: "https://jobs.ashbyhq.com/acme/1",
    location: "Remote",
    workplace: "Remote",
    category: "Developer Relations",
    job_type: "Full-time",
    level: "Senior",
    salary: null,
    posted_on: "2026-11-20",
    tags: ["AI"],
    featured: false,
    live: true,
    updated_at: "2026-11-21T10:00:00Z",
    updated_by: "editor@studio1hq.com",
  };

  it("reads a stored row and gives the board only what it shows", () => {
    const record = toJobRecord(row);
    expect(record).toMatchObject({
      type: "Full-time",
      postedDate: "2026-11-20",
      live: true,
      website: "https://acme.com",
    });
    const job = toPublicJob(record!);
    expect(job.logo).toBe(`/api/devrel-jobs/logo/${row.id}?v=acme.com`);
    expect(job).not.toHaveProperty("website");
    expect(job).not.toHaveProperty("updatedBy");
  });

  it("skips malformed rows and odd values", () => {
    expect(toJobRecord({ ...row, url: "javascript:alert(1)" })).toBeNull();
    expect(toJobRecord({ ...row, title: "" })).toBeNull();
    expect(toJobRecord({ ...row, workplace: "Moon" })?.workplace).toBe(
      "Unspecified",
    );
  });

  it("puts pinned listings first, then the newest", () => {
    const sorted = sortDevRelJobs([
      { id: "a", featured: false, postedDate: "2026-11-01" },
      { id: "b", featured: false, postedDate: "2026-11-10" },
      { id: "c", featured: true, postedDate: "2026-10-01" },
    ]);
    expect(sorted.map((job) => job.id)).toEqual(["c", "b", "a"]);
  });
});
