import { beforeEach, describe, expect, it, vi } from "vitest";

// upsertLeadFromBooking with the database in memory: exactly which rows a
// booking is allowed to write, for a new company, an inbound one, and one
// that is not inbound.
vi.mock(
  "@/lib/supabase-server",
  async () => (await import("@/lib/internal/team/test-db")).fakeSupabase,
);
vi.mock("@/lib/internal/team/audit", () => ({ audit: vi.fn(async () => {}) }));

const { db } = await import("@/lib/internal/team/test-db");
const {
  agentActivity,
  createInboundLead,
  getInboundFile,
  heldMailCount,
  queueEvent,
  resolveHeldMail,
  setFileApproval,
  upsertLeadFromBooking,
} = await import("@/lib/internal/inbound/data");
const { audit } = await import("@/lib/internal/team/audit");

const ORG = "11111111-1111-4111-8111-111111111111";
const booking = {
  trigger: "BOOKING_CREATED" as const,
  bookingUid: "u1",
  endTime: "2026-11-30T10:30:00Z",
  startTime: "2026-11-30T10:00:00Z",
  attendeeName: "Mallory",
  attendeeEmail: "mallory@prospect.example",
  companyName: "",
  answers: "hello",
};

const snapshot = (table: string) => structuredClone(db.rows(table));
const everything = () => ({
  orgs: snapshot("outreach_orgs"),
  contacts: snapshot("outreach_contacts"),
  events: snapshot("agent_events"),
});

beforeEach(() => db.reset());

describe("a booking and the company it names", () => {
  it("makes a new company, its contact and one lead_created event", async () => {
    const result = await upsertLeadFromBooking(booking);
    expect(result).toMatchObject({ ok: true, created: true, queued: true });
    const [org] = db.rows("outreach_orgs");
    expect(org).toMatchObject({
      domain: "prospect.example",
      stage: "call_booked",
      source: "inbound_call",
    });
    expect(db.rows("outreach_contacts")).toHaveLength(1);
    expect(db.rows("outreach_contacts")[0]).toMatchObject({
      org_id: org.id,
      email: "mallory@prospect.example",
      is_primary: true,
    });
    expect(db.rows("agent_events")).toHaveLength(1);
    expect(db.rows("agent_events")[0]).toMatchObject({
      org_id: org.id,
      kind: "lead_created",
    });
  });

  it("only moves the stage of an inbound company, and adds no contact", async () => {
    db.add("outreach_orgs", {
      id: ORG,
      name: "Prospect",
      domain: "prospect.example",
      stage: "lead",
      source: "inbound_email",
      kind: "client",
    });
    db.add("outreach_contacts", {
      org_id: ORG,
      email: "someone@prospect.example",
      name: "Someone",
    });
    const before = everything();
    const result = await upsertLeadFromBooking(booking);
    expect(result).toMatchObject({ ok: true, created: false, queued: true });
    expect(result).not.toHaveProperty("needsPerson");
    const after = everything();
    // The org changed in the stage and the audit columns, never the source.
    expect(after.orgs[0]).toMatchObject({
      stage: "call_booked",
      source: "inbound_email",
      name: "Prospect",
      domain: "prospect.example",
    });
    const {
      stage: _s,
      updated_by: _u,
      updated_at: _a,
      ...rest
    } = after.orgs[0];
    const { stage: _s0, ...restBefore } = before.orgs[0];
    expect(rest).toEqual(restBefore);
    expect(after.contacts).toEqual(before.contacts);
    expect(after.events).toHaveLength(1);
    expect(after.events[0]).toMatchObject({
      org_id: ORG,
      kind: "lead_created",
    });
  });

  it("queues lead_created once for an inbound company", async () => {
    db.add("outreach_orgs", {
      id: ORG,
      name: "Prospect",
      domain: "prospect.example",
      stage: "call_booked",
      source: "inbound_call",
    });
    await upsertLeadFromBooking(booking);
    const second = await upsertLeadFromBooking(booking);
    expect(second).toMatchObject({ ok: true, queued: false });
    expect(db.rows("agent_events")).toHaveLength(1);
  });

  it("adds no contact to an inbound company even for a new email at it", async () => {
    db.add("outreach_orgs", {
      id: ORG,
      name: "Prospect",
      domain: "prospect.example",
      stage: "replied",
      source: "inbound_email",
    });
    await upsertLeadFromBooking(booking);
    expect(db.rows("outreach_contacts")).toEqual([]);
  });

  for (const source of ["outbound", "client", "manual", null]) {
    it(`changes nothing for a company whose source is ${String(source)}`, async () => {
      db.add("outreach_orgs", {
        id: ORG,
        name: "Prospect",
        domain: "prospect.example",
        stage: "contacted",
        source,
      });
      const before = everything();
      const result = await upsertLeadFromBooking(booking);
      expect(result).toEqual({
        ok: true,
        orgId: ORG,
        created: false,
        queued: false,
        needsPerson: { orgId: ORG, orgName: "Prospect" },
      });
      // No org write (stage, source, anything), no contact, no event.
      expect(everything()).toEqual(before);
    });
  }

  it("treats a contact match on a non-inbound company the same way", async () => {
    db.add("outreach_orgs", {
      id: ORG,
      name: "Other Co",
      domain: "other.example",
      stage: "contacted",
      source: "outbound",
    });
    db.add("outreach_contacts", {
      org_id: ORG,
      email: "mallory@prospect.example",
      name: "Known",
    });
    const before = everything();
    const result = await upsertLeadFromBooking(booking);
    expect(result).toMatchObject({
      ok: true,
      queued: false,
      needsPerson: { orgId: ORG, orgName: "Other Co" },
    });
    expect(everything()).toEqual(before);
  });
});

const FOUNDER = { email: "arindam@studio1hq.com" };
const lead = {
  name: "Acme",
  website: "acme.example",
  source: "inbound_email",
  contactName: "Sam",
  contactEmail: "sam@acme.example",
  message: "We want a launch video",
  startAgent: true,
};

describe("adding a lead by hand", () => {
  it("adds the company, its contact and one lead_created event, and audits it", async () => {
    const result = await createInboundLead(lead, FOUNDER);
    expect(result).toMatchObject({ ok: true });
    const [org] = db.rows("outreach_orgs");
    expect(org).toMatchObject({
      name: "Acme",
      domain: "acme.example",
      website: "https://acme.example",
      source: "inbound_email",
      stage: "lead",
    });
    expect(org).not.toHaveProperty("est_value");
    expect(db.rows("outreach_contacts")[0]).toMatchObject({
      org_id: org.id,
      email: "sam@acme.example",
      is_primary: true,
    });
    expect(db.rows("agent_events")).toHaveLength(1);
    expect(db.rows("agent_events")[0]).toMatchObject({
      kind: "lead_created",
      created_by: "arindam@studio1hq.com",
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ area: "inbound", action: "added lead" }),
    );
  });

  it("does not queue the agent unless asked", async () => {
    await createInboundLead({ ...lead, startAgent: false }, FOUNDER);
    expect(db.rows("agent_events")).toEqual([]);
  });

  for (const source of ["outbound", "inbound_call"]) {
    it(`refuses a website whose domain belongs to a ${source} company, and names it`, async () => {
      db.add("outreach_orgs", {
        id: ORG,
        name: "Existing Co",
        domain: "acme.example",
        stage: "lead",
        source,
      });
      const before = everything();
      const result = await createInboundLead(
        { ...lead, website: "https://www.acme.example/about" },
        FOUNDER,
      );
      expect(result.ok).toBe(false);
      expect(result.message).toContain("Existing Co");
      expect(everything()).toEqual(before);
    });
  }

  it("refuses a missing name, a bad source, a bad website and a bad email", async () => {
    for (const bad of [
      { name: " " },
      { source: "outbound" },
      { website: "javascript:alert(1)" },
      { website: "ftp://acme.example" },
      { contactEmail: "not an email" },
    ]) {
      const result = await createInboundLead({ ...lead, ...bad }, FOUNDER);
      expect(result.ok).toBe(false);
    }
    expect(db.rows("outreach_orgs")).toEqual([]);
  });
});

describe("file approval", () => {
  const FILE = "22222222-2222-4222-8222-222222222222";
  beforeEach(() => {
    db.add("outreach_orgs", {
      id: ORG,
      name: "A",
      source: "inbound_call",
      stage: "lead",
    });
    db.add("agent_files", {
      id: FILE,
      org_id: ORG,
      name: "brief.pdf",
      kind: "brief",
      approved_to_send: false,
    });
  });

  it("is refused for anyone but a founder", async () => {
    const result = await setFileApproval(FILE, true, {
      email: "intern@studio1hq.com",
    });
    expect(result.ok).toBe(false);
    expect(db.rows("agent_files")[0].approved_to_send).toBe(false);
  });

  it("approves, records who, and audits", async () => {
    expect(await setFileApproval(FILE, true, FOUNDER)).toMatchObject({
      ok: true,
    });
    expect(db.rows("agent_files")[0]).toMatchObject({
      approved_to_send: true,
      approved_by: "arindam@studio1hq.com",
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "approved file" }),
    );
    await setFileApproval(FILE, false, FOUNDER);
    expect(db.rows("agent_files")[0]).toMatchObject({
      approved_to_send: false,
      approved_by: null,
    });
  });

  it("does not reach a file of a lead that is not inbound", async () => {
    db.rows("outreach_orgs")[0].source = "outbound";
    expect(await getInboundFile(FILE)).toBeNull();
    expect((await setFileApproval(FILE, true, FOUNDER)).ok).toBe(false);
  });
});

describe("counts", () => {
  it("counts the last 7 days of queued, running and failed events", async () => {
    const now = new Date("2026-11-27T12:00:00Z");
    const at = (days: number) =>
      new Date(now.getTime() - days * 86_400_000).toISOString();
    db.add(
      "agent_events",
      { status: "queued", created_at: at(1) },
      { status: "running", created_at: at(2) },
      { status: "failed", created_at: at(3) },
      { status: "failed", created_at: at(10) },
      { status: "done", created_at: at(1) },
    );
    expect(await agentActivity(now)).toEqual({
      ok: true,
      value: { queued: 1, running: 1, failed: 1 },
    });
  });

  it("counts held mail waiting for a decision", async () => {
    db.add(
      "inbound_mail",
      { held: true, correction: "" },
      { held: true, correction: "lead" },
      { held: false, correction: "" },
    );
    expect(await heldMailCount()).toBe(1);
  });
});

describe("a person's decision on sorted mail", () => {
  const MAIL = "22222222-2222-4222-8222-222222222222";
  const PERSON = { email: "Arindam@studio1hq.com" };
  const held = {
    id: MAIL,
    from_address: "Sam@Acme.example",
    from_name: "Sam Rivera",
    subject: "Launch content",
    excerpt: "We want help with our launch.",
    sender_verified: true,
    status: "sorted",
    held: true,
    org_id: null,
    correction: "",
  };

  it("makes the lead and its contact from a held mail, ties the mail to it and starts nothing by default", async () => {
    db.add("inbound_mail", held);
    const result = await resolveHeldMail(MAIL, "lead", PERSON);
    expect(result).toMatchObject({ ok: true });
    const [org] = db.rows("outreach_orgs");
    expect(org).toMatchObject({
      domain: "acme.example",
      website: "https://acme.example",
      source: "inbound_email",
      stage: "lead",
      created_by: "arindam@studio1hq.com",
    });
    expect(db.rows("outreach_contacts")[0]).toMatchObject({
      org_id: org.id,
      name: "Sam Rivera",
      email: "sam@acme.example",
      is_primary: true,
    });
    expect(db.rows("inbound_mail")[0]).toMatchObject({
      held: false,
      correction: "lead",
      org_id: org.id,
      resolved_by: "arindam@studio1hq.com",
    });
    expect(db.rows("agent_events")).toEqual([]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ area: "inbound", action: "resolved mail" }),
    );
  });

  it("starts the agent when the founders switched that on for mail", async () => {
    db.add("inbound_mail", held);
    db.add("agent_settings", {
      key: "auto_start",
      value: { booking: true, mail: true },
    });
    await resolveHeldMail(MAIL, "lead", PERSON);
    expect(db.rows("agent_events")).toHaveLength(1);
    expect(db.rows("agent_events")[0]).toMatchObject({
      kind: "lead_created",
      created_by: "arindam@studio1hq.com",
    });
  });

  it("never keeps the domain of a sender nobody verified", async () => {
    db.add("inbound_mail", { ...held, sender_verified: false });
    await resolveHeldMail(MAIL, "lead", PERSON);
    expect(db.rows("outreach_orgs")[0]).toMatchObject({
      name: "Sam Rivera",
      domain: null,
      website: null,
    });
  });

  it("ties the mail to an inbound lead that already has that domain, and changes nothing about it", async () => {
    db.add("inbound_mail", held);
    db.add("outreach_orgs", {
      id: ORG,
      name: "Acme",
      domain: "acme.example",
      stage: "call_booked",
      source: "inbound_call",
    });
    const before = snapshot("outreach_orgs");
    const result = await resolveHeldMail(MAIL, "lead", PERSON);
    expect(result).toMatchObject({ ok: true, id: ORG });
    expect(db.rows("outreach_orgs")).toEqual(before);
    expect(db.rows("outreach_contacts")).toEqual([]);
    expect(db.rows("agent_events")).toEqual([]);
    expect(db.rows("inbound_mail")[0]).toMatchObject({ org_id: ORG });
  });

  it("refuses a sender who belongs to an outreach prospect or a client, and writes nothing", async () => {
    db.add("inbound_mail", held);
    db.add("outreach_orgs", {
      id: ORG,
      name: "Acme",
      domain: "acme.example",
      stage: "lead",
      source: "outbound",
    });
    const before = { ...everything(), mail: snapshot("inbound_mail") };
    const result = await resolveHeldMail(MAIL, "lead", PERSON);
    expect(result.ok).toBe(false);
    expect({ ...everything(), mail: snapshot("inbound_mail") }).toEqual(before);
  });

  it("marks a held mail as not a lead without making anything", async () => {
    db.add("inbound_mail", held);
    expect(await resolveHeldMail(MAIL, "not_lead", PERSON)).toMatchObject({
      ok: true,
    });
    expect(db.rows("outreach_orgs")).toEqual([]);
    expect(db.rows("inbound_mail")[0]).toMatchObject({
      held: false,
      correction: "not_lead",
      org_id: null,
    });
  });

  it("lets a skipped mail be turned into a lead, and nothing else", async () => {
    db.add("inbound_mail", { ...held, held: false });
    expect((await resolveHeldMail(MAIL, "not_lead", PERSON)).ok).toBe(false);
    expect(db.rows("inbound_mail")[0]).toMatchObject({ correction: "" });
    expect((await resolveHeldMail(MAIL, "lead", PERSON)).ok).toBe(true);
    expect(db.rows("outreach_orgs")).toHaveLength(1);
    // A second click finds the mail already tied to its lead.
    expect((await resolveHeldMail(MAIL, "lead", PERSON)).ok).toBe(false);
    expect(db.rows("outreach_orgs")).toHaveLength(1);
  });

  it("leaves mail that isn't sorted yet alone", async () => {
    db.add("inbound_mail", { ...held, held: false, status: "new" });
    expect((await resolveHeldMail(MAIL, "lead", PERSON)).ok).toBe(false);
    expect(db.rows("outreach_orgs")).toEqual([]);
  });
});

describe("a person asking the agent for something", () => {
  const add = (source: string, stage = "call_booked") =>
    db.add("outreach_orgs", { id: ORG, name: "Acme", stage, source });

  for (const source of ["outbound", "referral", ""]) {
    it(`refuses a company that is not an inbound lead (source "${source}") and writes nothing`, async () => {
      add(source);
      const before = everything();
      for (const kind of ["lead_created", "proposal_sent", "lost"] as const) {
        const result = await queueEvent(
          ORG,
          kind,
          kind === "lost" ? { reason: "no budget" } : {},
          "sam@studio1hq.com",
        );
        expect(result.ok).toBe(false);
      }
      expect(everything()).toEqual(before);
    });
  }

  it("queues the event for an inbound lead and moves its stage", async () => {
    add("inbound_call");
    const result = await queueEvent(
      ORG,
      "proposal_sent",
      {},
      "sam@studio1hq.com",
    );
    expect(result.ok).toBe(true);
    expect(db.rows("agent_events")).toHaveLength(1);
    expect(db.rows("outreach_orgs")[0]).toMatchObject({ stage: "proposal" });
  });
});
