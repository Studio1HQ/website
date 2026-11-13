import { describe, expect, it } from "vitest";
import { cleanNonce, parseSendAt, sendKey } from "@/lib/email-delivery";

const base = {
  sender: "priya@studio1hq.com",
  table: "job_applications",
  ids: ["b0000000-0000-4000-8000-000000000002", "a0000000-0000-4000-8000-000000000001"],
  subject: "Next step",
  body: "Hi {first_name}",
};

describe("sendKey", () => {
  it("is the same for the same send, whatever order the entries come in", () => {
    const key = sendKey(base);
    expect(key).toMatch(/^dash-[0-9a-f]{48}$/);
    expect(sendKey({ ...base, ids: [...base.ids].reverse() })).toBe(key);
    expect(sendKey({ ...base, ids: [...base.ids, base.ids[0].toUpperCase()] })).toBe(key);
    expect(sendKey({ ...base, sender: "Priya@Studio1HQ.com" })).toBe(key);
  });

  it("changes with anything that changes the email", () => {
    const key = sendKey(base);
    expect(sendKey({ ...base, sender: "amit@studio1hq.com" })).not.toBe(key);
    expect(sendKey({ ...base, table: "hackathon_registrations" })).not.toBe(key);
    expect(sendKey({ ...base, ids: [base.ids[0]] })).not.toBe(key);
    expect(sendKey({ ...base, subject: "Next step!" })).not.toBe(key);
    expect(sendKey({ ...base, body: "Hi" })).not.toBe(key);
    expect(sendKey({ ...base, extra: ["invite", null, "2026-11-20T10:00:00.000Z"] })).not.toBe(key);
  });

  it("changes with the composer's nonce, so a deliberate second send goes out", () => {
    expect(sendKey({ ...base, nonce: "abc12345-1" })).not.toBe(sendKey({ ...base, nonce: "abc12345-2" }));
    expect(sendKey({ ...base, nonce: "abc12345-1" })).toBe(sendKey({ ...base, nonce: "abc12345-1" }));
  });

  it("doesn't let one field run into the next", () => {
    expect(sendKey({ ...base, subject: "a", body: "bc" })).not.toBe(sendKey({ ...base, subject: "ab", body: "c" }));
  });
});

describe("cleanNonce", () => {
  it("keeps a short token and drops anything else", () => {
    expect(cleanNonce("m3x9k2a1-4f7h2k9q0z")).toBe("m3x9k2a1-4f7h2k9q0z");
    expect(cleanNonce("short")).toBeUndefined();
    expect(cleanNonce("has spaces in it")).toBeUndefined();
    expect(cleanNonce(42)).toBeUndefined();
    expect(cleanNonce("x".repeat(65))).toBeUndefined();
  });
});

describe("parseSendAt", () => {
  it("means now when nothing is set", () => {
    expect(parseSendAt(undefined)).toEqual({ ok: true });
    expect(parseSendAt("")).toEqual({ ok: true });
  });

  it("takes a time between a few minutes and 30 days ahead", () => {
    const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(parseSendAt(soon)).toEqual({ ok: true, at: soon });
    expect(parseSendAt(new Date(Date.now() - 1000).toISOString()).ok).toBe(false);
    expect(parseSendAt(new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()).ok).toBe(false);
    expect(parseSendAt("tomorrow-ish").ok).toBe(false);
    expect(parseSendAt(12345).ok).toBe(false);
  });
});
