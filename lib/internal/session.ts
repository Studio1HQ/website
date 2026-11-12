import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { accessFor } from "@/lib/internal/members";
import {
  atLeast,
  blogAccess,
  hiringLevel,
  isStaffEmail,
  type BlogAccess,
  type Role,
  type RoleKey,
} from "@/lib/internal/roles";
import { SESSION_COOKIE, devBypassEmail, readSession } from "@/lib/internal/token";

export type Staff = {
  email: string;
  /** Every role this person has; empty until an admin approves them. */
  roles: RoleKey[];
  /** Their level on the application pipelines, or null for none. */
  role: Role | null;
  /** What they can do on the blog, or null for nothing. */
  blog: BlogAccess | null;
  status: "owner" | "active" | "pending" | "disabled" | "unknown" | "uninvited";
  localPreview?: boolean;
};

function withRoles(base: { email: string; localPreview: boolean }, roles: RoleKey[], status: Staff["status"]): Staff {
  return { ...base, roles, role: hiringLevel(roles), blog: blogAccess(roles), status };
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
      return withRoles(base, ["admin"], "owner");
    case "member":
      return access.member.status === "active" && access.member.roles.length
        ? withRoles(base, access.member.roles, "active")
        : withRoles(base, [], access.member.status === "disabled" ? "disabled" : "pending");
    case "none":
      return withRoles(base, [], isStaffEmail(email) ? "pending" : "uninvited");
    default:
      return withRoles(base, [], "unknown");
  }
});

/** Where someone with access but not to this page should go instead. */
function homeFor(staff: Staff) {
  if (staff.role) return "/internal";
  if (staff.blog) return "/internal/blog";
  return "/internal/pending";
}

/** Any signed-in person with at least one role. */
export async function requireMember(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/internal/login");
  if (!staff.roles.length) redirect("/internal/pending");
  return staff;
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

/** Blog pages and actions: "writer" for writing, "reviewer" for reviewing and publishing. */
export async function requireBlog(minimum: BlogAccess = "writer"): Promise<Staff & { blog: BlogAccess }> {
  const staff = await requireMember();
  if (!staff.blog) redirect(homeFor(staff));
  if (minimum === "reviewer" && staff.blog !== "reviewer") redirect("/internal/blog?denied=1");
  return staff as Staff & { blog: BlogAccess };
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
