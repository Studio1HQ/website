import { describe, expect, it } from "vitest";
import {
  activityEffect,
  byFollowUp,
  domainOf,
  followUpDue,
  isOpen,
  orgsFromCsv,
  stageEdit,
  stageProblem,
  stageStamps,
  xHandleFrom,
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

describe("stageEdit", () => {
  const today = "2026-11-25";
  const won = { stage: "won" as const, lost_reason: "" };
  const lost = { stage: "lost" as const, lost_reason: "Went in-house" };

  it("leaves the stage's fields alone when neither was sent", () => {
    // A form that sat open saves a new name: the closed day isn't restamped.
    expect(stageEdit(won, {}, today)).toEqual({ ok: true, patch: {} });
    expect(stageEdit(lost, {}, today)).toEqual({ ok: true, patch: {} });
  });

  it("stamps the closed day only when the stage was sent and moved", () => {
    expect(stageEdit({ stage: "proposal", lost_reason: "" }, { stage: "won" }, today)).toEqual({
      ok: true,
      patch: { closed_on: today, follow_up_on: null, lost_reason: "" },
    });
    expect(stageEdit(won, { stage: "contacted" }, today)).toEqual({
      ok: true,
      patch: { closed_on: null, lost_reason: "" },
    });
    expect(stageEdit(won, { stage: "won" }, today)).toEqual({ ok: true, patch: { lost_reason: "" } });
  });

  it("needs a reason for Lost, sent or already saved", () => {
    expect(stageEdit(won, { stage: "lost" }, today)).toMatchObject({ ok: false });
    expect(stageEdit(won, { stage: "lost", lost_reason: " " }, today)).toMatchObject({ ok: false });
    expect(stageEdit(won, { stage: "lost", lost_reason: "No budget" }, today)).toEqual({
      ok: true,
      patch: { closed_on: today, follow_up_on: null },
    });
    // Lost again from a form that still shows the old reason.
    expect(stageEdit(lost, { stage: "lost" }, today)).toEqual({ ok: true, patch: {} });
  });

  it("checks a reason sent alone against the saved stage", () => {
    expect(stageEdit(lost, { lost_reason: "" }, today)).toMatchObject({ ok: false });
    expect(stageEdit(lost, { lost_reason: "No budget" }, today)).toEqual({ ok: true, patch: {} });
    // Someone reopened it meanwhile: the reason no longer applies.
    expect(stageEdit(won, { lost_reason: "No budget" }, today)).toEqual({ ok: true, patch: { lost_reason: "" } });
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
          priority: "",
          about: "",
          funding: "",
          why_fit: "",
          warm_path: "",
          signal_url: "",
          conflict: "",
          contact: { name: "Priya K", email: "priya@acme.dev", title: "Head of DevRel", linkedin: "", x_handle: "" },
        },
      ],
    });
  });

  it("reads a prospect research sheet", () => {
    const result = orgsFromCsv(
      [
        '"Company","Website","Category","Stage / Funding","Why They Fit","Contact Name","Role","LinkedIn","X","Email","Warm Path","Source","Priority","Conflict","Outreach Status","Owner","Notes"',
        '"Herdr","https://herdr.dev","Runtime for coding agents","Seed $6M (Bessemer), Sep 8, 2026","Raised $6M on Sep 8","Can Celik","Founder & CEO","","https://x.com/cancelik","","Arindam replied to the seed post","https://x.com/Arindam_1729/status/2097384300337607010","High","None","Not contacted","","Founder last posted Nov 9"',
        '"Polylane","https://polylane.com","AI SRE","Early access","1 company post","Boris Tane","Founder & CEO","linkedin.com/in/boristane","@boristane","boris@coreplane.ai","Past interaction","https://polylane.com","Med","Possible: Measure","In talks","",""',
      ].join("\n"),
    );
    expect(result.ok && result.orgs[0]).toEqual({
      name: "Herdr",
      website: "https://herdr.dev",
      domain: "herdr.dev",
      kind: "client",
      stage: "lead",
      source: "outbound",
      owner: "",
      notes: "Founder last posted Nov 9",
      priority: "high",
      about: "Runtime for coding agents",
      funding: "Seed $6M (Bessemer), Sep 8, 2026",
      why_fit: "Raised $6M on Sep 8",
      warm_path: "Arindam replied to the seed post",
      signal_url: "https://x.com/Arindam_1729/status/2097384300337607010",
      conflict: "",
      contact: { name: "Can Celik", email: "", title: "Founder & CEO", linkedin: "", x_handle: "@cancelik" },
    });
    expect(result.ok && result.orgs[1]).toMatchObject({
      stage: "replied",
      priority: "medium",
      conflict: "Possible: Measure",
      contact: {
        email: "boris@coreplane.ai",
        linkedin: "https://linkedin.com/in/boristane",
        x_handle: "@boristane",
      },
    });
  });

  it("keeps a lead source that isn't a link, and an unknown priority blank", () => {
    const result = orgsFromCsv("name,source,priority,conflict\nAcme,Referral,Urgent,-");
    expect(result.ok && result.orgs[0]).toMatchObject({ source: "referral", signal_url: "", priority: "", conflict: "" });
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

describe("xHandleFrom", () => {
  it("takes a handle, an @handle or a profile link", () => {
    expect(xHandleFrom("https://x.com/calcsam")).toBe("@calcsam");
    expect(xHandleFrom("twitter.com/@guard_if/")).toBe("@guard_if");
    expect(xHandleFrom("@kiwicopple")).toBe("@kiwicopple");
    expect(xHandleFrom("apenwarr")).toBe("@apenwarr");
  });

  it("is blank for anything else", () => {
    expect(xHandleFrom("")).toBe("");
    expect(xHandleFrom("https://x.com/mastra/status/2118048496490307982")).toBe("");
    expect(xHandleFrom("https://linkedin.com/in/someone")).toBe("");
    expect(xHandleFrom("https://x.com/home")).toBe("");
  });
});

describe("byFollowUp", () => {
  it("puts follow-ups first, then high priority, then names", () => {
    const rows = [
      { name: "Cee", follow_up_on: null, priority: "low" },
      { name: "Bee", follow_up_on: null, priority: "" },
      { name: "Ay", follow_up_on: null, priority: "high" },
      { name: "Dee", follow_up_on: "2026-11-20", priority: "low" },
      { name: "Ee", follow_up_on: null, priority: "high" },
    ];
    expect(rows.sort(byFollowUp).map((row) => row.name)).toEqual(["Dee", "Ay", "Ee", "Cee", "Bee"]);
  });
});
