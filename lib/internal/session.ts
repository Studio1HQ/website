import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { accessFor } from "@/lib/internal/members";
import { ensureOnTeam, ensureOwnersOnTeam, teamAccessFor } from "@/lib/internal/team/people";
import { displayName, type TeamPerson } from "@/lib/internal/team/shared";
import {
  areaAccess,
  blogAccess,
  can,
  clientAccess,
  communityAccess,
  hiringLevel,
  isOwner,
  isStaffEmail,
  OWNER_ROLES,
  type AreaKey,
  type AreaLevels,
  type BlogAccess,
  type ClientsAccess,
  type CommunityAccess,
  type Role,
  type RoleKey,
} from "@/lib/internal/roles";
import { canExportSection, sectionAccess, type Section } from "@/lib/internal/sections";
import { SESSION_COOKIE, devBypassEmail, readSession } from "@/lib/internal/token";

export type Staff = {
  email: string;
  /** Their own name from their member row, or "" (the team list's name wins; see staffName). */
  name: string;
  /** Every role this person has; empty until an admin approves them. */
  roles: RoleKey[];
  /** Their level on the application pipelines, or null for none. */
  role: Role | null;
  /** What they can do on the blog, or null for nothing. */
  blog: BlogAccess | null;
  /** What they can do in the community area, or null for nothing. */
  community: CommunityAccess | null;
  /** What they can do in client work, or null for nothing. */
  clients: ClientsAccess | null;
  /**
   * The clients they may open, by id, or null for every client. Only ever a
   * list for Client team members an admin has given specific clients.
   */
  clientScope: string[] | null;
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

function withRoles(
  base: { email: string; name: string; localPreview: boolean },
  roles: RoleKey[],
  status: Staff["status"],
  clientIds: string[] | null = null,
): BaseStaff {
  const clients = clientAccess(roles);
  return {
    ...base,
    roles,
    role: hiringLevel(roles),
    blog: blogAccess(roles),
    community: communityAccess(roles),
    clients,
    // Managers (and Admin) run every client; only the team level is scoped.
    clientScope: clients === "member" ? clientIds : null,
    status,
  };
}

type TeamAccess = Awaited<ReturnType<typeof teamAccessFor>>;

/** Adds the team list: left out for people turned off or never invited. */
async function withTeam(staff: BaseStaff, team: TeamAccess): Promise<Staff> {
  if (staff.status === "disabled" || staff.status === "uninvited" || staff.status === "unknown") {
    return { ...staff, person: null, interns: [] };
  }
  // The founders are always on the team list (People, Payroll, My day): a
  // founder who isn't there yet is added now. Normally this never runs.
  if (staff.status === "owner" && !team.person) {
    await ensureOwnersOnTeam();
    return { ...staff, ...(await teamAccessFor(staff.email)) };
  }
  // So is everyone else signed in with an @studio1hq.com address, waiting
  // for areas or not: that's what gives them My day, Tasks and Calls.
  // Signing in, inviting and approving add them; this catches anyone from
  // before that, the next time they open the dashboard. Someone turned off
  // (above) or marked as left on People stays off it, and so does the local
  // preview's address, so QA runs don't land on the live team list.
  if (
    (staff.status === "active" || staff.status === "pending") &&
    !team.person &&
    !staff.localPreview &&
    isStaffEmail(staff.email)
  ) {
    if (await ensureOnTeam(staff.email, staff.name)) return { ...staff, ...(await teamAccessFor(staff.email)) };
  }
  return { ...staff, ...team };
}

/** The name to show for someone: the team list's, else their own, else from the address. */
export function staffName(staff: Pick<Staff, "email" | "name" | "person">) {
  return displayName({ email: staff.email, name: staff.person?.name || staff.name });
}

export function isAdmin(staff: Pick<Staff, "roles">) {
  return staff.roles.includes("admin");
}

/**
 * The Money section (payroll, expense claims, payments) is the founders'
 * only, whatever other roles someone has.
 */
export function canSeeMoney(staff: Pick<Staff, "email" | "status">) {
  return staff.status === "owner" && isOwner(staff.email);
}

/*
 * The areas given one by one (GRANTED_ONLY in lib/internal/roles.ts): Admin
 * alone doesn't open them. The founders always have them; anyone else needs
 * the area's own role. Pages use requireArea; actions, files and the sidebar
 * use these.
 */

/** Outreach: the organisations Studio1 pitches, deal values, follow-ups. */
export function canSeeOutreach(staff: Pick<Staff, "roles">) {
  return can(staff.roles, "outreach", "manage");
}

/** Influencers: creators, their rates and what Studio1 paid. */
export function canSeeInfluencers(staff: Pick<Staff, "roles">) {
  return can(staff.roles, "influencers", "manage");
}

/** Social growth: Studio1's accounts and their numbers. */
export function canSeeSocials(staff: Pick<Staff, "roles">) {
  return can(staff.roles, "socials", "manage");
}

/**
 * The public DevRel jobs board (studio1hq.com/devrel-jobs): people given
 * DevRel jobs on People, and admins.
 */
export function canEditJobBoard(staff: Pick<Staff, "roles">) {
  return can(staff.roles, "jobboard", "manage");
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
  return staffForEmail(email, localPreview);
});

/**
 * Someone's roles and team access from their (already proven) address: the
 * same rules for the dashboard and for the Studio1 Connect extension
 * (lib/internal/extension/http.ts), so the extension never opens more than
 * its owner could open themselves.
 */
export async function staffForEmail(email: string, localPreview = false): Promise<Staff> {
  // Read together: one round trip to the database instead of two in a row.
  const [access, team] = await Promise.all([accessFor(email), teamAccessFor(email)]);
  const base = { email, name: access.kind === "member" ? access.member.name : "", localPreview };
  switch (access.kind) {
    case "owner":
      return withTeam(withRoles(base, [...OWNER_ROLES], "owner"), team);
    case "member":
      // Approved with no areas is still approved: My day and Tasks (withTeam).
      return withTeam(
        access.member.status === "active"
          ? withRoles(base, access.member.roles, "active", access.member.client_ids)
          : withRoles(base, [], access.member.status === "disabled" ? "disabled" : "pending"),
        team,
      );
    case "none":
      return withTeam(withRoles(base, [], isStaffEmail(email) ? "pending" : "uninvited"), team);
    default:
      return withTeam(withRoles(base, [], "unknown"), team);
  }
}

/** The dashboard areas someone can open, in sidebar order. */
export function areasFor(staff: Staff) {
  const areas: (
    | "hiring"
    | "blog"
    | "community"
    | "clients"
    | "outreach"
    | "influencers"
    | "socials"
    | "jobboard"
    | "team"
    | "money"
  )[] = [];
  if (staff.role) areas.push("hiring");
  if (staff.blog) areas.push("blog");
  if (staff.community) areas.push("community");
  if (staff.clients) areas.push("clients");
  if (canSeeOutreach(staff)) areas.push("outreach");
  if (canSeeInfluencers(staff)) areas.push("influencers");
  if (canSeeSocials(staff)) areas.push("socials");
  if (canEditJobBoard(staff)) areas.push("jobboard");
  if (staff.person || staff.interns.length || isAdmin(staff) || can(staff.roles, "tasks", "view")) areas.push("team");
  if (canSeeMoney(staff)) areas.push("money");
  return areas;
}

/**
 * Where someone's dashboard starts. The Overview (/internal) gathers every
 * area they can open, so it's home for admins, hiring staff and anyone with
 * two or more areas. Everyone else goes straight to their one area's page:
 * a community manager to Community, a client manager to Clients, a writer
 * to the Blog, an employee to My day.
 */
export function homeFor(staff: Staff) {
  const areas = areasFor(staff);
  if (isAdmin(staff) || staff.role || areas.length > 1) return "/";
  if (staff.blog) return "/blog";
  if (staff.community) return "/community";
  if (staff.clients) return "/clients";
  if (canSeeOutreach(staff)) return "/outreach";
  if (canSeeInfluencers(staff)) return "/influencers";
  if (canSeeSocials(staff)) return "/socials";
  if (canEditJobBoard(staff)) return "/job-board";
  if (staff.person) return "/me";
  if (staff.interns.length) return "/people";
  if (can(staff.roles, "tasks", "view")) return "/tasks";
  return "/pending";
}

/** Any signed-in person with a way in: a role, the team list or interns. */
export async function requireMember(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/login");
  if (!hasAccess(staff)) redirect("/pending");
  return staff;
}

/** The People page: admins, and anyone who logs interns' days. */
export async function requirePeople(): Promise<Staff & { admin: boolean }> {
  const staff = await requireMember();
  const admin = isAdmin(staff);
  if (!admin && staff.interns.length === 0) redirect(homeFor(staff));
  return { ...staff, admin };
}

/** Where someone goes when they can open an area but not at the level a page needs. */
const DENIED: Record<AreaKey, string> = {
  hiring: "/?denied=1",
  blog: "/blog/posts?denied=1",
  community: "/community?denied=1",
  clients: "/clients?denied=1",
  tasks: "/tasks?denied=1",
  // One level each: no access at all already sends them home.
  outreach: "/?denied=1",
  influencers: "/?denied=1",
  socials: "/?denied=1",
  jobboard: "/?denied=1",
};

/**
 * The one access check for an area's pages, data reads and actions: the
 * signed-in person must reach at least `minimum` in `area` (Admin counts as
 * Manage everywhere but the areas given one by one; see the grid in
 * lib/internal/roles.ts). No access to the
 * area at all sends them home; too low a level, to the area with ?denied=1.
 * proxy.ts already turns signed-out visitors away; this is the check that
 * counts, since a proxy alone can be bypassed.
 */
export async function requireArea<A extends AreaKey>(area: A, minimum: AreaLevels[A]): Promise<Staff> {
  const staff = await requireMember();
  if (!areaAccess(staff.roles, area)) redirect(homeFor(staff));
  if (!can(staff.roles, area, minimum)) redirect(DENIED[area]);
  return staff;
}

/**
 * Every pipeline page, action and data read calls this with the least
 * pipeline level it needs: "viewer" (Hiring: view), "reviewer" (Hiring:
 * manage) or "admin" (the Admin switch).
 */
export async function requireStaff(minimum: Role = "viewer"): Promise<Staff & { role: Role }> {
  const staff = await requireArea("hiring", minimum === "viewer" ? "view" : "manage");
  if (minimum === "admin" && !isAdmin(staff)) redirect(DENIED.hiring);
  return staff as Staff & { role: Role };
}

/** Money pages, actions and files: the founders only. */
export async function requireOwner(): Promise<Staff> {
  const staff = await requireMember();
  if (!canSeeMoney(staff)) redirect(isAdmin(staff) ? "/?denied=1" : homeFor(staff));
  return staff;
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
  return (await requireArea("blog", minimum === "reviewer" ? "manage" : "own")) as Staff & { blog: BlogAccess };
}

/**
 * Community pages and actions: "viewer" to read, "manager" to change
 * anything (viewers may still tick off their own tasks).
 */
export async function requireCommunity(
  minimum: CommunityAccess = "viewer",
): Promise<Staff & { community: CommunityAccess }> {
  return (await requireArea("community", minimum === "manager" ? "manage" : "own")) as Staff & {
    community: CommunityAccess;
  };
}

/**
 * Client work pages, data reads and actions: "member" to read (and move
 * their own deliverables), "manager" for everything else.
 */
export async function requireClients(
  minimum: ClientsAccess = "member",
): Promise<Staff & { clients: ClientsAccess }> {
  return (await requireArea("clients", minimum === "manager" ? "manage" : "own")) as Staff & {
    clients: ClientsAccess;
  };
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** For the sign-in step's own cookies, which only the login page reads. */
export function loginCookieOptions(maxAge: number) {
  return { ...sessionCookieOptions(maxAge), path: "/login" };
}
