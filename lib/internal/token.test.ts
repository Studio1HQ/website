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
    expect(safeNext("/internal/tasks?view=week")).toBe("/internal/tasks?view=week");
    expect(safeNext("//evil.com")).toBe("/internal");
    expect(safeNext("https://evil.com/internal")).toBe("/internal");
    expect(safeNext("/internal/../api")).toBe("/internal");
    expect(safeNext("/internal/login")).toBe("/internal");
  });
});
