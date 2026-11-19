import { afterEach, describe, expect, it, vi } from "vitest";

// The cache wrapper needs Next's server runtime; the parsing doesn't.
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

const { isAnalyticsConfigured, postReads, rangeReads, readReports, viewsBy } =
  await import("@/lib/internal/google-analytics");
const { serviceAccount } = await import("@/lib/internal/google");

const row = (dimension: string, ...metrics: number[]) => ({
  dimensionValues: [{ value: dimension }],
  metricValues: metrics.map((value) => ({ value: String(value) })),
});

describe("google analytics", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reads the four reports", () => {
    const report = readReports([
      { rows: [row("current", 120, 80, 4800), row("previous", 100, 70, 4000)] },
      { rows: [row("20261117", 70), row("20261116", 50)] },
      {
        rows: [
          row("/blog/a", 90, 60, 3600),
          row("/blog/a/", 10, 5, 100),
          row("/blog/b", 20, 15, 1100),
          row("/blog", 7, 7, 7),
        ],
      },
      { rows: [row("google", 80), row("(direct)", 40)] },
    ]);
    expect(report.totals).toEqual({ views: 120, readers: 80, engaged: 4800 });
    expect(report.previous).toEqual({ views: 100, readers: 70, engaged: 4000 });
    expect(report.daily).toEqual({ "2026-11-17": 70, "2026-11-16": 50 });
    expect(report.posts).toEqual({
      a: { views: 100, readers: 65, engaged: 3700 },
      b: { views: 20, readers: 15, engaged: 1100 },
    });
    expect(report.sources).toEqual([
      { source: "google", views: 80 },
      { source: "(direct)", views: 40 },
    ]);
  });

  it("reads empty reports as zeros", () => {
    const report = readReports([{}, {}, {}, {}]);
    expect(report.totals).toEqual({ views: 0, readers: 0, engaged: 0 });
    expect(report.previous).toEqual({ views: 0, readers: 0, engaged: 0 });
    expect(report.daily).toEqual({});
    expect(report.posts).toEqual({});
    expect(report.sources).toEqual([]);
  });

  it("needs the service account and a numeric property", () => {
    vi.stubEnv("GSC_CLIENT_EMAIL", "reader@project.iam.gserviceaccount.com");
    vi.stubEnv(
      "GSC_PRIVATE_KEY",
      "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
    );
    vi.stubEnv("GA_PROPERTY_ID", "");
    expect(isAnalyticsConfigured()).toBe(false);
    vi.stubEnv("GA_PROPERTY_ID", "properties/512345678");
    expect(isAnalyticsConfigured()).toBe(true);
    vi.stubEnv("GA_PROPERTY_ID", "G-2VTPYVBGWQ");
    expect(isAnalyticsConfigured()).toBe(false);
  });

  it("takes the private key with escaped newlines or outer quotes", () => {
    vi.stubEnv("GSC_CLIENT_EMAIL", " reader@project.iam.gserviceaccount.com ");
    vi.stubEnv(
      "GSC_PRIVATE_KEY",
      '"-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n"',
    );
    expect(serviceAccount()).toEqual({
      email: "reader@project.iam.gserviceaccount.com",
      key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
    });
    vi.stubEnv("GSC_PRIVATE_KEY", "not a key");
    expect(serviceAccount()).toBeNull();
  });

  it("reads named ranges and keeps one range of a per-post report", () => {
    const ranged = (path: string, range: string, ...metrics: number[]) => ({
      dimensionValues: [{ value: path }, { value: range }],
      metricValues: metrics.map((value) => ({ value: String(value) })),
    });
    const report = {
      rows: [
        ranged("/blog/a", "recent", 30, 20, 600),
        ranged("/blog/a", "before", 10, 8, 200),
        ranged("/blog/b/", "recent", 5, 5, 50),
        ranged("/pricing", "recent", 99, 99, 99),
      ],
    };
    expect(postReads(report, "recent")).toEqual({
      a: { views: 30, readers: 20, engaged: 600 },
      b: { views: 5, readers: 5, engaged: 50 },
    });
    expect(postReads(report, "before")).toEqual({ a: { views: 10, readers: 8, engaged: 200 } });
    expect(rangeReads({ rows: [row("lifetime", 7, 3, 90)] }, "lifetime")).toEqual({ views: 7, readers: 3, engaged: 90 });
    expect(rangeReads({ rows: [] }, "month")).toEqual({ views: 0, readers: 0, engaged: 0 });
    expect(viewsBy({ rows: [row("India", 12)] })).toEqual([{ source: "India", views: 12 }]);
  });
});
