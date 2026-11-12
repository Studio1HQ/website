import { describe, expect, it } from "vitest";
import { blogAccess, cleanRoles, hiringLevel, rolesLabel } from "@/lib/internal/roles";

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

  it("drops unknown roles", () => {
    expect(cleanRoles("someone@studio1hq.com", ["owner", 5, "hiring_viewer"])).toEqual(["hiring_viewer"]);
    expect(cleanRoles("someone@studio1hq.com", "admin")).toEqual([]);
  });
});
