import { describe, expect, it } from "vitest";
import { blogAccess, cleanRoles, hiringLevel, roleChangeProblem, rolesLabel } from "@/lib/internal/roles";

describe("roles", () => {
  it("gives admins everything", () => {
    expect(hiringLevel(["admin"])).toBe("admin");
    expect(blogAccess(["admin"])).toBe("reviewer");
    expect(rolesLabel(["admin", "blog_writer"])).toBe("Admin");
  });

  it("keeps hiring and blog roles separate", () => {
    expect(hiringLevel(["blog_reviewer"])).toBeNull();
    expect(blogAccess(["hiring_reviewer"])).toBeNull();
    expect(hiringLevel(["hiring_viewer", "blog_writer"])).toBe("viewer");
    expect(blogAccess(["hiring_viewer", "blog_writer"])).toBe("writer");
  });

  it("lets outside people be blog writers only", () => {
    expect(cleanRoles("writer@example.com", ["admin", "blog_reviewer", "blog_writer"])).toEqual(["blog_writer"]);
    expect(cleanRoles("someone@studio1hq.com", ["blog_writer", "admin"])).toEqual(["admin", "blog_writer"]);
  });

  it("lets admins give and take away roles, but not decide who's an admin or who's in", () => {
    const admin = { owner: false };
    const active = { status: "active", roles: ["hiring_viewer"] } as const;
    // Several roles at once, and taking one away.
    expect(roleChangeProblem(admin, active, { status: "active", roles: ["hiring_reviewer", "blog_writer"] })).toBeNull();
    expect(roleChangeProblem(admin, { status: "active", roles: ["hiring_viewer", "blog_writer"] }, { status: "active", roles: ["blog_writer"] })).toBeNull();
    // Approving someone who's waiting.
    expect(roleChangeProblem(admin, { status: "pending", roles: [] }, { status: "active", roles: ["community_viewer"] })).toBeNull();
    // The Admin role and other admins.
    expect(roleChangeProblem(admin, active, { status: "active", roles: ["admin"] })).toMatch(/make someone an admin/);
    expect(roleChangeProblem(admin, { status: "active", roles: ["admin"] }, { status: "active", roles: ["blog_writer"] })).toMatch(/an admin's roles/);
    // Who's in at all.
    expect(roleChangeProblem(admin, active, { status: "disabled", roles: ["hiring_viewer"] })).toMatch(/access off/);
    expect(roleChangeProblem(admin, { status: "pending", roles: [] }, { status: "disabled", roles: [] })).toMatch(/decline/);
    expect(roleChangeProblem(admin, { status: "disabled", roles: ["blog_writer"] }, { status: "active", roles: ["blog_writer"] })).toMatch(/back on/);
    // Owners can do all of it.
    const owner = { owner: true };
    expect(roleChangeProblem(owner, active, { status: "active", roles: ["admin"] })).toBeNull();
    expect(roleChangeProblem(owner, { status: "active", roles: ["admin"] }, { status: "disabled", roles: [] })).toBeNull();
  });

  it("drops unknown roles", () => {
    expect(cleanRoles("someone@studio1hq.com", ["owner", 5, "hiring_viewer"])).toEqual(["hiring_viewer"]);
    expect(cleanRoles("someone@studio1hq.com", "admin")).toEqual([]);
  });
});
