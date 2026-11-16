import { describe, expect, it } from "vitest";
import {
  activityEffect,
  domainOf,
  followUpDue,
  isOpen,
  orgsFromCsv,
  stageProblem,
  stageStamps,
} from "@/lib/internal/outreach/rules";

describe("domainOf", () => {
  it("is the host, lowercased, without www", () => {
    expect(domainOf("https://www.Acme.dev/pricing?x=1")).toBe("acme.dev");
    expect(domainOf("acme.dev")).toBe("acme.dev");
    expect(domainOf("http://docs.acme.dev")).toBe("docs.acme.dev");
  });

  it("is null without a usable host", () => {
    expect(domainOf("")).toBeNull();
    expect(domainOf(null)).toBeNull();
    expect(domainOf("not a site")).toBeNull();
    expect(domainOf("localhost")).toBeNull();
  });
});

describe("stages", () => {
  it("knows what's still in play", () => {
    expect(isOpen("lead")).toBe(true);
    expect(isOpen("proposal")).toBe(true);
    expect(isOpen("won")).toBe(false);
    expect(isOpen("not_now")).toBe(false);
  });

  it("counts a follow-up as due only while it's in play", () => {
    expect(followUpDue({ stage: "contacted", follow_up_on: "2026-11-17" }, "2026-11-17")).toBe(true);
    expect(followUpDue({ stage: "contacted", follow_up_on: "2026-11-18" }, "2026-11-17")).toBe(false);
    expect(followUpDue({ stage: "contacted", follow_up_on: null }, "2026-11-17")).toBe(false);
    expect(followUpDue({ stage: "not_now", follow_up_on: "2026-11-01" }, "2026-11-17")).toBe(false);
  });

  it("needs a reason to mark something lost", () => {
    expect(stageProblem("lost", " ")).toMatch(/why/i);
    expect(stageProblem("lost", "Went in-house")).toBeNull();
    expect(stageProblem("won", "")).toBeNull();
  });

  it("stamps the day it closed and clears it on reopening", () => {
    expect(stageStamps("proposal", "won", "2026-11-17")).toEqual({ closed_on: "2026-11-17", follow_up_on: null });
    expect(stageStamps("proposal", "not_now", "2026-11-17")).toEqual({ closed_on: "2026-11-17" });
    expect(stageStamps("lost", "contacted", "2026-11-17")).toEqual({ closed_on: null });
    expect(stageStamps("won", "won", "2026-11-17")).toEqual({});
  });
});

describe("activityEffect", () => {
  const lead = { stage: "lead" as const, last_contact_on: null };

  it("moves a lead to Contacted the first time we reach out", () => {
    expect(activityEffect(lead, { kind: "email", direction: "out", happened_on: "2026-11-17" })).toEqual({
      stage: "contacted",
      last_contact_on: "2026-11-17",
    });
  });

  it("moves to Replied when they write back", () => {
    expect(
      activityEffect({ stage: "contacted", last_contact_on: "2026-11-10" }, { kind: "dm", direction: "in", happened_on: "2026-11-17" }),
    ).toEqual({ stage: "replied", last_contact_on: "2026-11-17" });
  });

  it("never moves a later stage back", () => {
    expect(
      activityEffect({ stage: "proposal", last_contact_on: "2026-11-10" }, { kind: "email", direction: "in", happened_on: "2026-11-17" }),
    ).toEqual({ last_contact_on: "2026-11-17" });
  });

  it("doesn't count a note as contact", () => {
    expect(activityEffect(lead, { kind: "note", direction: "out", happened_on: "2026-11-17" })).toEqual({});
  });

  it("only moves the last contact forward", () => {
    expect(
      activityEffect({ stage: "replied", last_contact_on: "2026-11-15" }, { kind: "call", direction: "out", happened_on: "2026-11-01" }),
    ).toEqual({});
  });

  it("sets or clears the follow-up and takes a new next step", () => {
    const base = { stage: "replied" as const, last_contact_on: "2026-11-17" };
    const entry = { kind: "note" as const, direction: "out" as const, happened_on: "2026-11-17" };
    expect(activityEffect(base, { ...entry, follow_up_on: "2026-11-24", next_step: "  Send   deck " })).toEqual({
      follow_up_on: "2026-11-24",
      next_step: "Send deck",
    });
    expect(activityEffect(base, { ...entry, follow_up_on: null })).toEqual({ follow_up_on: null });
    expect(activityEffect(base, { ...entry, follow_up_on: "", next_step: "" })).toEqual({});
  });
});

describe("orgsFromCsv", () => {
  it("maps loose headers, with one person per row", () => {
    const result = orgsFromCsv(
      [
        "Company,Website,Type,Status,Lead Source,Owner,Contact Name,Email,Job Title,Notes",
        "Acme Cloud,www.acme.dev,Partner,Call booked,Referral,Arindam@studio1hq.com,Priya K,PRIYA@acme.dev,Head of DevRel,Met at KubeCon",
      ].join("\n"),
    );
    expect(result).toEqual({
      ok: true,
      skipped: 0,
      orgs: [
        {
          name: "Acme Cloud",
          website: "https://www.acme.dev",
          domain: "acme.dev",
          kind: "partner",
          stage: "call_booked",
          source: "referral",
          owner: "arindam@studio1hq.com",
          notes: "Met at KubeCon",
          contact: { name: "Priya K", email: "priya@acme.dev", title: "Head of DevRel" },
        },
      ],
    });
  });

  it("falls back to a client lead we reached out to", () => {
    const result = orgsFromCsv("name\nAcme");
    expect(result.ok && result.orgs[0]).toMatchObject({
      kind: "client",
      stage: "lead",
      source: "outbound",
      website: "",
      domain: null,
      owner: "",
      contact: null,
    });
  });

  it("skips rows without a name and repeats of a domain or name", () => {
    const result = orgsFromCsv(
      ["name,website", "Acme,acme.dev", "Acme Inc,https://www.acme.dev/about", ",orphan.dev", "Solo", "solo", ""].join("\n"),
    );
    expect(result.ok && result.orgs.map((org) => org.name)).toEqual(["Acme", "Solo"]);
    expect(result.ok && result.skipped).toBe(3);
  });

  it("drops an owner or email that isn't an address", () => {
    const result = orgsFromCsv("name,owner,contact,email\nAcme,Priya,Sam,not-an-email");
    expect(result.ok && result.orgs[0]).toMatchObject({ owner: "", contact: { name: "Sam", email: "", title: "" } });
  });

  it("says what's wrong with a file it can't read", () => {
    expect(orgsFromCsv("name")).toMatchObject({ ok: false });
    expect(orgsFromCsv("website\nacme.dev")).toMatchObject({ ok: false });
    expect(orgsFromCsv("name\nA\nB\nC", 2)).toMatchObject({ ok: false });
  });
});
