import { beforeAll, describe, expect, it } from "vitest";
import {
  SESSION_MAX_SECONDS,
  SESSION_RENEW_AFTER_SECONDS,
  SESSION_TTL_SECONDS,
  authSecret,
  emailAddress,
  readSession,
  renewedSession,
  safeNext,
  signToken,
  staffEmail,
  verifyToken,
} from "@/lib/internal/token";

describe("staff addresses", () => {
  it("takes a plain address on the staff domain, lowercased", () => {
    expect(staffEmail(" Priya@Studio1HQ.com ")).toBe("priya@studio1hq.com");
  });

  it("refuses a +tag: it reaches the same inbox but would be a new member", () => {
    expect(staffEmail("priya+x@studio1hq.com")).toBeNull();
    // Still an address, so an admin could invite it on purpose.
    expect(emailAddress("priya+x@studio1hq.com")).toBe("priya+x@studio1hq.com");
  });

  it("refuses other domains and lookalikes", () => {
    expect(staffEmail("priya@gmail.com")).toBeNull();
    expect(staffEmail("priya@studio1hq.com.evil.com")).toBeNull();
    expect(staffEmail("priya@evil.com@studio1hq.com")).toBeNull();
    expect(staffEmail("priya@studio1hq.com.")).toBeNull();
  });
});

describe("where to go after signing in", () => {
  it("only ever a dashboard path", () => {
    expect(safeNext("/tasks?view=week")).toBe("/tasks?view=week");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com/internal")).toBe("/");
    expect(safeNext("/../api")).toBe("/");
    expect(safeNext("/login")).toBe("/");
    expect(safeNext("/auth/callback")).toBe("/");
    expect(safeNext("/api/cron/x")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext(undefined)).toBe("/");
  });

  it("turns an old /internal link into its dashboard address", () => {
    expect(safeNext("/internal/tasks?view=week")).toBe("/tasks?view=week");
    expect(safeNext("/internal")).toBe("/");
    expect(safeNext("/internal/login")).toBe("/");
  });
});

describe("a session in use stays alive", () => {
  const DAY = 60 * 60 * 24;
  const now = Math.floor(Date.now() / 1000);
  const email = "nancy@studio1hq.com";
  let secret = "";
  beforeAll(() => {
    process.env.INTERNAL_AUTH_SECRET = "a-test-secret-that-is-long-enough-0123456789";
    secret = authSecret()!;
  });
  const session = (iat: number, extra: { since?: number; exp?: number } = {}) =>
    signToken({ email, iat, exp: extra.exp ?? iat + SESSION_TTL_SECONDS, ...(extra.since ? { since: extra.since } : {}) }, secret);

  it("leaves a session from the last day alone", async () => {
    expect(await renewedSession(await session(now - SESSION_RENEW_AFTER_SECONDS + 60), now)).toBeNull();
  });

  it("gives a session a day old a fresh week, for the same person", async () => {
    const renewed = await renewedSession(await session(now - 3 * DAY), now);
    expect(renewed?.maxAge).toBe(SESSION_TTL_SECONDS);
    expect(await readSession(renewed?.session)).toBe(email);
    const payload = await verifyToken(renewed?.session, secret);
    expect(payload).toMatchObject({ iat: now, exp: now + SESSION_TTL_SECONDS, since: now - 3 * DAY });
  });

  it("never runs past thirty days from the sign-in", async () => {
    const since = now - SESSION_MAX_SECONDS + 2 * DAY;
    const renewed = await renewedSession(await session(now - 2 * DAY, { since, exp: now + DAY }), now);
    expect(renewed?.maxAge).toBe(2 * DAY);
    // At the cap there's nothing left to add: it runs out and they sign in again.
    const last = await session(now - 2 * DAY, { since: now - SESSION_MAX_SECONDS + DAY, exp: now + DAY });
    expect(await renewedSession(last, now)).toBeNull();
  });

  it("doesn't renew a session that has run out or was tampered with", async () => {
    expect(await renewedSession(await session(now - 8 * DAY), now)).toBeNull();
    expect(await renewedSession(`${await session(now - 3 * DAY)}x`, now)).toBeNull();
    expect(await renewedSession(undefined, now)).toBeNull();
  });
});
