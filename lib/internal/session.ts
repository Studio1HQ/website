import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { accessFor } from "@/lib/internal/members";
import { teamAccessFor } from "@/lib/internal/team/people";
import type { TeamPerson } from "@/lib/internal/team/shared";
import {
  atLeast,
  blogAccess,
  communityAccess,
  hiringLevel,
  isStaffEmail,
  type BlogAccess,
  type CommunityAccess,
  type Role,
  type RoleKey,
} from "@/lib/internal/roles";
import { canExportSection, sectionAccess, type Section } from "@/lib/internal/sections";
import { SESSION_COOKIE, devBypassEmail, readSession } from "@/lib/internal/token";

export type Staff = {
  email: string;
  /** Every role this person has; empty until an admin approves them. */
  roles: RoleKey[];
  /** Their level on the application pipelines, or null for none. */
  role: Role | null;
  /** What they can do on the blog, or null for nothing. */
  blog: BlogAccess | null;
  /** What they can do in the community area, or null for nothing. */
  community: CommunityAccess | null;
  status: "owner" | "active" | "pending" | "disabled" | "unknown" | "uninvited";
  /**
   * Their row on the team list (employees and interns), if active. Being on
   * it is enough to get in, to My day, without any other role.
   */
  person: TeamPerson | null;
  /** Interns whose days this person logs. Enough to get in, to People. */
  interns: string[];
  localPreview?: boolean;
};

type BaseStaff = Omit<Staff, "person" | "interns">;

function withRoles(base: { email: string; localPreview: boolean }, roles: RoleKey[], status: Staff["status"]): BaseStaff {
  return {
    ...base,
    roles,
    role: hiringLevel(roles),
    blog: blogAccess(roles),
    community: communityAccess(roles),
    status,
  };
}

/** Adds the team list: skipped for people turned off or never invited. */
async function withTeam(staff: BaseStaff): Promise<Staff> {
  if (staff.status === "disabled" || staff.status === "uninvited" || staff.status === "unknown") {
    return { ...staff, person: null, interns: [] };
  }
  return { ...staff, ...(await teamAccessFor(staff.email)) };
}

export function isAdmin(staff: Pick<Staff, "roles">) {
  return staff.roles.includes("admin");
}

/** True when someone has any way in: a role, the team list or interns to log. */
export function hasAccess(staff: Staff) {
  return staff.roles.length > 0 || staff.person !== null || staff.interns.length > 0;
}

/**
 * The signed-in person for this request, with their roles, or null when
 * nobody is signed in. Membership is read on every request, so approving,
 * changing roles or turning someone off takes effect immediately.
 */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  let email = await readSession(token);
  let localPreview = false;
  if (!email) {
    email = devBypassEmail((await headers()).get("host"));
    localPreview = Boolean(email);
  }
  if (!email) return null;

  const access = await accessFor(email);
  const base = { email, localPreview };
  switch (access.kind) {
    case "owner":
      return withTeam(withRoles(base, ["admin"], "owner"));
    case "member":
      return withTeam(
        access.member.status === "active" && access.member.roles.length
          ? withRoles(base, access.member.roles, "active")
          : withRoles(base, [], access.member.status === "disabled" ? "disabled" : "pending"),
      );
    case "none":
      return withTeam(withRoles(base, [], isStaffEmail(email) ? "pending" : "uninvited"));
    default:
      return withTeam(withRoles(base, [], "unknown"));
  }
});

/** The dashboard areas someone can open, in sidebar order. */
export function areasFor(staff: Staff) {
  const areas: ("hiring" | "blog" | "community" | "team" | "money")[] = [];
  if (staff.role) areas.push("hiring");
  if (staff.blog) areas.push("blog");
  if (staff.community) areas.push("community");
  if (staff.person || staff.interns.length || isAdmin(staff)) areas.push("team");
  if (isAdmin(staff)) areas.push("money");
  return areas;
}

/**
 * Where someone's dashboard starts. The Overview (/internal) gathers every
 * area they can open, so it's home for admins, hiring staff and anyone with
 * two or more areas. Everyone else goes straight to their one area's page:
 * a community manager to Community, a writer to the Blog, an employee to
 * My day.
 */
export function homeFor(staff: Staff) {
  const areas = areasFor(staff);
  if (isAdmin(staff) || staff.role || areas.length > 1) return "/internal";
  if (staff.blog) return "/internal/blog";
  if (staff.community) return "/internal/community";
  if (staff.person) return "/internal/me";
  if (staff.interns.length) return "/internal/people";
  return "/internal/pending";
}

/** Any signed-in person with a way in: a role, the team list or interns. */
export async function requireMember(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/internal/login");
  if (!hasAccess(staff)) redirect("/internal/pending");
  return staff;
}

/** The People page: admins, and anyone who logs interns' days. */
export async function requirePeople(): Promise<Staff & { admin: boolean }> {
  const staff = await requireMember();
  const admin = isAdmin(staff);
  if (!admin && staff.interns.length === 0) redirect(homeFor(staff));
  return { ...staff, admin };
}

/**
 * Every pipeline page, action and data read calls this with the least
 * pipeline level it needs. proxy.ts already turns signed-out visitors away;
 * this is the check that counts, since a proxy alone can be bypassed.
 */
export async function requireStaff(minimum: Role = "viewer"): Promise<Staff & { role: Role }> {
  const staff = await requireMember();
  if (!staff.role) redirect(homeFor(staff));
  if (!atLeast(staff.role, minimum)) redirect("/internal?denied=1");
  return staff as Staff & { role: Role };
}

/**
 * A section's pages, data reads and actions: "read" to open it, "edit" to
 * change status, tags and notes or send email, "export" for its CSV. Hiring
 * sections follow the pipelines roles, community sections (hackathon
 * registrations) the community roles; see sectionAccess.
 */
export async function requireSection(
  section: Section,
  need: "read" | "edit" | "export" = "read",
): Promise<Staff & { access: "edit" | "read" }> {
  const staff = await requireMember();
  const access = sectionAccess(staff, section);
  if (!access) redirect(homeFor(staff));
  if (need === "edit" && access !== "edit") redirect(`${section.path}?denied=1`);
  if (need === "export" && !canExportSection(staff, section)) redirect(`${section.path}?denied=1`);
  return { ...staff, access };
}

/** Blog pages and actions: "writer" for writing, "reviewer" for reviewing and publishing. */
export async function requireBlog(minimum: BlogAccess = "writer"): Promise<Staff & { blog: BlogAccess }> {
  const staff = await requireMember();
  if (!staff.blog) redirect(homeFor(staff));
  if (minimum === "reviewer" && staff.blog !== "reviewer") redirect("/internal/blog?denied=1");
  return staff as Staff & { blog: BlogAccess };
}

/**
 * Community pages and actions: "viewer" to read, "manager" to change
 * anything (viewers may still tick off their own tasks).
 */
export async function requireCommunity(
  minimum: CommunityAccess = "viewer",
): Promise<Staff & { community: CommunityAccess }> {
  const staff = await requireMember();
  if (!staff.community) redirect(homeFor(staff));
  if (minimum === "manager" && staff.community !== "manager") redirect("/internal/community?denied=1");
  return staff as Staff & { community: CommunityAccess };
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/internal",
    maxAge,
  };
}

export function linkCookieOptions(maxAge: number) {
  return { ...sessionCookieOptions(maxAge), path: "/internal/auth" };
}
