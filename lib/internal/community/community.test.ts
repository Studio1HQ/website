import { describe, expect, it } from "vitest";
import { communityAccess } from "@/lib/internal/roles";
import { cleanRecord, parseAmount } from "@/lib/internal/community/clean";
import {
  guestsFromCsv,
  mergedStatus,
  parseCsv,
} from "@/lib/internal/community/csv";
import {
  ENTITIES,
  channelKey,
  formatEventDate,
  formatTotals,
  isOwnedBy,
  lastMonths,
  ownerName,
  turnoutOf,
  type CommunityEvent,
} from "@/lib/internal/community/schema";
import { moneyOf, phaseOf } from "@/lib/internal/community/stats";

describe("community roles", () => {
  it("gives admins and managers full access, viewers read access", () => {
    expect(communityAccess(["admin"])).toBe("manager");
    expect(communityAccess(["community_manager"])).toBe("manager");
    expect(communityAccess(["community_viewer", "blog_writer"])).toBe("viewer");
    expect(communityAccess(["hiring_reviewer"])).toBeNull();
  });
});

describe("cleanRecord", () => {
  it("cleans an event and fills selects with their first option", () => {
    const result = cleanRecord(
      ENTITIES.event,
      {
        name: "  AI   Builders  Meetup ",
        kind: "",
        budget: "₹1,20,000",
        capacity: "120",
        registration_url: "lu.ma/ai",
        tags: "ai, AI, devrel",
      },
      "create",
    );
    expect(result).toEqual({
      ok: true,
      row: {
        name: "AI Builders Meetup",
        kind: "meetup",
        budget: 120000,
        capacity: 120,
        registration_url: "https://lu.ma/ai",
        tags: ["ai", "devrel"],
      },
    });
  });

  it("starts selects from the record's real default", () => {
    expect(
      cleanRecord(ENTITIES.event, { name: "x", status: "" }, "create"),
    ).toMatchObject({
      row: { status: "planning" },
    });
    expect(
      cleanRecord(ENTITIES.task, { title: "x", priority: "" }, "create"),
    ).toMatchObject({
      row: { priority: "normal" },
    });
  });

  it("needs required fields when adding, but not when changing others", () => {
    expect(
      cleanRecord(ENTITIES.event, { kind: "meetup" }, "create"),
    ).toMatchObject({ ok: false });
    expect(cleanRecord(ENTITIES.event, { status: "done" }, "update")).toEqual({
      ok: true,
      row: { status: "done" },
    });
  });

  it("rejects bad values", () => {
    expect(
      cleanRecord(ENTITIES.event, { name: "x", status: "party" }, "update").ok,
    ).toBe(false);
    expect(
      cleanRecord(
        ENTITIES.event,
        { name: "x", starts_on: "2026-02-30" },
        "update",
      ).ok,
    ).toBe(false);
    expect(
      cleanRecord(
        ENTITIES.event,
        { name: "x", starts_on: "2026-11-20", ends_on: "2026-11-19" },
        "create",
      ).ok,
    ).toBe(false);
    expect(
      cleanRecord(
        ENTITIES.event,
        { name: "x", partner_id: "not-a-uuid" },
        "create",
      ).ok,
    ).toBe(false);
    expect(
      cleanRecord(
        ENTITIES.guest,
        { event_id: crypto.randomUUID(), email: "nope" },
        "create",
      ).ok,
    ).toBe(false);
    expect(
      cleanRecord(
        ENTITIES.sponsor,
        { name: "x", website: "javascript:alert(1)" },
        "create",
      ).ok,
    ).toBe(false);
  });

  it("needs a contact to belong to exactly one sponsor or partner", () => {
    expect(cleanRecord(ENTITIES.contact, { name: "Asha" }, "create").ok).toBe(
      false,
    );
    expect(
      cleanRecord(
        ENTITIES.contact,
        {
          name: "Asha",
          sponsor_id: crypto.randomUUID(),
          partner_id: crypto.randomUUID(),
        },
        "create",
      ).ok,
    ).toBe(false);
    expect(
      cleanRecord(
        ENTITIES.contact,
        { name: "Asha", sponsor_id: crypto.randomUUID() },
        "create",
      ).ok,
    ).toBe(true);
  });

  it("lowercases email owners and keeps volunteer names", () => {
    expect(
      cleanRecord(
        ENTITIES.task,
        { title: "Book venue", owner: "Priya@Studio1HQ.com" },
        "create",
      ),
    ).toMatchObject({
      ok: true,
      row: { owner: "priya@studio1hq.com" },
    });
    expect(
      cleanRecord(
        ENTITIES.task,
        { title: "Book venue", owner: "Rahul (volunteer)" },
        "create",
      ),
    ).toMatchObject({
      row: { owner: "Rahul (volunteer)" },
    });
  });
});

describe("parseAmount", () => {
  it("reads Indian and short amounts", () => {
    expect(parseAmount("1,20,000")).toBe(120000);
    expect(parseAmount("$1.5k")).toBe(1500);
    expect(parseAmount("2 lakh")).toBe(200000);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("lots")).toBeNaN();
  });
});

describe("guest CSV import", () => {
  it("parses quotes, commas and new lines inside cells", () => {
    expect(
      parseCsv('name,notes\r\n"Shah, Priya","said ""hi""\nthen left"\n'),
    ).toEqual([
      ["name", "notes"],
      ["Shah, Priya", 'said "hi"\nthen left'],
    ]);
  });

  it("reads a Luma export", () => {
    const csv = [
      "api_id,name,first_name,last_name,email,phone_number,created_at,approval_status,checked_in_at,What college are you from?",
      "gst-1,Priya Shah,Priya,Shah,PRIYA@example.com,,2026-11-01,approved,2026-11-10T13:05:00Z,IIT Bombay",
      "gst-2,Rahul K,Rahul,K,rahul@example.com,,2026-11-01,waitlist,,",
      "gst-3,No Email,,,,,2026-11-01,approved,,",
      "gst-4,Declined,,,dec@example.com,,2026-11-01,declined,,",
    ].join("\n");
    const result = guestsFromCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.skipped).toBe(1);
    expect(result.guests.map((guest) => [guest.email, guest.status])).toEqual([
      ["priya@example.com", "attended"],
      ["rahul@example.com", "waitlisted"],
      ["dec@example.com", "cancelled"],
    ]);
    expect(result.guests[0].name).toBe("Priya Shah");
  });

  it("joins first and last names and finds the college column", () => {
    const result = guestsFromCsv(
      "First Name,Last Name,Email Address,College\nAsha,Rao,asha@example.com,BITS Pilani",
    );
    expect(result).toMatchObject({
      ok: true,
      guests: [{ name: "Asha Rao", organisation: "BITS Pilani", status: null }],
    });
  });

  it("needs an email column", () => {
    expect(guestsFromCsv("name\nAsha").ok).toBe(false);
  });

  it("never undoes a check-in made at the door", () => {
    expect(mergedStatus("attended", "registered")).toBe("attended");
    expect(mergedStatus("no_show", "attended")).toBe("attended");
    expect(mergedStatus("registered", "cancelled")).toBe("cancelled");
    expect(mergedStatus("confirmed", "registered")).toBe("confirmed");
    expect(mergedStatus(undefined, null)).toBe("registered");
    expect(mergedStatus("waitlisted", null)).toBe("waitlisted");
  });
});

const event = (overrides: Partial<CommunityEvent> = {}) =>
  ({
    status: "planning",
    starts_on: "2026-11-10",
    ends_on: null,
    registered_count: null,
    attended_count: null,
    ...overrides,
  }) as CommunityEvent;

describe("turnout", () => {
  it("adds the guest list and site sign-ups, and works out show-up once it's over", () => {
    const result = turnoutOf(
      event(),
      { signed_up: 100, attended: 45, waitlisted: 10, no_show: 45 },
      { signed_up: 20, attended: 9, waitlisted: 0, no_show: 0 },
      "2026-11-13",
    );
    expect(result).toEqual({
      signedUp: 120,
      attended: 54,
      showUp: 54 / 110,
      source: "list",
    });
  });

  it("falls back to typed-in numbers and leaves show-up blank before the day", () => {
    expect(
      turnoutOf(
        event({ registered_count: 300, attended_count: 0 }),
        undefined,
        undefined,
        "2026-11-01",
      ),
    ).toEqual({
      signedUp: 300,
      attended: 0,
      showUp: null,
      source: "typed",
    });
  });

  it("puts events in the right phase", () => {
    expect(phaseOf(event(), "2026-11-13")).toBe("past");
    expect(phaseOf(event({ ends_on: "2026-11-14" }), "2026-11-13")).toBe(
      "upcoming",
    );
    expect(phaseOf(event({ starts_on: null }), "2026-11-13")).toBe("upcoming");
    expect(phaseOf(event({ status: "idea" }), "2026-11-13")).toBe("idea");
  });
});

describe("money", () => {
  it("splits planned, spent and sponsorship per currency", () => {
    const money = moneyOf(
      [
        { amount: 1000, currency: "INR", status: "planned" },
        { amount: 5000, currency: "INR", status: "paid" },
        { amount: 200, currency: "USD", status: "to_pay" },
        { amount: 999, currency: "INR", status: "cancelled" },
      ] as never,
      [
        { amount: 20000, currency: "INR", status: "pledged" },
        { amount: 300, currency: "USD", status: "cancelled" },
      ] as never,
    );
    expect(money.planned).toEqual({ INR: 1000 });
    expect(money.spent).toEqual({ INR: 5000, USD: 200 });
    expect(money.income).toEqual({ INR: 20000 });
    expect(formatTotals(money.spent)).toBe("₹5,000 + $200");
  });
});

describe("helpers", () => {
  it("formats dates, months, owners and channels", () => {
    expect(formatEventDate("2026-11-13", null, "2026-11-01")).toBe(
      "Fri, 13 Nov",
    );
    expect(formatEventDate("2026-11-13", "2026-11-15", "2026-11-01")).toBe(
      "13–15 Nov",
    );
    expect(lastMonths(3, "2026-01-20")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
    expect(ownerName("priya.k@studio1hq.com")).toBe("Priya K");
    expect(isOwnedBy("Priya.K@studio1hq.com ", "priya.k@studio1hq.com")).toBe(
      true,
    );
    expect(channelKey("X (Twitter)")).toBe("twitter");
    expect(channelKey("Discord members")).toBe("discord_members");
  });
});
