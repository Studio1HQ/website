import { describe, expect, it } from "vitest";
import {
  boardColumn,
  bookingMovesStage,
  canQueue,
  cleanMail,
  companyDomainFromEmail,
  headerValue,
  isInboundLead,
  keptHeaders,
  mailCutoff,
  nameFromDomain,
  oneLineText,
  plainText,
  queueableEvents,
  threadIdFor,
  validatePayload,
  validateSetting,
  visibleColumns,
} from "@/lib/internal/inbound/rules";

const at = (n: number) => `2026-11-2${n}T10:00:00Z`;

describe("which leads are inbound", () => {
  it("needs an inbound source and an inbound stage", () => {
    expect(
      isInboundLead({ source: "inbound_call", stage: "call_booked" }),
    ).toBe(true);
    expect(isInboundLead({ source: "inbound_email", stage: "lead" })).toBe(
      true,
    );
    expect(isInboundLead({ source: "outbound", stage: "call_booked" })).toBe(
      false,
    );
    expect(isInboundLead({ source: "inbound_call", stage: "not_now" })).toBe(
      false,
    );
  });

  it("moves to call booked only from early stages", () => {
    expect(bookingMovesStage("lead")).toBe(true);
    expect(bookingMovesStage("call_booked")).toBe(true);
    expect(bookingMovesStage("proposal")).toBe(false);
    expect(bookingMovesStage("won")).toBe(false);
    expect(bookingMovesStage("lost")).toBe(false);
  });
});

describe("boardColumn", () => {
  it("follows the stage for proposal, won and lost", () => {
    expect(boardColumn("proposal", [])).toBe("proposal");
    expect(
      boardColumn("won", [
        { kind: "lead_created", status: "done", created_at: at(1) },
      ]),
    ).toBe("won");
    expect(boardColumn("lost", [])).toBe("lost");
  });

  it("is New until the first brief is done", () => {
    expect(boardColumn("call_booked", [])).toBe("new");
    expect(
      boardColumn("call_booked", [
        { kind: "lead_created", status: "queued", created_at: at(1) },
      ]),
    ).toBe("new");
    expect(
      boardColumn("call_booked", [
        { kind: "lead_created", status: "running", created_at: at(1) },
      ]),
    ).toBe("new");
    expect(
      boardColumn("call_booked", [
        { kind: "lead_created", status: "failed", created_at: at(1) },
      ]),
    ).toBe("new");
  });

  it("is Brief ready once the first brief is done", () => {
    expect(
      boardColumn("call_booked", [
        { kind: "lead_created", status: "done", created_at: at(1) },
      ]),
    ).toBe("brief_ready");
  });

  it("is Call done once notes or answers are in, whatever the agent has finished", () => {
    const events = [
      {
        kind: "lead_created" as const,
        status: "done" as const,
        created_at: at(1),
      },
      {
        kind: "call_notes_added" as const,
        status: "queued" as const,
        created_at: at(2),
      },
    ];
    expect(boardColumn("call_booked", events)).toBe("call_done");
    expect(
      boardColumn("replied", [
        ...events,
        { kind: "founder_answers", status: "done", created_at: at(3) },
      ]),
    ).toBe("call_done");
  });

  it("is not moved by replies, and uses the newest step", () => {
    const events = [
      {
        kind: "lead_created" as const,
        status: "done" as const,
        created_at: at(1),
      },
      {
        kind: "reply_received" as const,
        status: "done" as const,
        created_at: at(5),
      },
    ];
    expect(boardColumn("call_booked", events)).toBe("brief_ready");
    expect(
      boardColumn("call_booked", [
        { kind: "call_notes_added", status: "done", created_at: at(1) },
        { kind: "lead_created", status: "done", created_at: at(2) },
      ]),
    ).toBe("brief_ready");
  });

  it("is null for stages the board doesn't hold", () => {
    expect(boardColumn("contacted", [])).toBeNull();
    expect(boardColumn("not_now", [])).toBeNull();
  });

  it("hides Lost unless asked", () => {
    expect(visibleColumns(false).map((column) => column.key)).toEqual([
      "new",
      "brief_ready",
      "call_done",
      "proposal",
      "won",
    ]);
    expect(visibleColumns(true).map((column) => column.key)).toContain("lost");
  });
});

describe("what a person may queue", () => {
  it("depends on the stage", () => {
    expect(queueableEvents("call_booked")).toContain("call_notes_added");
    expect(canQueue("call_booked", "won")).toBe(false);
    expect(canQueue("proposal", "won")).toBe(true);
    expect(canQueue("lead", "call_notes_added")).toBe(false);
    expect(canQueue("won", "lost")).toBe(false);
    expect(queueableEvents("nonsense")).toEqual([]);
  });
});

describe("threadIdFor", () => {
  const id = "3F9A1C2B-0000-4000-8000-000000000001";

  it("is lead, the slug, and 8 hex characters of the id", () => {
    expect(threadIdFor({ id, name: "Acme Cloud, Inc." })).toBe(
      "lead-acme-cloud-inc-3f9a1c2b",
    );
  });

  it("cuts the slug to 40 characters", () => {
    const thread = threadIdFor({ id, name: "A".repeat(80) });
    expect(thread).toBe(`lead-${"a".repeat(40)}-3f9a1c2b`);
  });

  it("never ends the slug on a hyphen, and names an empty one lead", () => {
    const cut = threadIdFor({ id, name: `${"a".repeat(39)} b` });
    expect(cut).toBe(`lead-${"a".repeat(39)}-3f9a1c2b`);
    expect(threadIdFor({ id, name: "!!!" })).toBe("lead-lead-3f9a1c2b");
  });

  it("stays the same for the same row", () => {
    expect(threadIdFor({ id, name: "Acme" })).toBe(
      threadIdFor({ id, name: "Acme" }),
    );
  });
});

describe("company domains", () => {
  it("takes the domain of a work address", () => {
    expect(companyDomainFromEmail("Priya@Acme.dev")).toBe("acme.dev");
    expect(companyDomainFromEmail("a@www.acme.dev")).toBe("acme.dev");
    expect(companyDomainFromEmail("a@eng.acme.dev")).toBe("eng.acme.dev");
  });

  it("never turns a free-mail address into a company domain", () => {
    for (const address of [
      "a@gmail.com",
      "a@googlemail.com",
      "a@outlook.com",
      "a@hotmail.co.uk",
      "a@yahoo.co.in",
      "a@icloud.com",
      "a@proton.me",
      "a@protonmail.com",
      "a@pm.me",
      "a@live.com",
      "a@aol.com",
      "a@hey.com",
    ]) {
      expect(companyDomainFromEmail(address)).toBeNull();
    }
  });

  it("is null for anything that isn't an address", () => {
    expect(companyDomainFromEmail("not an email")).toBeNull();
    expect(companyDomainFromEmail("a@localhost")).toBeNull();
    expect(companyDomainFromEmail(42)).toBeNull();
    expect(companyDomainFromEmail("")).toBeNull();
  });

  it("makes a readable name from a domain", () => {
    expect(nameFromDomain("acme-cloud.dev")).toBe("Acme Cloud");
    expect(nameFromDomain("acme.dev")).toBe("Acme");
  });
});

describe("text from outside", () => {
  it("is cut to length and never longer", () => {
    expect(plainText("a".repeat(50), 10)).toHaveLength(10);
    expect(oneLineText("a  b\n\nc", 10)).toBe("a b c");
  });

  it("removes control and direction-changing characters, and keeps line breaks", () => {
    expect(plainText("hi\u0000 \u202Ethere\r\nnext\n\n\n\nend", 100)).toBe(
      "hi there\nnext\n\nend",
    );
  });

  it("leaves markup as text and never splits an emoji at the cut", () => {
    expect(plainText("<script>alert(1)</script>", 100)).toBe(
      "<script>alert(1)</script>",
    );
    expect(plainText("ab\u{1F600}", 3)).toBe("ab");
  });

  it("is empty for anything that isn't text", () => {
    expect(plainText({ a: 1 }, 10)).toBe("");
    expect(plainText(null, 10)).toBe("");
  });
});

describe("mail", () => {
  it("keeps only the headers the sorter uses", () => {
    const headers = keptHeaders({
      "Authentication-Results": "mx; dmarc=pass",
      "Auto-Submitted": "auto-replied",
      Received: "from somewhere",
      "X-Secret": "nope",
      "List-Unsubscribe": ["<mailto:u@x.com>", "<https://x.com/u>"],
    });
    expect(Object.keys(headers).sort()).toEqual(
      ["auto-submitted", "authentication-results", "list-unsubscribe"].sort(),
    );
    expect(headers["list-unsubscribe"]).toBe(
      "<mailto:u@x.com>, <https://x.com/u>",
    );
  });

  it("finds one header whatever its case", () => {
    expect(headerValue({ "Message-ID": "<a@b>" }, "message-id")).toBe("<a@b>");
    expect(
      headerValue([{ name: "message-id", value: "<c@d>" }], "Message-Id"),
    ).toBe("<c@d>");
    expect(headerValue(null, "message-id")).toBe("");
  });

  it("reads header lists too", () => {
    expect(
      keptHeaders([
        { name: "Precedence", value: "bulk" },
        { name: "To", value: "x" },
      ]),
    ).toEqual({ precedence: "bulk" });
  });

  it("cleans a mail for storing", () => {
    const mail = cleanMail({
      messageId: " <abc@mail.example.com> ",
      fromAddress: "Priya@Acme.dev",
      fromName: "Priya\u0000 Sharma",
      subject: "Hello\nthere",
      headers: { Precedence: "bulk", Received: "x" },
      bodyText: "Hi\n\n" + "word ".repeat(200),
    });
    expect(mail).not.toBeNull();
    expect(mail?.messageId).toBe("<abc@mail.example.com>");
    expect(mail?.fromAddress).toBe("priya@acme.dev");
    expect(mail?.fromName).toBe("Priya Sharma");
    expect(mail?.subject).toBe("Hello there");
    expect(mail?.headers).toEqual({ precedence: "bulk" });
    expect(mail?.excerpt.length).toBeLessThanOrEqual(300);
  });

  it("refuses mail with no sender address or id", () => {
    expect(cleanMail({ messageId: "x", fromAddress: "nobody" })).toBeNull();
    expect(cleanMail({ messageId: "", fromAddress: "a@b.co" })).toBeNull();
  });

  it("deletes mail older than 15 days", () => {
    expect(mailCutoff(new Date("2026-11-27T00:00:00Z"))).toBe(
      "2026-11-12T00:00:00.000Z",
    );
  });
});

describe("event payloads", () => {
  it("needs what the kind needs", () => {
    expect(validatePayload("call_notes_added", {}).ok).toBe(false);
    expect(validatePayload("call_notes_added", { notes: "  " }).ok).toBe(false);
    expect(validatePayload("founder_answers", { notes: "x" }).ok).toBe(false);
    expect(validatePayload("reply_received", {}).ok).toBe(false);
    expect(validatePayload("lost", {}).ok).toBe(false);
    expect(validatePayload("won", {}).ok).toBe(true);
    expect(validatePayload("proposal_sent", {}).ok).toBe(true);
    expect(validatePayload("lead_created", undefined).ok).toBe(true);
  });

  it("keeps only the known keys, as capped text", () => {
    const result = validatePayload("call_notes_added", {
      notes: "Good call",
      extra: "drop",
      answers: 5,
      contact_name: "Priya",
    });
    expect(result).toEqual({
      ok: true,
      payload: { notes: "Good call", contact_name: "Priya" },
    });
    const long = validatePayload("call_notes_added", {
      notes: "x".repeat(20_000),
    });
    expect(long.ok && long.payload.notes?.length).toBe(10_000);
  });

  it("checks the call time", () => {
    expect(
      validatePayload("lead_created", { call_at: "2026-11-30T10:00:00Z" }).ok,
    ).toBe(true);
    expect(validatePayload("lead_created", { call_at: "tomorrow" }).ok).toBe(
      false,
    );
  });

  it("refuses an unknown kind", () => {
    expect(validatePayload("send_invoice", {}).ok).toBe(false);
  });
});

describe("settings", () => {
  it("checks each setting's shape", () => {
    expect(validateSetting("sorter", { apply: true })).toEqual({
      ok: true,
      value: { apply: true },
    });
    expect(validateSetting("sorter", { apply: "yes" }).ok).toBe(false);
    expect(
      validateSetting("auto_start", { booking: false, mail: true }),
    ).toEqual({ ok: true, value: { booking: false, mail: true } });
    expect(validateSetting("auto_start", { booking: true }).ok).toBe(false);
    expect(
      validateSetting("house_rules", { rules: [" Never promise a date ", ""] }),
    ).toEqual({
      ok: true,
      value: { rules: ["Never promise a date"] },
    });
    expect(validateSetting("house_rules", { rules: "no" }).ok).toBe(false);
    expect(validateSetting("other", {}).ok).toBe(false);
  });
});
