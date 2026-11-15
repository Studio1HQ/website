import { describe, expect, it } from "vitest";
import {
  cleanDeliverable,
  cleanMilestone,
  cleanPartner,
  liveAt,
  parseCount,
} from "@/lib/internal/clients/clean";
import {
  liveLinks,
  platformOf,
  shortCount,
} from "@/lib/internal/clients/schema";

const ENGAGEMENT = "8923e63f-69ad-49c9-a984-1130a79ed5e3";

describe("counts", () => {
  it("reads views the way people type them", () => {
    expect(parseCount("7000")).toBe(7000);
    expect(parseCount("7,000")).toBe(7000);
    expect(parseCount("7k")).toBe(7000);
    expect(parseCount("1.2K")).toBe(1200);
    expect(parseCount("2m")).toBe(2_000_000);
    expect(parseCount("12.5")).toBeNull();
    expect(parseCount("lots")).toBeNull();
  });

  it("writes them short", () => {
    expect(shortCount(950)).toBe("950");
    expect(shortCount(1250)).toBe("1.3K");
    expect(shortCount(81970)).toBe("82K");
    expect(shortCount(2_400_000)).toBe("2.4M");
  });
});

describe("platforms", () => {
  it("names the sites posts go up on", () => {
    expect(platformOf("https://x.com/Arindam_1729/status/1")).toBe("X");
    expect(platformOf("https://www.linkedin.com/feed/update/x")).toBe(
      "LinkedIn",
    );
    expect(platformOf("https://lnkd.in/p/abc")).toBe("LinkedIn");
    expect(platformOf("https://www.reddit.com/r/AI_Agents/s/x")).toBe("Reddit");
    expect(platformOf("https://dly.to/xMFp2LNeyO9")).toBe("daily.dev");
    expect(platformOf("https://example.org/post")).toBe("example.org");
    expect(platformOf("nope")).toBeNull();
  });

  it("lists a post's links, main one first", () => {
    expect(
      liveLinks({
        published_url: "https://x.com/a",
        extra_urls: ["https://lnkd.in/b"],
      }),
    ).toEqual(["https://x.com/a", "https://lnkd.in/b"]);
    expect(liveLinks({ published_url: null })).toEqual([]);
  });
});

describe("deliverable DevRel fields", () => {
  it("takes a type, views and more links", () => {
    const result = cleanDeliverable(
      {
        content_type: "guide",
        views: "21k",
        extra_urls: "https://lnkd.in/a\nhttps://lnkd.in/a https://x.com/b",
      },
      "update",
    );
    expect(result).toEqual({
      ok: true,
      row: {
        content_type: "guide",
        views: 21000,
        extra_urls: ["https://lnkd.in/a", "https://x.com/b"],
      },
    });
  });

  it("refuses a link with a key in it, and an unknown type", () => {
    expect(
      cleanDeliverable({ extra_urls: ["https://x.com/a?token=abc"] }, "update")
        .ok,
    ).toBe(false);
    expect(cleanDeliverable({ content_type: "poem" }, "update").ok).toBe(false);
  });
});

describe("milestones", () => {
  it("needs a date and what happened", () => {
    expect(
      cleanMilestone(
        { engagement_id: ENGAGEMENT, title: "1,000 stars" },
        "create",
      ).ok,
    ).toBe(false);
    const result = cleanMilestone(
      {
        engagement_id: ENGAGEMENT,
        happened_on: "2026-10-09",
        title: "1,000 GitHub stars",
        metric: "GitHub stars",
        value: "1,000",
      },
      "create",
    );
    expect(result.ok && result.row.value).toBe(1000);
  });

  it("asks what a number counts", () => {
    expect(
      cleanMilestone(
        {
          engagement_id: ENGAGEMENT,
          happened_on: "2026-10-09",
          title: "Big week",
          value: "500",
        },
        "create",
      ).ok,
    ).toBe(false);
  });
});

describe("partners", () => {
  it("needs a company and keeps text fields as text", () => {
    expect(
      cleanPartner({ engagement_id: ENGAGEMENT, name: " " }, "create").ok,
    ).toBe(false);
    const result = cleanPartner(
      {
        engagement_id: ENGAGEMENT,
        name: "Shorebird",
        website: "shorebird.dev",
        type: "co_gtm",
        status: "in_progress",
        pitch: "Integration tutorial",
        latest: "",
      },
      "create",
    );
    expect(result).toMatchObject({
      ok: true,
      row: {
        name: "Shorebird",
        website: "https://shorebird.dev/",
        type: "co_gtm",
        status: "in_progress",
        latest: "",
      },
    });
  });

  it("refuses an unknown status and a pasted key", () => {
    expect(
      cleanPartner(
        { engagement_id: ENGAGEMENT, name: "A", status: "maybe" },
        "create",
      ).ok,
    ).toBe(false);
    expect(
      cleanPartner(
        {
          engagement_id: ENGAGEMENT,
          name: "A",
          notes: "api_key: sk_live_abcdefghijklmnopqrstu",
        },
        "create",
      ).ok,
    ).toBe(false);
  });
});

describe("went live on", () => {
  const now = new Date("2026-11-15T09:00:00Z");
  it("uses the day given, at noon in India", () => {
    expect(liveAt("2026-10-27", "2026-11-15", now)).toEqual({
      ok: true,
      at: "2026-10-27T06:30:00.000Z",
    });
  });
  it("falls back to now, and refuses a day after today", () => {
    expect(liveAt(null, "2026-11-15", now)).toEqual({
      ok: true,
      at: now.toISOString(),
    });
    expect(liveAt("2026-11-16", "2026-11-15", now).ok).toBe(false);
  });
});
