import { describe, expect, it } from "vitest";
import { emailAddress, safeNext, staffEmail } from "@/lib/internal/token";

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
