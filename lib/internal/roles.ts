/**
 * Who can do what in the internal dashboard. Plain data, safe for client
 * components.
 *
 * A person can hold several roles (internal_members.roles):
 *
 *   admin            everything: the team and invites, exports, the
 *                    subscriber and partner lists, every pipeline, the blog
 *   hiring_reviewer  change status, tags and notes on job and cohort
 *                    applications; email applicants
 *   hiring_viewer    read the job and cohort pipelines (résumés included)
 *   blog_reviewer    see every blog post, edit, comment, request changes,
 *                    approve and publish
 *   blog_writer      write their own posts and ask for a review. Nothing else:
 *                    no applicant data, no other people's drafts
 *   community_manager  run the community area: events, guest lists, sponsors,
 *                    campus partners, budget, tasks and growth numbers, and
 *                    hackathon registrations (review, email, export)
 *   community_viewer the community intern: read the community area and
 *                    hackathon registrations with every money detail left
 *                    out (sponsorship amounts, budgets, costs), and see and
 *                    tick off only the tasks assigned to them
 *   client_manager   run client work: clients, engagements, monthly scope,
 *                    every deliverable, templates, capacity, the invoice flag
 *   client_member    read client work; add deliverables and move along (status,
 *                    links, dates, blocked) the ones they own or review
 *   tasks_viewer     the founder's associate: see everyone's tasks, work logs
 *                    and weeks (Tasks), the founders' included, and give
 *                    people tasks. Everyone on the team list sees their own
 *                    without a role.
 *
 * The team page shows these as one access grid (AREAS below): every role
 * but Admin is one level in one area, so a person is a row with a level per
 * area plus the Admin switch. The grid is a view over the same stored roles
 * (gridFromRoles / rolesFromGrid); checks go through areaAccess and can.
 *
 * Money (payroll, expense claims, payments) isn't a role: it's the owners'
 * only (canSeeMoney in lib/internal/session.ts).
 *
 * The owners are always admins and can't be changed. Staff (@studio1hq.com)
 * ask for access when they first sign in. Any admin can give and take away
 * roles: approve someone who's waiting, or change what a teammate has
 * (app/internal/(dashboard)/team). What stays with the owners
 * (roleChangeProblem): the Admin role itself, anything about another admin,
 * declining, turning access off or back on, and invites. Anyone outside
 * @studio1hq.com can only be invited by an owner, and only as a blog writer.
 */

export const STAFF_DOMAIN = "studio1hq.com";

export const OWNERS = ["arindam@studio1hq.com", "amitesh@studio1hq.com"] as const;

export const ROLE_KEYS = [
  "admin",
  "hiring_reviewer",
  "hiring_viewer",
  "blog_reviewer",
  "blog_writer",
  "community_manager",
  "community_viewer",
  "client_manager",
  "client_member",
  "tasks_viewer",
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_INFO: Record<
  RoleKey,
  { label: string; area: "All" | "Hiring" | "Blog" | "Community" | "Clients" | "Team tasks"; description: string }
> = {
  admin: {
    label: "Admin",
    area: "All",
    description:
      "Everything except Money: the team list, exports, subscriber lists, every pipeline, the blog, community and client work. Payroll and payments stay with the founders.",
  },
  hiring_reviewer: {
    label: "Hiring reviewer",
    area: "Hiring",
    description: "Review job and cohort applications: change status, tags and notes, and email applicants.",
  },
  hiring_viewer: {
    label: "Hiring viewer",
    area: "Hiring",
    description: "Read the job and cohort applications. No changes.",
  },
  blog_reviewer: {
    label: "Blog reviewer",
    area: "Blog",
    description: "See every post, edit, comment, request changes, approve and publish.",
  },
  blog_writer: {
    label: "Blog writer",
    area: "Blog",
    description: "Write their own posts and ask for a review. Can't see anything else.",
  },
  community_manager: {
    label: "Community manager",
    area: "Community",
    description:
      "Run the community area: events, hackathon registrations, guest lists, sponsors (amounts included), campus partners, budget, tasks and analytics.",
  },
  community_viewer: {
    label: "Community intern",
    area: "Community",
    description:
      "Read the community area and hackathon registrations, without any money details (sponsorship amounts, budgets, costs), and tick off the tasks assigned to them. No other changes.",
  },
  client_manager: {
    label: "Client manager",
    area: "Clients",
    description:
      "Run client work: clients, engagements, each month's scope, every deliverable, scope templates, people's capacity and the invoice flag.",
  },
  client_member: {
    label: "Client team",
    area: "Clients",
    description:
      "See all client work. Add deliverables, and change status, links, dates and the blocked flag on the ones they own or review.",
  },
  tasks_viewer: {
    label: "Team tasks viewer",
    area: "Team tasks",
    description:
      "See everyone's tasks, work logs and weeks, the founders' included, and give people tasks. Reports stay with the founders.",
  },
};

/** The only role someone outside @studio1hq.com can have. */
export const OUTSIDE_ROLES: readonly RoleKey[] = ["blog_writer"];

/**
 * The application pipelines' access levels, which most dashboard pages
 * check (requireStaff). Derived from the roles above.
 */
export const ROLES = ["admin", "reviewer", "viewer"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = { viewer: 1, reviewer: 2, admin: 3 };

export function atLeast(role: Role | null | undefined, minimum: Role) {
  return role ? RANK[role] >= RANK[minimum] : false;
}

/* ------------------------------------------------------------------ grid */

/**
 * The access grid: every role above except Admin is one level in one area,
 * so a person's roles read as a row (Hiring, Blog, Community, Clients) with a
 * level in each cell, plus the Admin switch. Same stored roles, new view.
 *
 *   hiring     View = hiring_viewer        Manage = hiring_reviewer
 *   blog       Own work = blog_writer      Manage = blog_reviewer
 *   community  Own work = community_viewer Manage = community_manager
 *   clients    Own work = client_member    Manage = client_manager
 *   tasks      View = tasks_viewer (one level: everyone sees their own
 *              tasks without it; the founders see everyone's)
 */
export const AREA_KEYS = ["hiring", "blog", "community", "clients", "tasks"] as const;
export type AreaKey = (typeof AREA_KEYS)[number];

/** The levels each area really has, lowest first. */
export type AreaLevels = {
  hiring: "view" | "manage";
  blog: "own" | "manage";
  community: "own" | "manage";
  clients: "own" | "manage";
  tasks: "view";
};
export type AreaLevel<A extends AreaKey = AreaKey> = AreaLevels[A];

/** One person's row: a level per area, or null for no access there. */
export type AccessGrid = { [A in AreaKey]: AreaLevels[A] | null };

export type LevelInfo<A extends AreaKey = AreaKey> = {
  level: AreaLevels[A];
  label: string;
  /** The stored role behind this level. */
  role: RoleKey;
  description: string;
};

export type AreaInfo<A extends AreaKey = AreaKey> = {
  key: A;
  label: string;
  /** Lowest first. */
  levels: readonly LevelInfo<A>[];
};

export const LEVEL_LABELS: Record<AreaLevel, string> = { view: "View", own: "Own work", manage: "Manage" };

/** Level order: no access, then View or Own work (an area has one of the two), then Manage. */
const LEVEL_RANK: Record<AreaLevel, number> = { view: 1, own: 1, manage: 2 };

function level<A extends AreaKey>(level: AreaLevels[A], role: RoleKey): LevelInfo<A> {
  return { level, label: LEVEL_LABELS[level], role, description: ROLE_INFO[role].description };
}

export const AREAS: { [A in AreaKey]: AreaInfo<A> } = {
  hiring: {
    key: "hiring",
    label: "Hiring",
    levels: [level<"hiring">("view", "hiring_viewer"), level<"hiring">("manage", "hiring_reviewer")],
  },
  blog: {
    key: "blog",
    label: "Blog",
    levels: [level<"blog">("own", "blog_writer"), level<"blog">("manage", "blog_reviewer")],
  },
  community: {
    key: "community",
    label: "Community",
    levels: [level<"community">("own", "community_viewer"), level<"community">("manage", "community_manager")],
  },
  clients: {
    key: "clients",
    label: "Clients",
    levels: [level<"clients">("own", "client_member"), level<"clients">("manage", "client_manager")],
  },
  tasks: {
    key: "tasks",
    label: "Team tasks",
    levels: [level<"tasks">("view", "tasks_viewer")],
  },
};

/** The areas in column order. */
export const AREA_LIST: readonly AreaInfo[] = AREA_KEYS.map((key) => AREAS[key] as AreaInfo);

export const EMPTY_GRID: AccessGrid = { hiring: null, blog: null, community: null, clients: null, tasks: null };

/** The highest level of this area whose role is in the list, ignoring Admin. */
function heldLevel<A extends AreaKey>(roles: readonly RoleKey[], area: A): AreaLevels[A] | null {
  const levels = AREAS[area].levels as readonly LevelInfo<A>[];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (roles.includes(levels[i].role)) return levels[i].level;
  }
  return null;
}

/**
 * The grid row for a set of roles, as stored: Admin isn't in it (see
 * rolesFromGrid). Someone holding both levels of an area shows the higher,
 * which is what they could already do.
 */
export function gridFromRoles(roles: readonly RoleKey[]): AccessGrid {
  return {
    hiring: heldLevel(roles, "hiring"),
    blog: heldLevel(roles, "blog"),
    community: heldLevel(roles, "community"),
    clients: heldLevel(roles, "clients"),
    tasks: heldLevel(roles, "tasks"),
  };
}

/** The stored roles for a grid row and the Admin switch, in ROLE_KEYS order. */
export function rolesFromGrid(grid: Partial<AccessGrid>, admin: boolean): RoleKey[] {
  const wanted = new Set<RoleKey>(admin ? ["admin"] : []);
  for (const area of AREA_LIST) {
    const chosen = grid[area.key];
    const info = area.levels.find((item) => item.level === chosen);
    if (info) wanted.add(info.role);
  }
  return ROLE_KEYS.filter((key) => wanted.has(key));
}

/**
 * What someone can do in an area: Admin counts as the area's top level
 * everywhere (Manage; View in Team tasks, which has only that). Null for
 * nothing.
 */
export function areaAccess<A extends AreaKey>(roles: readonly RoleKey[], area: A): AreaLevels[A] | null {
  if (roles.includes("admin")) {
    const levels = AREAS[area].levels as readonly LevelInfo<A>[];
    return levels[levels.length - 1].level;
  }
  return heldLevel(roles, area);
}

/** Whether these roles reach at least this level in this area. */
export function can<A extends AreaKey>(roles: readonly RoleKey[], area: A, minimum: AreaLevels[A]): boolean {
  const held = areaAccess(roles, area);
  return held !== null && LEVEL_RANK[held] >= LEVEL_RANK[minimum];
}

/** The level info for one cell, or undefined for no access. */
export function levelInfo<A extends AreaKey>(area: A, value: AreaLevels[A] | null): LevelInfo<A> | undefined {
  return (AREAS[area].levels as readonly LevelInfo<A>[]).find((item) => item.level === value);
}

/**
 * The levels an address may hold in an area. Staff can have any; outside
 * addresses only what OUTSIDE_ROLES allows (Blog: own work).
 */
export function allowedLevels<A extends AreaKey>(email: string, area: A): AreaLevels[A][] {
  const outside = !isStaffEmail(email);
  return (AREAS[area].levels as readonly LevelInfo<A>[])
    .filter((item) => !outside || OUTSIDE_ROLES.includes(item.role))
    .map((item) => item.level);
}

export type Preset = { key: string; label: string; description: string; grid: Partial<AccessGrid> };

/** Common rows. Picking one replaces the whole row (Admin isn't touched). */
export const PRESETS: readonly Preset[] = [
  { key: "writer", label: "Writer", description: "Writes their own blog posts.", grid: { blog: "own" } },
  { key: "blog_editor", label: "Blog editor", description: "Reviews and publishes every post.", grid: { blog: "manage" } },
  {
    key: "hiring_reviewer",
    label: "Hiring reviewer",
    description: "Reviews job and cohort applications.",
    grid: { hiring: "manage" },
  },
  {
    key: "community_intern",
    label: "Community intern",
    description: "Reads the community area without money details.",
    grid: { community: "own" },
  },
  {
    key: "community_manager",
    label: "Community manager",
    description: "Runs the community area.",
    grid: { community: "manage" },
  },
  { key: "client_team", label: "Client team", description: "Works on client deliverables.", grid: { clients: "own" } },
  { key: "client_manager", label: "Client manager", description: "Runs client work.", grid: { clients: "manage" } },
  {
    key: "founders_associate",
    label: "Founder's associate",
    description: "Sees everyone's tasks and weeks, founders' included, and gives tasks.",
    grid: { tasks: "view" },
  },
];

/** A preset as a full row. */
export function presetGrid(preset: Preset): AccessGrid {
  return { ...EMPTY_GRID, ...preset.grid };
}

/** Whether every cell of a preset is open to this address. */
export function presetAllowed(email: string, preset: Preset) {
  return AREA_KEYS.every((area) => {
    const value = preset.grid[area];
    return !value || (allowedLevels(email, area) as AreaLevel[]).includes(value);
  });
}

/* ------------------------------------------------- per-area access, by name */

/** The pipelines level a set of roles gives, or null for none. */
export function hiringLevel(roles: readonly RoleKey[]): Role | null {
  if (roles.includes("admin")) return "admin";
  const held = areaAccess(roles, "hiring");
  return held === "manage" ? "reviewer" : held === "view" ? "viewer" : null;
}

export type BlogAccess = "reviewer" | "writer";

/** What a set of roles may do on the blog, or null for nothing. */
export function blogAccess(roles: readonly RoleKey[]): BlogAccess | null {
  const held = areaAccess(roles, "blog");
  return held === "manage" ? "reviewer" : held === "own" ? "writer" : null;
}

export type CommunityAccess = "manager" | "viewer";

/** What a set of roles may do in the community area, or null for nothing. */
export function communityAccess(roles: readonly RoleKey[]): CommunityAccess | null {
  const held = areaAccess(roles, "community");
  return held === "manage" ? "manager" : held === "own" ? "viewer" : null;
}

export type ClientsAccess = "manager" | "member";

/** What a set of roles may do in client work, or null for nothing. */
export function clientAccess(roles: readonly RoleKey[]): ClientsAccess | null {
  const held = areaAccess(roles, "clients");
  return held === "manage" ? "manager" : held === "own" ? "member" : null;
}

export function isOwner(email: string) {
  return (OWNERS as readonly string[]).includes(email.toLowerCase());
}

export function isStaffEmail(email: string) {
  return email.toLowerCase().endsWith(`@${STAFF_DOMAIN}`);
}

export function isRoleKey(value: unknown): value is RoleKey {
  return typeof value === "string" && (ROLE_KEYS as readonly string[]).includes(value);
}

/**
 * Why this admin can't make this change to someone's access, or null when
 * they can. Owners can do anything. Other admins give and take away roles
 * only: not the Admin role, not another admin's roles, and not who is in at
 * all (declining, turning access off or back on).
 */
export function roleChangeProblem(
  actor: { owner: boolean },
  current: { status: "pending" | "active" | "disabled"; roles: readonly RoleKey[] },
  next: { status: "active" | "disabled"; roles: readonly RoleKey[] },
): string | null {
  if (actor.owner) return null;
  const founders = "Arindam or Amitesh";
  if (next.status === "disabled") {
    return current.status === "pending"
      ? `Only ${founders} can decline a request.`
      : `Only ${founders} can turn someone's access off.`;
  }
  if (current.status === "disabled") return `Only ${founders} can turn someone's access back on.`;
  if (current.roles.includes("admin")) return `Only ${founders} can change an admin's roles.`;
  if (next.roles.includes("admin")) return `Only ${founders} can make someone an admin.`;
  // Team tasks: view shows the founders' and admins' work, which an admin
  // can't see themselves, so it isn't theirs to hand out or take away.
  if (current.roles.includes("tasks_viewer") !== next.roles.includes("tasks_viewer"))
    return `Only ${founders} can change who sees the team's tasks.`;
  return null;
}

/**
 * Valid, de-duplicated roles for this address, in display order. Outside
 * addresses keep only the writer role, whatever was asked for.
 */
export function cleanRoles(email: string, roles: unknown): RoleKey[] {
  const list = Array.isArray(roles) ? roles.filter(isRoleKey) : [];
  const allowed = isStaffEmail(email) ? ROLE_KEYS : OUTSIDE_ROLES;
  return ROLE_KEYS.filter((key) => list.includes(key) && allowed.includes(key));
}

/** "Admin", or the grid row in words: "Blog: own work · Clients: manage". */
export function rolesLabel(roles: readonly RoleKey[]) {
  if (roles.includes("admin")) return ROLE_INFO.admin.label;
  const grid = gridFromRoles(roles);
  return (
    AREA_LIST.flatMap((area) => {
      const value = grid[area.key];
      return value ? [`${area.label}: ${LEVEL_LABELS[value].toLowerCase()}`] : [];
    }).join(" · ") || "No access"
  );
}
