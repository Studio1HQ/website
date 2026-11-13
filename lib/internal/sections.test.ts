import { describe, expect, it } from "vitest";
import { communityAccess, hiringLevel, type RoleKey } from "@/lib/internal/roles";
import { SECTIONS, canExportSection, readableSections, sectionAccess } from "@/lib/internal/sections";

/** What the session derives from a set of roles. */
function viewer(...roles: RoleKey[]) {
  return { role: hiringLevel(roles), community: communityAccess(roles) };
}

describe("section access", () => {
  it("puts hackathon registrations under the community roles, not hiring", () => {
    expect(sectionAccess(viewer("community_manager"), SECTIONS.hackathons)).toBe("edit");
    expect(sectionAccess(viewer("community_viewer"), SECTIONS.hackathons)).toBe("read");
    expect(sectionAccess(viewer("hiring_reviewer"), SECTIONS.hackathons)).toBeNull();
    expect(sectionAccess(viewer("hiring_viewer"), SECTIONS.hackathons)).toBeNull();
    expect(sectionAccess(viewer("blog_writer"), SECTIONS.hackathons)).toBeNull();
  });

  it("keeps the hiring pipelines away from community staff", () => {
    for (const key of ["jobs", "cohort"] as const) {
      expect(sectionAccess(viewer("community_manager"), SECTIONS[key])).toBeNull();
      expect(sectionAccess(viewer("hiring_reviewer"), SECTIONS[key])).toBe("edit");
      expect(sectionAccess(viewer("hiring_viewer"), SECTIONS[key])).toBe("read");
    }
  });

  it("lets admins into everything, and only admins into the audiences", () => {
    expect(readableSections(viewer("admin"))).toEqual(["jobs", "hackathons", "cohort", "subscribers", "partner-pool"]);
    expect(readableSections(viewer("hiring_reviewer"))).toEqual(["jobs", "cohort"]);
    expect(readableSections(viewer("community_manager"))).toEqual(["hackathons"]);
    expect(readableSections(viewer("community_viewer", "hiring_viewer"))).toEqual(["jobs", "hackathons", "cohort"]);
    expect(sectionAccess(viewer("hiring_reviewer"), SECTIONS.subscribers)).toBeNull();
  });

  it("lets community managers export hackathon lists, and nothing else", () => {
    expect(canExportSection(viewer("community_manager"), SECTIONS.hackathons)).toBe(true);
    expect(canExportSection(viewer("community_viewer"), SECTIONS.hackathons)).toBe(false);
    expect(canExportSection(viewer("community_manager"), SECTIONS.jobs)).toBe(false);
    expect(canExportSection(viewer("hiring_reviewer"), SECTIONS.jobs)).toBe(false);
    expect(canExportSection(viewer("admin"), SECTIONS.jobs)).toBe(true);
    expect(canExportSection(viewer("admin"), SECTIONS.hackathons)).toBe(true);
  });
});
