import { describe, expect, it } from "vitest";
import { ENGAGEMENT_TYPES } from "@/lib/internal/clients/schema";
import { projectName, projectPath, projectTitle } from "@/lib/internal/clients/projects";

describe("projectName", () => {
  it("drops the company from the engagement's name", () => {
    expect(projectName({ name: "Nebius Token Factory DevRel", type: "devrel_retainer" }, "Nebius Token Factory")).toBe("DevRel");
    expect(projectName({ name: "Trina-Launch", type: "launch_content" }, "Trina")).toBe("Launch");
    expect(projectName({ name: "SearchApi Blog Program", type: "blogs_only" }, "SearchApi")).toBe("Blog Program");
  });

  it("keeps a name that doesn't start with the company, and falls back to the type", () => {
    expect(projectName({ name: "Blogs", type: "blogs_only" }, "Acme")).toBe("Blogs");
    expect(projectName({ name: "Jozu", type: "devrel_retainer" }, "Jozu", ENGAGEMENT_TYPES)).toBe("DevRel retainer");
  });
});

describe("projectTitle and projectPath", () => {
  it("names the month", () => {
    expect(projectTitle({ name: "Jozu DevRel", type: "devrel_retainer" }, "Jozu", "2026-11")).toBe("DevRel · November 2026");
  });

  it("links the month, with the engagement and the report only when asked", () => {
    expect(projectPath("nebius", "2026-11")).toBe("/clients/nebius/2026-11");
    expect(projectPath("nebius", "2026-11", { engagement: "e1", view: "report" })).toBe("/clients/nebius/2026-11?e=e1&view=report");
  });
});
