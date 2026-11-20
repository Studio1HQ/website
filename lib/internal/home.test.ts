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
    clients: null,
    status: "active",
    person: null,
    interns: [],
    ...over,
  } as Staff;
}

describe("where each person's dashboard starts", () => {
  it("gives the founders the overview with every area, Money included", () => {
    const founder = staff({ email: "arindam@studio1hq.com", status: "owner", roles: ["admin"], role: "admin", blog: "reviewer", community: "manager", clients: "manager" });
    expect(homeFor(founder)).toBe("/");
    expect(areasFor(founder)).toEqual(["hiring", "blog", "community", "clients", "jobboard", "team", "money"]);
  });

  it("keeps Money from an admin who isn't a founder", () => {
    const admin = staff({ roles: ["admin"], role: "admin", blog: "reviewer", community: "manager", clients: "manager" });
    expect(homeFor(admin)).toBe("/");
    expect(areasFor(admin)).toEqual(["hiring", "blog", "community", "clients", "jobboard", "team"]);
    // The status alone isn't enough either: it has to be a founder's address.
    expect(areasFor(staff({ status: "owner", roles: ["admin"], role: "admin" }))).not.toContain("money");
  });

  it("sends single-area people straight to their area", () => {
    expect(homeFor(staff({ roles: ["community_manager"], community: "manager" }))).toBe("/community");
    expect(homeFor(staff({ roles: ["blog_writer"], blog: "writer" }))).toBe("/blog");
    expect(homeFor(staff({ roles: ["client_manager"], clients: "manager" }))).toBe("/clients");
    expect(homeFor(staff({ roles: ["client_member"], clients: "member" }))).toBe("/clients");
    expect(homeFor(staff({ roles: ["job_board_editor"] }))).toBe("/job-board");
    expect(homeFor(staff({ person }))).toBe("/me");
    expect(homeFor(staff({ interns: ["i@studio1hq.com"] }))).toBe("/people");
  });

  it("gives hiring staff and anyone with two areas the overview", () => {
    expect(homeFor(staff({ roles: ["hiring_viewer"], role: "viewer" }))).toBe("/");
    expect(homeFor(staff({ roles: ["community_manager"], community: "manager", person }))).toBe("/");
    expect(areasFor(staff({ roles: ["blog_writer"], blog: "writer", person }))).toEqual(["blog", "team"]);
    expect(homeFor(staff({ roles: ["client_member"], clients: "member", person }))).toBe("/");
    expect(areasFor(staff({ roles: ["community_viewer", "client_member"], community: "viewer", clients: "member" }))).toEqual([
      "community",
      "clients",
    ]);
  });

  it("keeps people with no way in on the pending page", () => {
    expect(homeFor(staff({ status: "pending" }))).toBe("/pending");
  });
});
