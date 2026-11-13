import { describe, expect, it } from "vitest";
import {
  cleanRecord,
  crossFieldError,
  statusStamps,
  wouldLoop,
} from "@/lib/internal/community/clean";
import {
  byteLength,
  csvCell,
  guestsFromCsv,
  parseCsv,
  readCheckIn,
} from "@/lib/internal/community/csv";
import {
  CHANNELS,
  CHANNEL_KEY,
  ENTITIES,
  channelKey,
  channelLabel,
  isEntityKey,
  isOwnedBy,
  quickField,
  type Sponsorship,
} from "@/lib/internal/community/schema";
import {
  moneyYear,
  partnerFollowUpDue,
  sponsorFollowUpDue,
  sponsorshipsIn,
} from "@/lib/internal/community/stats";

describe("CSV export cells", () => {
  it("stops a cell from running as a formula", () => {
    expect(csvCell('=HYPERLINK("http://evil","x")')).toBe(
      '"\'=HYPERLINK(""http://evil"",""x"")"',
    );
    expect(csvCell("+91 98765")).toBe("'+91 98765");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@asha")).toBe("'@asha");
    expect(csvCell("\tcmd")).toBe("'\tcmd");
    expect(csvCell("\rcmd")).toBe('"\'\rcmd"');
  });

  it("leaves ordinary cells alone and quotes what needs it", () => {
    expect(csvCell("Priya Shah")).toBe("Priya Shah");
    expect(csvCell("priya@example.com")).toBe("priya@example.com");
    expect(csvCell("Shah, Priya")).toBe('"Shah, Priya"');
    expect(csvCell('said "hi"')).toBe('"said ""hi"""');
    expect(csvCell("two\rlines")).toBe('"two\rlines"');
    expect(csvCell("")).toBe("");
  });

  it("counts bytes, not characters", () => {
    expect(byteLength("abc")).toBe(3);
    expect(byteLength("प्रिया")).toBeGreaterThan(6);
  });
});

describe("growth channels", () => {
  it("gives every known channel a key the table accepts", () => {
    for (const [key, label] of Object.entries(CHANNELS)) {
      expect(key).toMatch(CHANNEL_KEY);
      expect(channelKey(key)).toBe(key);
      expect(channelKey(label)).toBe(key);
    }
  });

  it("reads X however it is typed", () => {
    for (const typed of ["x", "X", " X (Twitter) ", "twitter", "x.com"]) {
      expect(channelKey(typed)).toBe("twitter");
    }
    expect(channelLabel("twitter")).toBe("X (Twitter)");
  });

  it("never returns a key the table would refuse", () => {
    for (const typed of [
      "Discord members",
      "a",
      "!!",
      "",
      "  ",
      "A very long channel name that goes on and on",
      "abcdefghijklmnopqrstuvw_ extra",
    ]) {
      const key = channelKey(typed);
      if (key !== null) expect(key).toMatch(CHANNEL_KEY);
    }
    expect(channelKey("a")).toBeNull();
    expect(channelKey("!!")).toBeNull();
    expect(channelKey(42)).toBeNull();
  });
});

describe("check-in cells", () => {
  const now = new Date("2026-11-13T12:00:00Z");

  it("takes a plain yes", () => {
    for (const yes of ["yes", "Y", "TRUE", "1", "Checked in", "present"]) {
      expect(readCheckIn(yes, now)).toEqual({ attended: true, at: null });
    }
  });

  it("takes a no, and anything it can't read, as not checked in", () => {
    for (const no of ["", "no", "0", "false", "Absent", "Not attended", "-"]) {
      expect(readCheckIn(no, now)).toEqual({ attended: false, unread: false });
    }
    for (const odd of ["Maybe", "13/11/2026 6:30 PM", "Nov 10", "2", "later"]) {
      expect(readCheckIn(odd, now)).toEqual({ attended: false, unread: true });
    }
  });

  it("reads full dates, and times without a zone as IST", () => {
    expect(readCheckIn("2026-11-10T13:05:00Z", now)).toEqual({
      attended: true,
      at: "2026-11-10T13:05:00.000Z",
    });
    expect(readCheckIn("2026-11-10 18:30", now)).toEqual({
      attended: true,
      at: "2026-11-10T13:00:00.000Z",
    });
    expect(readCheckIn("2026-11-10T18:30:00+0530", now)).toEqual({
      attended: true,
      at: "2026-11-10T13:00:00.000Z",
    });
    expect(readCheckIn("2026-11-10", now)).toEqual({
      attended: true,
      at: "2026-11-09T18:30:00.000Z",
    });
  });

  it("refuses dates that can't be a check-in", () => {
    expect(readCheckIn("2026-02-31 10:00", now).attended).toBe(false);
    expect(readCheckIn("2001-01-01", now).attended).toBe(false);
    expect(readCheckIn("2027-06-01 10:00", now).attended).toBe(false);
  });

  it("counts unread cells and doesn't mark those guests as attended", () => {
    const result = guestsFromCsv(
      [
        "email,attended",
        "a@example.com,Yes",
        "b@example.com,Absent",
        "c@example.com,Maybe",
        "d@example.com,1",
      ].join("\n"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.guests.map((guest) => guest.status)).toEqual([
      "attended",
      "registered",
      "registered",
      "attended",
    ]);
    expect(result.guests[3].checkedInAt).toBeNull();
    expect(result.unreadCheckIns).toBe(1);
  });

  it("reads semicolon-separated files", () => {
    expect(parseCsv("name;email\nShah, Priya;p@example.com")).toEqual([
      ["name", "email"],
      ["Shah, Priya", "p@example.com"],
    ]);
  });
});

describe("status time stamps", () => {
  const now = "2026-11-13T10:00:00.000Z";

  it("stamps only when the status changes", () => {
    expect(statusStamps("guest", "registered", "attended", now)).toEqual({
      checked_in_at: now,
    });
    expect(statusStamps("guest", "attended", "attended", now)).toEqual({});
    expect(statusStamps("guest", "attended", "registered", now)).toEqual({
      checked_in_at: null,
    });
    expect(statusStamps("task", "todo", "done", now)).toEqual({
      completed_at: now,
    });
    expect(statusStamps("task", "done", "done", now)).toEqual({});
    expect(statusStamps("task", "done", "doing", now)).toEqual({
      completed_at: null,
    });
    expect(statusStamps("task", "todo", "doing", now)).toEqual({
      completed_at: null,
    });
  });

  it("leaves other records and missing statuses alone", () => {
    expect(statusStamps("event", "planning", "done", now)).toEqual({});
    expect(statusStamps("task", "todo", undefined, now)).toEqual({});
  });
});

describe("rules across fields", () => {
  const id = () => crypto.randomUUID();

  it("checks a change against the whole saved record", () => {
    const saved = { starts_on: "2026-11-20", ends_on: null };
    expect(
      crossFieldError("event", { ...saved, ends_on: "2026-11-19" }, true),
    ).toMatch(/end before/);
    expect(
      crossFieldError("event", { ...saved, ends_on: "2026-11-21" }, true),
    ).toBeNull();
    expect(
      crossFieldError("contact", { sponsor_id: id(), partner_id: id() }, true),
    ).toMatch(/one sponsor or one partner/);
    expect(
      crossFieldError(
        "activity",
        { sponsor_id: null, partner_id: null, event_id: null },
        true,
      ),
    ).toMatch(/belongs to/);
    // A change with only some fields isn't judged on the ones it lacks.
    expect(crossFieldError("contact", { name: "Asha" }, false)).toBeNull();
  });

  it("refuses an outreach entry dated in the future", () => {
    expect(
      crossFieldError(
        "activity",
        { sponsor_id: id(), happened_on: "2026-11-14" },
        true,
        "2026-11-13",
      ),
    ).toMatch(/hasn't happened/);
    expect(
      crossFieldError(
        "activity",
        { sponsor_id: id(), happened_on: "2026-11-13" },
        true,
        "2026-11-13",
      ),
    ).toBeNull();
  });

  it("spots a club placed under itself or its own clubs", () => {
    const parents = new Map<string, string | null>([
      ["college", null],
      ["club", "college"],
      ["chapter", "club"],
    ]);
    expect(wouldLoop("college", "college", parents)).toBe(true);
    expect(wouldLoop("college", "chapter", parents)).toBe(true);
    expect(wouldLoop("chapter", "college", parents)).toBe(false);
    // An existing loop elsewhere doesn't hang the walk.
    const looped = new Map<string, string | null>([
      ["a", "b"],
      ["b", "a"],
    ]);
    expect(wouldLoop("c", "a", looped)).toBe(false);
  });
});

describe("input rules", () => {
  it("takes whole numbers in plain digits only", () => {
    const capacity = (value: string) =>
      cleanRecord(ENTITIES.event, { capacity: value }, "update");
    expect(capacity("1,200")).toEqual({ ok: true, row: { capacity: 1200 } });
    expect(capacity("0x10").ok).toBe(false);
    expect(capacity("1e3").ok).toBe(false);
    expect(capacity("-5").ok).toBe(false);
    expect(capacity("12.5").ok).toBe(false);
  });

  it("doesn't turn an unknown currency into rupees", () => {
    const currency = (value: string) =>
      cleanRecord(ENTITIES.expense, { currency: value }, "update");
    expect(currency("")).toEqual({ ok: true, row: { currency: "INR" } });
    expect(currency("usd")).toEqual({ ok: true, row: { currency: "USD" } });
    expect(currency("USDD").ok).toBe(false);
  });

  it("only knows its own record types", () => {
    expect(isEntityKey("event")).toBe(true);
    expect(isEntityKey("constructor")).toBe(false);
    expect(isEntityKey("__proto__")).toBe(false);
    expect(isEntityKey("toString")).toBe(false);
    expect(quickField("task")?.key).toBe("status");
    expect(quickField("contact")).toBeNull();
  });

  it("matches a task's owner by email, not by a name", () => {
    expect(isOwnedBy("priya.k@studio1hq.com", "Priya.K@studio1hq.com")).toBe(
      true,
    );
    expect(isOwnedBy("Priya K", "priya.k@studio1hq.com")).toBe(false);
    expect(isOwnedBy(null, "priya.k@studio1hq.com")).toBe(false);
  });
});

describe("shared sums", () => {
  const deal = (overrides: Partial<Sponsorship>) =>
    ({
      event_id: null,
      status: "pledged",
      paid_on: null,
      due_on: null,
      created_at: "2026-03-01T00:00:00Z",
      ...overrides,
    }) as Sponsorship;

  it("puts a money line in one year, the same way everywhere", () => {
    const starts = new Map<string, string | null>([
      ["e1", "2027-01-10"],
      ["e2", null],
    ]);
    expect(moneyYear(deal({ event_id: "e1" }), starts)).toBe("2027");
    expect(
      moneyYear(deal({ event_id: "e2", paid_on: "2025-12-30" }), starts),
    ).toBe("2025");
    expect(moneyYear(deal({ due_on: "2028-02-01" }), starts)).toBe("2028");
    expect(moneyYear(deal({}), starts)).toBe("2026");
  });

  it("leaves cancelled sponsorships out of a year", () => {
    const deals = [
      deal({ id: "a" }),
      deal({ id: "b", status: "cancelled" }),
      deal({ id: "c", event_id: "e1" }),
    ];
    expect(
      sponsorshipsIn("2026", deals, [
        { id: "e1", starts_on: "2027-01-10" },
      ]).map((item) => item.id),
    ).toEqual(["a"]);
  });

  it("knows when a follow-up is due", () => {
    const today = "2026-11-13";
    expect(
      sponsorFollowUpDue({ follow_up_on: today, stage: "in_talks" }, today),
    ).toBe(true);
    expect(
      sponsorFollowUpDue({ follow_up_on: today, stage: "lost" }, today),
    ).toBe(false);
    expect(
      sponsorFollowUpDue({ follow_up_on: "2026-11-14", stage: "lead" }, today),
    ).toBe(false);
    expect(
      partnerFollowUpDue({ follow_up_on: "2026-11-01", stage: "ended" }, today),
    ).toBe(false);
    expect(
      partnerFollowUpDue(
        { follow_up_on: "2026-11-01", stage: "active" },
        today,
      ),
    ).toBe(true);
    expect(
      sponsorFollowUpDue({ follow_up_on: null, stage: "lead" }, today),
    ).toBe(false);
  });
});
