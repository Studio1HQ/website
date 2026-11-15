import { describe, expect, it } from "vitest";
import {
  ROLE_INFO,
  ROLE_KEYS,
  blogAccess,
  cleanRoles,
  clientAccess,
  communityAccess,
  hiringLevel,
  roleChangeProblem,
  rolesLabel,
} from "@/lib/internal/roles";

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

  it("gives client work its own roles, with admins as managers", () => {
    expect(clientAccess(["admin"])).toBe("manager");
    expect(clientAccess(["client_manager"])).toBe("manager");
    expect(clientAccess(["client_member"])).toBe("member");
    expect(clientAccess(["client_member", "client_manager"])).toBe("manager");
    expect(clientAccess(["community_manager", "blog_reviewer"])).toBeNull();
    expect(communityAccess(["client_manager"])).toBeNull();
    expect(hiringLevel(["client_manager"])).toBeNull();
    expect(ROLE_KEYS).toContain("client_manager");
    expect(ROLE_INFO.client_member.area).toBe("Clients");
    expect(rolesLabel(["client_manager", "blog_writer"])).toBe("Blog: own work · Clients: manage");
  });

  it("keeps client roles for staff only, and lets admins give them", () => {
    expect(cleanRoles("writer@example.com", ["client_member"])).toEqual([]);
    expect(cleanRoles("someone@studio1hq.com", ["client_member", "hiring_viewer"])).toEqual(["hiring_viewer", "client_member"]);
    expect(
      roleChangeProblem({ owner: false }, { status: "active", roles: ["blog_writer"] }, { status: "active", roles: ["client_manager"] }),
    ).toBeNull();
  });

  it("drops unknown roles", () => {
    expect(cleanRoles("someone@studio1hq.com", ["owner", 5, "hiring_viewer"])).toEqual(["hiring_viewer"]);
    expect(cleanRoles("someone@studio1hq.com", "admin")).toEqual([]);
  });
});

describe("roleChangeProblem: owners and other admins", () => {
  const owner = { owner: true };
  const admin = { owner: false };

  it("lets an owner make any change", () => {
    const changes = [
      [{ status: "active", roles: [] }, { status: "active", roles: ["tasks_viewer"] }],
      [{ status: "active", roles: ["tasks_viewer"] }, { status: "active", roles: [] }],
      [{ status: "active", roles: ["admin"] }, { status: "active", roles: ["blog_writer"] }],
      [{ status: "active", roles: [] }, { status: "active", roles: ["admin"] }],
      [{ status: "pending", roles: [] }, { status: "disabled", roles: [] }],
      [{ status: "active", roles: ["blog_writer"] }, { status: "disabled", roles: ["blog_writer"] }],
      [{ status: "disabled", roles: [] }, { status: "active", roles: ["tasks_viewer", "admin"] }],
    ] as const;
    for (const [current, next] of changes) expect(roleChangeProblem(owner, current, next)).toBeNull();
  });

  it("keeps the Admin role and admins' roles with the owners", () => {
    // Granting Admin.
    expect(
      roleChangeProblem(admin, { status: "active", roles: ["blog_writer"] }, { status: "active", roles: ["blog_writer", "admin"] }),
    ).toMatch(/make someone an admin/);
    // Approving a request as an admin.
    expect(roleChangeProblem(admin, { status: "pending", roles: [] }, { status: "active", roles: ["admin"] })).toMatch(
      /make someone an admin/,
    );
    // Taking Admin away.
    expect(roleChangeProblem(admin, { status: "active", roles: ["admin"] }, { status: "active", roles: [] })).toMatch(
      /an admin's roles/,
    );
    // Any other change to an admin, even one that keeps Admin.
    expect(
      roleChangeProblem(admin, { status: "active", roles: ["admin"] }, { status: "active", roles: ["admin", "client_member"] }),
    ).toMatch(/an admin's roles/);
  });

  it("keeps who's in with the owners", () => {
    expect(roleChangeProblem(admin, { status: "pending", roles: [] }, { status: "disabled", roles: [] })).toMatch(/decline/);
    expect(
      roleChangeProblem(admin, { status: "active", roles: ["client_member"] }, { status: "disabled", roles: ["client_member"] }),
    ).toMatch(/access off/);
    expect(
      roleChangeProblem(admin, { status: "disabled", roles: ["client_member"] }, { status: "active", roles: ["client_member"] }),
    ).toMatch(/back on/);
    expect(roleChangeProblem(admin, { status: "disabled", roles: [] }, { status: "active", roles: [] })).toMatch(/back on/);
  });

  it("keeps Team tasks: view with the owners", () => {
    expect(roleChangeProblem(admin, { status: "active", roles: [] }, { status: "active", roles: ["tasks_viewer"] })).toMatch(
      /team's tasks/,
    );
    expect(
      roleChangeProblem(admin, { status: "active", roles: ["tasks_viewer", "blog_writer"] }, { status: "active", roles: ["blog_writer"] }),
    ).toMatch(/team's tasks/);
    expect(
      roleChangeProblem(admin, { status: "pending", roles: [] }, { status: "active", roles: ["client_member", "tasks_viewer"] }),
    ).toMatch(/team's tasks/);
  });

  it("lets an admin change other roles around a tasks_viewer left as it was", () => {
    expect(
      roleChangeProblem(
        admin,
        { status: "active", roles: ["tasks_viewer"] },
        { status: "active", roles: ["client_member", "tasks_viewer"] },
      ),
    ).toBeNull();
    expect(
      roleChangeProblem(
        admin,
        { status: "active", roles: ["community_viewer", "tasks_viewer"] },
        { status: "active", roles: ["tasks_viewer"] },
      ),
    ).toBeNull();
    expect(
      roleChangeProblem(
        admin,
        { status: "active", roles: ["client_member", "community_viewer"] },
        { status: "active", roles: ["client_manager", "community_manager"] },
      ),
    ).toBeNull();
  });
});
