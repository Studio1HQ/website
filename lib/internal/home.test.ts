import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { areasFor, homeFor } = await import("@/lib/internal/session");
type Staff = Parameters<typeof homeFor>[0];

const person = { email: "e@studio1hq.com", kind: "employee" } as Staff["person"];

function staff(over: Partial<Staff>): Staff {
  return {
    email: "x@studio1hq.com",
    roles: [],
    role: null,
    blog: null,
    community: null,
    status: "active",
    person: null,
    interns: [],
    ...over,
  } as Staff;
}

describe("where each person's dashboard starts", () => {
  it("gives admins the overview with every area", () => {
    const admin = staff({ roles: ["admin"], role: "admin", blog: "reviewer", community: "manager" });
    expect(homeFor(admin)).toBe("/internal");
    expect(areasFor(admin)).toEqual(["hiring", "blog", "community", "team", "money"]);
  });

  it("sends single-area people straight to their area", () => {
    expect(homeFor(staff({ roles: ["community_manager"], community: "manager" }))).toBe("/internal/community");
    expect(homeFor(staff({ roles: ["blog_writer"], blog: "writer" }))).toBe("/internal/blog");
    expect(homeFor(staff({ person }))).toBe("/internal/me");
    expect(homeFor(staff({ interns: ["i@studio1hq.com"] }))).toBe("/internal/people");
  });

  it("gives hiring staff and anyone with two areas the overview", () => {
    expect(homeFor(staff({ roles: ["hiring_viewer"], role: "viewer" }))).toBe("/internal");
    expect(homeFor(staff({ roles: ["community_manager"], community: "manager", person }))).toBe("/internal");
    expect(areasFor(staff({ roles: ["blog_writer"], blog: "writer", person }))).toEqual(["blog", "team"]);
  });

  it("keeps people with no way in on the pending page", () => {
    expect(homeFor(staff({ status: "pending" }))).toBe("/internal/pending");
  });
});
