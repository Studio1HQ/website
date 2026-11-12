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
  roles: RoleKey[];
  status: MemberStatus;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  last_seen_at: string | null;
  invited_by: string | null;
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
    roles,
    status,
    requested_at: String(row.requested_at ?? ""),
    decided_by: typeof row.decided_by === "string" ? row.decided_by : null,
    decided_at: typeof row.decided_at === "string" ? row.decided_at : null,
    last_seen_at: typeof row.last_seen_at === "string" ? row.last_seen_at : null,
    invited_by: typeof row.invited_by === "string" ? row.invited_by : null,
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
  if (isOwner(email) || !isStaffEmail(email)) return { ok: true as const };
  const result = await insertRow(TABLE, { email, role: "viewer", status: "pending" });
  // A duplicate means the request (or membership) already exists.
  return result.ok || result.duplicate
    ? { ok: true as const }
    : { ok: false as const, message: result.message };
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

export async function pendingCount(): Promise<number> {
  const result = await selectRows(
    TABLE,
    new URLSearchParams({ select: "email", status: "eq.pending", limit: "1" }),
    { count: true },
  );
  return result.ok ? (result.total ?? 0) : 0;
}

/** The legacy single-role column, kept in step for old code. */
function legacyRole(roles: RoleKey[]) {
  return hiringLevel(roles) ?? "viewer";
}

export async function decideMember(
  email: string,
  change: { status: MemberStatus; roles: RoleKey[] },
  by: string,
) {
  if (isOwner(email)) return { ok: false as const, message: "Owners can't be changed." };
  const roles = cleanRoles(email, change.roles);
  if (change.status === "active" && roles.length === 0) {
    return { ok: false as const, message: "Pick at least one role, or turn their access off." };
  }
  const result = await updateRows(
    TABLE,
    new URLSearchParams({ email: `eq.${email}` }),
    {
      status: change.status,
      roles,
      role: legacyRole(roles),
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
  return result.count
    ? { ok: true as const }
    : { ok: false as const, message: "That person isn't on the list." };
}

/**
 * Adds someone with roles straight away: staff an admin wants in before they
 * ask, or an outside writer. Re-inviting an existing person updates them.
 */
export async function inviteMember(email: string, roles: RoleKey[], by: string) {
  if (isOwner(email)) return { ok: false as const, message: "Owners already have access." };
  const clean = cleanRoles(email, roles);
  if (clean.length === 0) {
    return {
      ok: false as const,
      message: isStaffEmail(email) ? "Pick at least one role." : "Outside writers can only be Blog writers.",
    };
  }
  const now = new Date().toISOString();
  const row = {
    email,
    roles: clean,
    role: legacyRole(clean),
    status: "active",
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
  const updated = await decideMember(email, { status: "active", roles: clean }, by);
  return updated.ok ? { ok: true as const, existed: true } : updated;
}
