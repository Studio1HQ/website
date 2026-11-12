/**
 * Who can do what in the internal dashboard. Plain data, safe for client
 * components.
 *
 * A person can hold several roles (internal_members.roles):
 *
 *   admin            everything: the team and invites, exports, the
 *                    subscriber and partner lists, every pipeline, the blog
 *   hiring_reviewer  change status, tags and notes on applications; email
 *                    applicants
 *   hiring_viewer    read the application pipelines (résumés included)
 *   blog_reviewer    see every blog post, edit, comment, request changes,
 *                    approve and publish
 *   blog_writer      write their own posts and ask for a review. Nothing else:
 *                    no applicant data, no other people's drafts
 *
 * The owners are always admins and can't be changed. Staff (@studio1hq.com)
 * ask for access when they first sign in; an admin approves them with roles.
 * Anyone else can only be invited by an admin, and only as a blog writer.
 */

export const STAFF_DOMAIN = "studio1hq.com";

export const OWNERS = ["arindam@studio1hq.com", "amitesh@studio1hq.com"] as const;

export const ROLE_KEYS = [
  "admin",
  "hiring_reviewer",
  "hiring_viewer",
  "blog_reviewer",
  "blog_writer",
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_INFO: Record<RoleKey, { label: string; area: "All" | "Hiring" | "Blog"; description: string }> = {
  admin: {
    label: "Admin",
    area: "All",
    description: "Everything: the team and invites, exports, subscriber lists, every pipeline and the blog.",
  },
  hiring_reviewer: {
    label: "Hiring reviewer",
    area: "Hiring",
    description: "Review applications: change status, tags and notes, and email applicants.",
  },
  hiring_viewer: {
    label: "Hiring viewer",
    area: "Hiring",
    description: "Read the application pipelines. No changes.",
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
