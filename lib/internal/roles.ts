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
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_INFO: Record<
  RoleKey,
  { label: string; area: "All" | "Hiring" | "Blog" | "Community"; description: string }
> = {
  admin: {
    label: "Admin",
    area: "All",
    description:
      "Everything except Money: the team list, exports, subscriber lists, every pipeline, the blog and community. Payroll and payments stay with the founders.",
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

/** The pipelines level a set of roles gives, or null for none. */
export function hiringLevel(roles: readonly RoleKey[]): Role | null {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("hiring_reviewer")) return "reviewer";
  if (roles.includes("hiring_viewer")) return "viewer";
  return null;
}

export type BlogAccess = "reviewer" | "writer";

/** What a set of roles may do on the blog, or null for nothing. */
export function blogAccess(roles: readonly RoleKey[]): BlogAccess | null {
  if (roles.includes("admin") || roles.includes("blog_reviewer")) return "reviewer";
  if (roles.includes("blog_writer")) return "writer";
  return null;
}

export type CommunityAccess = "manager" | "viewer";

/** What a set of roles may do in the community area, or null for nothing. */
export function communityAccess(roles: readonly RoleKey[]): CommunityAccess | null {
  if (roles.includes("admin") || roles.includes("community_manager")) return "manager";
  if (roles.includes("community_viewer")) return "viewer";
  return null;
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

/** "Admin", or "Hiring reviewer · Blog writer". */
export function rolesLabel(roles: readonly RoleKey[]) {
  if (roles.includes("admin")) return ROLE_INFO.admin.label;
  return roles.map((key) => ROLE_INFO[key].label).join(" · ") || "No access";
}
