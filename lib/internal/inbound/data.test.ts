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
const { upsertLeadFromBooking } = await import("@/lib/internal/inbound/data");

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
