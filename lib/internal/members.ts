import "server-only";
import { cache } from "react";
import { insertRow, selectRows, updateRows } from "@/lib/supabase-server";
import {
  OWNERS,
  cleanRoles,
  hiringLevel,
  isOwner,
  isStaffEmail,
  type RoleKey,
} from "@/lib/internal/roles";

/**
 * Dashboard membership, in the internal_members table
 * (supabase/migrations/20261112130000_internal_team.sql and
 * 20261112140000_blog_and_roles.sql). Owners (lib/internal/roles.ts) never
 * need a row. No session checks here: callers in lib/internal/session.ts and
 * the team actions do that.
 */

export type MemberStatus = "pending" | "active" | "disabled";

export type Member = {
  email: string;
  /** What they call themselves; "" until they say (or before the profiles migration). */
  name: string;
  roles: RoleKey[];
  status: MemberStatus;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  last_seen_at: string | null;
  invited_by: string | null;
  /**
   * The clients a Client team member may open, by id; null for every client
   * (and before the client scope migration, 20261116150000_member_client_scope.sql).
   */
  client_ids: string[] | null;
};

const TABLE = "internal_members";

/** The single legacy role, for rows saved before the roles column existed. */
const LEGACY: Record<string, RoleKey> = {
  admin: "admin",
  reviewer: "hiring_reviewer",
  viewer: "hiring_viewer",
};

function toMember(row: Record<string, unknown>): Member | null {
  const status = row.status;
  if (
    typeof row.email !== "string" ||
    (status !== "pending" && status !== "active" && status !== "disabled")
  ) {
    return null;
  }
  // Before the blog migration runs there's no roles column: use `role`.
  const roles = Array.isArray(row.roles)
    ? cleanRoles(row.email, row.roles)
    : cleanRoles(row.email, [LEGACY[String(row.role)]]);
  return {
    email: row.email,
    name: typeof row.name === "string" ? row.name.trim() : "",
    roles,
    status,
    requested_at: String(row.requested_at ?? ""),
    decided_by: typeof row.decided_by === "string" ? row.decided_by : null,
    decided_at: typeof row.decided_at === "string" ? row.decided_at : null,
    last_seen_at: typeof row.last_seen_at === "string" ? row.last_seen_at : null,
    invited_by: typeof row.invited_by === "string" ? row.invited_by : null,
    client_ids: Array.isArray(row.client_ids)
      ? row.client_ids.filter((id): id is string => typeof id === "string")
      : null,
  };
}

export type Access =
  | { kind: "owner" }
  | { kind: "member"; member: Member }
  | { kind: "none" }
  | { kind: "error" };

/** Where this address stands: owner, a member row, no row yet, or unknown. */
export async function accessFor(email: string): Promise<Access> {
  if (isOwner(email)) return { kind: "owner" };
  const result = await selectRows(
    TABLE,
    new URLSearchParams({ select: "*", email: `eq.${email}`, limit: "1" }),
  );
  if (!result.ok) {
    console.error(`[internal] reading ${TABLE} failed: ${result.message}`);
    return { kind: "error" };
  }
  const member = result.rows[0] ? toMember(result.rows[0]) : null;
  return member ? { kind: "member", member } : { kind: "none" };
}

/** True when this outside address has been invited and isn't turned off. */
export async function isInvited(email: string) {
  const access = await accessFor(email);
  return access.kind === "member" && access.member.status === "active" && access.member.roles.length > 0;
}

/**
 * Files a pending request the first time a staff member signs in. Outside
 * addresses never get one: they only come in through an invite.
 */
export async function requestAccess(email: string) {
  if (isOwner(email) || !isStaffEmail(email)) return { ok: true as const, created: false };
  const result = await insertRow(TABLE, { email, role: "viewer", status: "pending" });
  // A duplicate means the request (or membership) already exists. `created`
  // is true only the first time, which is when the admins' bells are told.
  return result.ok || result.duplicate
    ? { ok: true as const, created: result.ok }
    : { ok: false as const, message: result.message };
}

/**
 * Saves the name someone typed for themselves (already cleaned). `found` is
 * false when they have no member row: owners and people who are only on the
 * team list keep their name there.
 */
export async function setMemberName(email: string, name: string) {
  const result = await updateRows(TABLE, new URLSearchParams({ email: `eq.${email}` }), { name }, "email");
  if (!result.ok) {
    console.error(`[internal] saving a name on ${TABLE} failed: ${result.message}`);
    return {
      ok: false as const,
      message: result.message.includes("name")
        ? "Names aren't set up yet: the profiles migration (20261115100000_member_profiles.sql) has to run in Supabase first."
        : "Couldn't save your name. Try again in a minute.",
    };
  }
  return { ok: true as const, found: result.count > 0 };
}

export async function touchMember(email: string) {
  if (isOwner(email)) return;
  await updateRows(
    TABLE,
    new URLSearchParams({ email: `eq.${email}` }),
    { last_seen_at: new Date().toISOString() },
    "email",
  );
}

export async function listMembers(): Promise<Member[] | null> {
  const result = await selectRows(
    TABLE,
    new URLSearchParams({ select: "*", order: "requested_at.desc", limit: "500" }),
  );
  if (!result.ok) {
    console.error(`[internal] listing ${TABLE} failed: ${result.message}`);
    return null;
  }
  return result.rows.map(toMember).filter((member): member is Member => member !== null);
}

/** Active people with any of these roles (owners included), for pickers. */
export async function membersWith(roles: readonly RoleKey[]): Promise<string[]> {
  const members = (await listMembers()) ?? [];
  const found = members
    .filter((member) => member.status === "active" && member.roles.some((role) => roles.includes(role)))
    .map((member) => member.email);
  const owners: string[] = roles.includes("admin") ? [...OWNERS] : [];
  return [...new Set([...owners, ...found])];
}

export const pendingCount = cache(async (): Promise<number> => {
  const result = await selectRows(
    TABLE,
    new URLSearchParams({ select: "email", status: "eq.pending", limit: "1" }),
    { count: true },
  );
  return result.ok ? (result.total ?? 0) : 0;
});

/**
 * Staff approved with no roles still get My day and Tasks (they're on the
 * team list), so that's allowed. Someone outside Studio1 with no role would
 * have nothing at all.
 */
function noRolesProblem(email: string, status: MemberStatus, roles: RoleKey[]) {
  if (status !== "active" || roles.length > 0 || isStaffEmail(email)) return null;
  return "Outside writers need Blog: own work, or turn their access off.";
}

/**
 * A change to someone's access. `clientIds` is written only when given: a
 * database without the column (before 20261116150000_member_client_scope.sql)
 * still takes every other change.
 */
export type MemberChange = { status: MemberStatus; roles: RoleKey[]; clientIds?: string[] | null };

function scopeColumn(change: { clientIds?: string[] | null }) {
  return change.clientIds === undefined ? {} : { client_ids: change.clientIds };
}

/** Whether the client scope column is there yet (the migration has run). */
export async function clientScopeReady() {
  const result = await selectRows(TABLE, new URLSearchParams({ select: "client_ids", limit: "1" }));
  return result.ok;
}

/** The legacy single-role column, kept in step for old code. */
function legacyRole(roles: RoleKey[]) {
  return hiringLevel(roles) ?? "viewer";
}

/**
 * Saves someone's status and roles. `unless` makes the write itself hold a
 * check that was made on an earlier read: the row must still have that
 * status, still not be an admin's and, when given, still have (or not have)
 * Team tasks, so a change made in between (an owner turning the person off,
 * making them an admin, or taking Team tasks away) isn't written over.
 */
export type MemberSnapshot = { statusWas: MemberStatus; tasksViewer?: boolean };

export async function decideMember(
  email: string,
  change: MemberChange,
  by: string,
  unless?: MemberSnapshot,
) {
  if (isOwner(email)) return { ok: false as const, message: "Owners can't be changed." };
  const roles = cleanRoles(email, change.roles);
  const problem = noRolesProblem(email, change.status, roles);
  if (problem) return { ok: false as const, message: problem };
  const which = new URLSearchParams({ email: `eq.${email}` });
  if (unless) {
    which.set("status", `eq.${unless.statusWas}`);
    // Two filters on one column: PostgREST ANDs them.
    which.append("roles", "not.cs.{admin}");
    if (unless.tasksViewer !== undefined) {
      which.append("roles", unless.tasksViewer ? "cs.{tasks_viewer}" : "not.cs.{tasks_viewer}");
    }
  }
  const result = await updateRows(
    TABLE,
    which,
    {
      status: change.status,
      roles,
      role: legacyRole(roles),
      ...scopeColumn(change),
      decided_by: by,
      decided_at: new Date().toISOString(),
    },
    "email",
  );
  if (!result.ok) {
    console.error(`[internal] updating ${TABLE} failed: ${result.message}`);
    return {
      ok: false as const,
      message: result.message.includes("roles")
        ? "Run the blog migration (20261112140000_blog_and_roles.sql) in Supabase first."
        : "Couldn't save. Try again in a minute.",
    };
  }
  if (result.count) return { ok: true as const };
  return {
    ok: false as const,
    message: unless ? "Their access was just changed by someone else. Reload the page and try again." : "That person isn't on the list.",
  };
}

/**
 * A member row for someone who's only on the team list (added on People,
 * never invited or approved here): they had My day and Tasks, and now get
 * these roles, or have their access turned off. Refused when a row turned up
 * in the meantime, so a change made in between isn't written over.
 */
export async function addMember(email: string, change: MemberChange, by: string) {
  if (isOwner(email)) return { ok: false as const, message: "Owners can't be changed." };
  const roles = cleanRoles(email, change.roles);
  const problem = noRolesProblem(email, change.status, roles);
  if (problem) return { ok: false as const, message: problem };
  const inserted = await insertRow(TABLE, {
    email,
    roles,
    role: legacyRole(roles),
    status: change.status,
    ...scopeColumn(change),
    decided_by: by,
    decided_at: new Date().toISOString(),
  });
  if (inserted.ok) return { ok: true as const };
  if (inserted.duplicate) {
    return { ok: false as const, message: "Their access was just changed by someone else. Reload the page and try again." };
  }
  console.error(`[internal] adding ${email} to ${TABLE} failed: ${inserted.message}`);
  return { ok: false as const, message: "Couldn't save. Try again in a minute." };
}

/**
 * Adds someone straight away: staff an admin wants in before they ask (with
 * any roles, or none for just My day and Tasks), or an outside writer.
 * Re-inviting an existing person updates them. `expected` holds the write to
 * what the caller saw: "none" (no row, so one turning up in between is
 * refused) or the row's snapshot (see decideMember's `unless`).
 */
export async function inviteMember(
  email: string,
  roles: RoleKey[],
  by: string,
  clientIds?: string[] | null,
  expected?: MemberSnapshot | "none",
) {
  if (isOwner(email)) return { ok: false as const, message: "Owners already have access." };
  const clean = cleanRoles(email, roles);
  if (clean.length === 0 && !isStaffEmail(email)) {
    return { ok: false as const, message: "Outside writers can only be Blog writers." };
  }
  const now = new Date().toISOString();
  const row = {
    email,
    roles: clean,
    role: legacyRole(clean),
    status: "active",
    ...scopeColumn({ clientIds }),
    invited_by: by,
    decided_by: by,
    decided_at: now,
  };
  const inserted = await insertRow(TABLE, row);
  if (inserted.ok) return { ok: true as const, existed: false };
  if (!inserted.duplicate) {
    console.error(`[internal] inviting ${email} failed: ${inserted.message}`);
    return {
      ok: false as const,
      message: inserted.message.includes("roles") || inserted.message.includes("invited_by")
        ? "Run the blog migration (20261112140000_blog_and_roles.sql) in Supabase first."
        : "Couldn't save the invite. Try again in a minute.",
    };
  }
  if (expected === "none") {
    return { ok: false as const, message: "Their access was just changed by someone else. Reload the page and try again." };
  }
  const updated = await decideMember(email, { status: "active", roles: clean, clientIds }, by, expected);
  return updated.ok ? { ok: true as const, existed: true } : updated;
}
