import { describe, expect, it } from "vitest";
import {
  AREAS,
  AREA_KEYS,
  AREA_LIST,
  EMPTY_GRID,
  PRESETS,
  ROLE_INFO,
  ROLE_KEYS,
  allowedLevels,
  areaAccess,
  blogAccess,
  can,
  cleanRoles,
  clientAccess,
  communityAccess,
  gridFromRoles,
  hiringLevel,
  isGrantedOnly,
  OWNER_ROLES,
  GRANTED_ONLY,
  presetAllowed,
  presetGrid,
  rolesFromGrid,
  rolesLabel,
  type AccessGrid,
  type RoleKey,
} from "@/lib/internal/roles";

const AREA_ROLES = ROLE_KEYS.filter((key) => key !== "admin");

/** Every subset of the roles. */
function everyCombination(): RoleKey[][] {
  const all: RoleKey[][] = [];
  for (let mask = 0; mask < 1 << ROLE_KEYS.length; mask++) {
    all.push(ROLE_KEYS.filter((_, i) => mask & (1 << i)));
  }
  return all;
}

/** At most one level per area: what the grid can hold. */
function oneLevelPerArea(roles: readonly RoleKey[]) {
  return AREA_LIST.every((area) => area.levels.filter((info) => roles.includes(info.role)).length <= 1);
}

/** Every grid row, Admin on and off. */
function everyGrid(): { grid: AccessGrid; admin: boolean }[] {
  let rows: AccessGrid[] = [{ ...EMPTY_GRID }];
  for (const area of AREA_LIST) {
    rows = rows.flatMap((row) => [null, ...area.levels.map((info) => info.level)].map((level) => ({ ...row, [area.key]: level })));
  }
  return rows.flatMap((grid) => [{ grid, admin: false }, { grid, admin: true }]);
}

describe("the access grid", () => {
  it("maps every role except Admin to exactly one area and level", () => {
    const behind = AREA_LIST.flatMap((area) => area.levels.map((info) => info.role));
    expect([...behind].sort()).toEqual([...AREA_ROLES].sort());
    for (const area of AREA_LIST) {
      for (const info of area.levels) {
        expect(info.description).toBe(ROLE_INFO[info.role].description);
        expect(ROLE_INFO[info.role].area).toBe(area.label);
      }
    }
    expect(AREAS.hiring.levels.map((info) => info.level)).toEqual(["view", "manage"]);
    expect(AREAS.blog.levels.map((info) => info.level)).toEqual(["own", "manage"]);
    expect(AREAS.community.levels.map((info) => info.level)).toEqual(["own", "manage"]);
    expect(AREAS.clients.levels.map((info) => info.level)).toEqual(["own", "manage"]);
  });

  it("round-trips every role combination", () => {
    for (const roles of everyCombination()) {
      const back = rolesFromGrid(gridFromRoles(roles), roles.includes("admin"));
      if (oneLevelPerArea(roles)) {
        expect(back).toEqual(roles);
      } else {
        // Both levels of an area held at once: the higher stays, which is
        // what they could already do.
        expect(back.length).toBeLessThan(roles.length);
      }
      // Either way, nobody's access changes.
      expect(hiringLevel(back)).toBe(hiringLevel(roles));
      expect(blogAccess(back)).toBe(blogAccess(roles));
      expect(communityAccess(back)).toBe(communityAccess(roles));
      expect(clientAccess(back)).toBe(clientAccess(roles));
      for (const area of AREA_KEYS) expect(areaAccess(back, area)).toBe(areaAccess(roles, area));
    }
  });

  it("round-trips every grid row", () => {
    for (const { grid, admin } of everyGrid()) {
      const roles = rolesFromGrid(grid, admin);
      expect(gridFromRoles(roles)).toEqual(grid);
      expect(roles.includes("admin")).toBe(admin);
      // Already in cleanRoles' order, with nothing for it to drop.
      expect(cleanRoles("someone@studio1hq.com", roles)).toEqual(roles);
    }
  });

  it("reads each area's level, with Admin as Manage everywhere", () => {
    expect(areaAccess([], "hiring")).toBeNull();
    expect(areaAccess(["hiring_viewer"], "hiring")).toBe("view");
    expect(areaAccess(["hiring_reviewer"], "hiring")).toBe("manage");
    expect(areaAccess(["hiring_viewer", "hiring_reviewer"], "hiring")).toBe("manage");
    expect(areaAccess(["blog_writer"], "blog")).toBe("own");
    expect(areaAccess(["blog_reviewer"], "blog")).toBe("manage");
    expect(areaAccess(["community_viewer"], "community")).toBe("own");
    expect(areaAccess(["community_manager"], "community")).toBe("manage");
    expect(areaAccess(["client_member"], "clients")).toBe("own");
    expect(areaAccess(["client_manager"], "clients")).toBe("manage");
    for (const area of AREA_KEYS) {
      expect(areaAccess(["admin"], area)).toBe(isGrantedOnly(area) ? null : AREAS[area].levels.at(-1)?.level);
    }
    expect(areaAccess(["admin"], "clients")).toBe("manage");
    expect(areaAccess(["admin"], "tasks")).toBe("view");
    expect(areaAccess(["tasks_viewer"], "tasks")).toBe("view");
    expect(can(["tasks_viewer"], "clients", "own")).toBe(false);
    // Areas don't leak into each other.
    expect(areaAccess(["blog_reviewer", "client_manager"], "hiring")).toBeNull();
    expect(areaAccess(["hiring_reviewer"], "community")).toBeNull();
    // gridFromRoles shows what's stored, not what Admin implies.
    expect(gridFromRoles(["admin"])).toEqual(EMPTY_GRID);
  });

  it("opens Outreach, Influencers, Social growth and Inbound only with their own role, Admin or not", () => {
    expect([...GRANTED_ONLY]).toEqual(["outreach", "influencers", "socials", "inbound"]);
    for (const area of GRANTED_ONLY) {
      const role = AREAS[area].levels[0].role;
      expect(areaAccess(["admin"], area)).toBeNull();
      expect(can(["admin", "client_manager", "community_manager"], area, "manage")).toBe(false);
      expect(areaAccess([role], area)).toBe("manage");
      expect(areaAccess(["admin", role], area)).toBe("manage");
      // One doesn't open another.
      for (const other of GRANTED_ONLY) if (other !== area) expect(areaAccess([role], other)).toBeNull();
      // And none opens anything else.
      for (const other of AREA_KEYS) if (!isGrantedOnly(other)) expect(areaAccess([role], other)).toBeNull();
    }
  });

  it("opens the DevRel jobs board with its own role or Admin, and nothing else with it", () => {
    expect(areaAccess(["job_board_editor"], "jobboard")).toBe("manage");
    expect(areaAccess(["admin"], "jobboard")).toBe("manage");
    expect(areaAccess(["community_manager"], "jobboard")).toBeNull();
    for (const other of AREA_KEYS) if (other !== "jobboard") expect(areaAccess(["job_board_editor"], other)).toBeNull();
    expect(gridFromRoles(["job_board_editor"])).toEqual({ ...EMPTY_GRID, jobboard: "manage" });
    expect(rolesFromGrid({ ...EMPTY_GRID, community: "manage", jobboard: "manage" }, false)).toEqual([
      "community_manager",
      "job_board_editor",
    ]);
  });

  it("gives the founders every area", () => {
    for (const area of AREA_KEYS) expect(areaAccess(OWNER_ROLES, area)).toBe(AREAS[area].levels.at(-1)?.level);
  });

  it("names the given-one-by-one areas next to Admin", () => {
    expect(rolesLabel(["admin"])).toBe("Admin");
    expect(rolesLabel(["admin", "outreach_manager", "socials_manager"])).toBe("Admin · Outreach · Social growth");
    expect(rolesLabel(["influencer_manager", "blog_writer"])).toBe("Blog: own work · Influencers: manage");
  });

  it("orders levels: no access, then View or Own work, then Manage", () => {
    expect(can([], "hiring", "view")).toBe(false);
    expect(can(["hiring_viewer"], "hiring", "view")).toBe(true);
    expect(can(["hiring_viewer"], "hiring", "manage")).toBe(false);
    expect(can(["hiring_reviewer"], "hiring", "view")).toBe(true);
    expect(can(["hiring_reviewer"], "hiring", "manage")).toBe(true);
    for (const area of ["blog", "community", "clients"] as const) {
      const [own, manage] = AREAS[area].levels.map((info) => info.role);
      expect(can([], area, "own")).toBe(false);
      expect(can([own], area, "own")).toBe(true);
      expect(can([own], area, "manage")).toBe(false);
      expect(can([manage], area, "own")).toBe(true);
      expect(can([manage], area, "manage")).toBe(true);
      expect(can(["admin"], area, "manage")).toBe(true);
    }
    expect(can(["admin"], "hiring", "manage")).toBe(true);
  });

  it("keeps the named checks matching the grid", () => {
    expect(hiringLevel(["admin"])).toBe("admin");
    expect(hiringLevel(["hiring_reviewer"])).toBe("reviewer");
    expect(hiringLevel(["hiring_viewer"])).toBe("viewer");
    expect(blogAccess(["blog_writer"])).toBe("writer");
    expect(communityAccess(["community_viewer"])).toBe("viewer");
    expect(clientAccess(["client_member"])).toBe("member");
  });

  it("holds outside addresses to Blog: own work", () => {
    const outside = "writer@example.com";
    expect(allowedLevels(outside, "blog")).toEqual(["own"]);
    for (const area of ["hiring", "community", "clients", "outreach", "influencers", "socials", "inbound", "jobboard"] as const) {
      expect(allowedLevels(outside, area)).toEqual([]);
    }
    expect(allowedLevels("someone@studio1hq.com", "hiring")).toEqual(["view", "manage"]);
    const everything: AccessGrid = {
      hiring: "manage",
      blog: "own",
      community: "manage",
      clients: "manage",
      tasks: "view",
      outreach: "manage",
      influencers: "manage",
      socials: "manage",
      inbound: "manage",
      jobboard: "manage",
    };
    const clean = cleanRoles(outside, rolesFromGrid(everything, true));
    expect(clean).toEqual(["blog_writer"]);
    expect(gridFromRoles(clean)).toEqual({ ...EMPTY_GRID, blog: "own" });
    // Blog: manage isn't open to them, so it's dropped, not turned into own work.
    expect(cleanRoles(outside, rolesFromGrid({ ...EMPTY_GRID, blog: "manage" }, false))).toEqual([]);
    for (const preset of PRESETS) {
      expect(presetAllowed(outside, preset)).toBe(preset.key === "writer");
      expect(presetAllowed("someone@studio1hq.com", preset)).toBe(true);
    }
  });

  it("fills a row from a preset", () => {
    const writer = PRESETS.find((preset) => preset.key === "writer")!;
    expect(rolesFromGrid(presetGrid(writer), false)).toEqual(["blog_writer"]);
    const intern = PRESETS.find((preset) => preset.key === "community_intern")!;
    expect(rolesFromGrid(presetGrid(intern), false)).toEqual(["community_viewer"]);
    const team = PRESETS.find((preset) => preset.key === "client_team")!;
    expect(rolesFromGrid(presetGrid(team), false)).toEqual(["client_member"]);
  });

  it("ignores a level an area doesn't have", () => {
    // Team tasks has only View; Hiring has View, not Own work; Blog has Own work, not View.
    expect(AREAS.tasks.levels.map((info) => info.level)).toEqual(["view"]);
    const odd = (grid: Record<string, string>) => grid as unknown as Partial<AccessGrid>;
    expect(rolesFromGrid(odd({ tasks: "manage" }), false)).toEqual([]);
    expect(rolesFromGrid(odd({ tasks: "own" }), false)).toEqual([]);
    expect(rolesFromGrid(odd({ hiring: "own" }), false)).toEqual([]);
    expect(rolesFromGrid(odd({ blog: "view" }), false)).toEqual([]);
    expect(rolesFromGrid(odd({ clients: "admin" }), false)).toEqual([]);
    expect(rolesFromGrid(odd({ tasks: "manage", clients: "own" }), false)).toEqual(["client_member"]);
    expect(rolesFromGrid(odd({ tasks: "manage" }), true)).toEqual(["admin"]);
  });

  it("labels a row in grid terms", () => {
    expect(rolesLabel([])).toBe("No access");
    expect(rolesLabel(["admin", "blog_writer"])).toBe("Admin");
    expect(rolesLabel(["hiring_viewer"])).toBe("Hiring: view");
    expect(rolesLabel(["community_viewer", "hiring_reviewer"])).toBe("Hiring: manage · Community: own work");
  });
});
