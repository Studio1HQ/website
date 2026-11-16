import { loadClients } from "@/lib/internal/clients/data";
import {
  accessFor,
  addMember,
  clientScopeReady,
  decideMember,
  inviteMember,
  setMemberName,
  type Member,
  type MemberChange,
  type MemberSnapshot,
} from "@/lib/internal/members";
import { clientAccess, cleanRoles, isOwner, isStaffEmail, roleChangeProblem, type RoleKey } from "@/lib/internal/roles";
import {
  addPerson,
  addToTeam,
  cleanPerson,
  getPerson,
  reviewerProblem,
  updatePerson,
  type PersonInput,
} from "@/lib/internal/team/people";
import { displayName, isUuid, type TeamPerson, type TeamResult } from "@/lib/internal/team/shared";

/**
 * The one team list on People: everyone on the roster (team_people) and
 * everyone with a dashboard row (internal_members), as one row each, with
 * their details and what they can open. Adding someone, changing them and
 * turning them off all go through here, so the two tables never drift
 * apart. No session checks: app/internal/(dashboard)/people/actions.ts does
 * those and passes who's acting.
 */

/**
 * Where someone stands. "pending" is someone who asked before joining was
 * automatic; "off" is access turned off or marked as left, which this list
 * treats as one thing.
 */
export type TeammateStatus = "owner" | "active" | "pending" | "off";

export type Teammate = {
  email: string;
  name: string;
  /** Their roster row: employee ID, type, designation. Null for outside writers. */
  person: TeamPerson | null;
  /** What they can open beyond My day, Tasks and Calls. */
  roles: RoleKey[];
  /** Client team members given only some clients: their ids. Null for every client. */
  clientIds: string[] | null;
  status: TeammateStatus;
  /** Not an @studio1hq.com address: a blog writer, nothing else. */
  outside: boolean;
  lastSeen: string | null;
  /** When they asked for access, for someone still waiting. */
  requestedAt: string | null;
};

export type Actor = { email: string; owner: boolean };

const FOUNDERS = "Arindam or Amitesh";

const STATUS_ORDER: Record<TeammateStatus, number> = { pending: 0, owner: 1, active: 2, off: 3 };

/** People and members as one list: waiting first, then the founders, everyone else, and those turned off. */
export function mergeTeam(people: readonly TeamPerson[], members: readonly Member[]): Teammate[] {
  const byEmail = new Map(members.map((member) => [member.email.toLowerCase(), member]));
  const listed = new Set<string>();
  const rows: Teammate[] = [];

  for (const person of people) {
    const key = person.email.toLowerCase();
    listed.add(key);
    const member = byEmail.get(key);
    const owner = isOwner(person.email);
    rows.push({
      email: person.email,
      name: displayName({ email: person.email, name: person.name || member?.name }),
      person,
      roles: owner ? ["admin"] : (member?.roles ?? []),
      clientIds: owner ? null : (member?.client_ids ?? null),
      status: owner
        ? "owner"
        : !person.active || member?.status === "disabled"
          ? "off"
          : member?.status === "pending"
            ? "pending"
            : "active",
      outside: !isStaffEmail(person.email),
      lastSeen: member?.last_seen_at ?? null,
      requestedAt: member?.status === "pending" ? member.requested_at : null,
    });
  }
  // Outside writers, and anyone whose roster row hasn't been made yet.
  for (const member of members) {
    if (listed.has(member.email.toLowerCase()) || isOwner(member.email)) continue;
    rows.push({
      email: member.email,
      name: displayName(member),
      person: null,
      roles: member.roles,
      clientIds: member.client_ids,
      status: member.status === "disabled" ? "off" : member.status,
      outside: !isStaffEmail(member.email),
      lastSeen: member.last_seen_at,
      requestedAt: member.status === "pending" ? member.requested_at : null,
    });
  }
  return rows.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (b.requestedAt ?? "").localeCompare(a.requestedAt ?? "") ||
      a.name.localeCompare(b.name),
  );
}

/** What a non-founder's write must still find: the status, and whether they had Team tasks. */
function snapshotOf(member: Pick<Member, "status" | "roles">): MemberSnapshot {
  return { statusWas: member.status, tasksViewer: member.roles.includes("tasks_viewer") };
}

/** A roster row as the fields updatePerson takes. */
function personInput(person: TeamPerson): PersonInput {
  const { email, name, employee_code, kind, designation, joined_on, reviewer, active } = person;
  return { email, name, employee_code, kind, designation, joined_on, reviewer, active };
}

const sameRoles = (a: readonly RoleKey[], b: readonly RoleKey[]) =>
  a.length === b.length && a.every((role) => b.includes(role));

const sameIds = (a: readonly string[] | null, b: readonly string[] | null) =>
  a === null || b === null ? a === b : a.length === b.length && a.every((id) => b.includes(id));

/**
 * The clients picked for someone, checked: ids of clients that exist, or
 * null for every client. Only Client team members (Clients: Own work) are
 * ever limited; anyone else gets null.
 */
async function cleanScope(
  value: unknown,
  roles: readonly RoleKey[],
): Promise<{ ok: true; ids: string[] | null } | { ok: false; message: string }> {
  if (clientAccess(roles) !== "member" || !Array.isArray(value) || value.length === 0) return { ok: true, ids: null };
  const ids = [...new Set(value.filter(isUuid).map((id) => id.toLowerCase()))];
  if (ids.length !== value.length) return { ok: false, message: "Pick their clients again: one of them isn't valid." };
  const [clients, ready] = await Promise.all([loadClients({ archived: true }), clientScopeReady()]);
  if (!ready) {
    return {
      ok: false,
      message: "Picking clients needs the client scope migration (20261116150000_member_client_scope.sql) in Supabase first.",
    };
  }
  if (!clients.ok) return { ok: false, message: "Couldn't check the clients just now. Try again in a minute." };
  const known = new Set(clients.rows.map((client) => client.id.toLowerCase()));
  if (ids.some((id) => !known.has(id))) return { ok: false, message: "One of those clients isn't there any more. Reload and pick again." };
  return { ok: true, ids };
}

const COULDNT_CHECK = { ok: false as const, message: "Couldn't check that person just now. Try again in a minute." };

export type Added =
  | { ok: true; email: string; roles: RoleKey[] }
  | { ok: false; message: string };

/**
 * Adds someone with their details and access in one go. Studio1 addresses
 * go on the roster (My day, Tasks, Calls, attendance) with the areas picked;
 * anyone else becomes a blog writer, which only the founders can do. The
 * caller sends the invite email.
 */
export async function addTeammate(actor: Actor, input: Record<string, unknown>): Promise<Added> {
  const clean = cleanPerson(input ?? {});
  if (!clean.ok) return clean;
  const { email } = clean.person;
  // A name to show until they give their own, like everyone who joins by signing in.
  const details: PersonInput = { ...clean.person, name: clean.person.name || displayName({ email }), active: true };
  if (email === actor.email) return { ok: false, message: "You're already on the team." };
  if (isOwner(email)) return { ok: false, message: "The founders are always on the team." };

  const staff = isStaffEmail(email);
  if (!staff && !actor.owner) {
    return { ok: false, message: `Only ${FOUNDERS} can invite writers from outside Studio1.` };
  }
  const roles: RoleKey[] = staff ? cleanRoles(email, input.roles) : ["blog_writer"];
  const [access, before] = await Promise.all([accessFor(email), staff ? getPerson(email) : Promise.resolve(null)]);
  if (access.kind === "error") return COULDNT_CHECK;
  if (before || (!staff && access.kind === "member")) {
    return {
      ok: false,
      message: `${displayName({ email, name: before?.name })} is already on the team. Click their row to change their access.`,
    };
  }
  // Someone who asked for access, or was turned off, keeps the usual rules.
  const current = access.kind === "member" ? access.member : { status: "active" as const, roles: [] };
  const problem = roleChangeProblem(actor, current, { status: "active", roles });
  if (problem) return { ok: false, message: problem };
  const scope = await cleanScope(input.client_ids, roles);
  if (!scope.ok) return scope;
  if (details.reviewer) {
    const reviewer = await reviewerProblem(details.reviewer);
    if (reviewer) return { ok: false, message: reviewer };
  }

  if (staff) {
    const added = await addPerson(details, actor.email);
    if (!added.ok) return { ok: false, message: added.message };
  }
  // Written with the roles, so they never have every client for a moment.
  // An earlier list is cleared explicitly when every client is picked.
  const hadScope = access.kind === "member" && access.member.client_ids !== null;
  const invited = await inviteMember(
    email,
    roles,
    actor.email,
    scope.ids ?? (hadScope ? null : undefined),
    // Another admin's write holds to what was checked above.
    actor.owner ? undefined : access.kind === "member" ? snapshotOf(access.member) : "none",
  );
  if (!invited.ok) {
    return {
      ok: false,
      message: staff ? `Added to the team, but their access didn't save: ${invited.message}` : invited.message,
    };
  }
  if (!staff && clean.person.name) await setMemberName(email, clean.person.name);
  return { ok: true, email, roles };
}

/**
 * Saves someone's details and access from their row's dialog. Access is
 * checked before anything is written, so a refused change saves nothing.
 * Saving someone who's waiting approves them. The founders' access, your
 * own, and that of anyone turned off don't change here.
 */
export async function saveTeammate(actor: Actor, input: Record<string, unknown>): Promise<TeamResult> {
  const clean = cleanPerson(input ?? {});
  if (!clean.ok) return clean;
  const { email } = clean.person;
  const staff = isStaffEmail(email);
  const [access, before] = await Promise.all([accessFor(email), getPerson(email)]);
  if (access.kind === "error") return COULDNT_CHECK;
  if (!before && access.kind !== "member") return { ok: false, message: "That person isn't on the team." };

  // Access first: what they'd have, and whether this admin may give it.
  const current = access.kind === "member" ? access.member : { status: "active" as const, roles: [] as RoleKey[] };
  const off = current.status === "disabled" || before?.active === false;
  const wanted = staff ? cleanRoles(email, input.roles) : current.roles;
  let accessChange: MemberChange | null = null;
  if (access.kind !== "owner" && Array.isArray(input.roles)) {
    const scope = await cleanScope(input.client_ids, wanted);
    if (!scope.ok) return scope;
    const scopeWas = access.kind === "member" ? access.member.client_ids : null;
    const scopeChanged = !sameIds(scopeWas, scope.ids);
    const changed = current.status === "pending" || scopeChanged || !sameRoles(current.roles, wanted);
    if (changed && email === actor.email) return { ok: false, message: "You can't change your own access." };
    if (changed && off) return { ok: false, message: "Turn their access back on first." };
    if (changed) {
      const problem = roleChangeProblem(actor, current, { status: "active", roles: wanted });
      if (problem) return { ok: false, message: problem };
      // The client list is written only when it changes: before its
      // migration runs there's no column, and nobody has one.
      accessChange = { status: "active", roles: wanted, ...(scopeChanged ? { clientIds: scope.ids } : {}) };
    }
  }

  // Then the details. Turning on and off has its own button (setTeammateOn).
  const details: PersonInput = { ...clean.person, active: before?.active ?? true };
  if (details.reviewer && details.reviewer !== before?.reviewer) {
    const problem = await reviewerProblem(details.reviewer);
    if (problem) return { ok: false, message: problem };
  }
  if (before) {
    const saved = await updatePerson(details, actor.email, before);
    if (!saved.ok) return saved;
  } else if (staff && !off) {
    // On the dashboard but not the roster yet: they belong on both.
    const added = await addPerson(details, actor.email);
    if (!added.ok) return added;
  } else if (access.kind === "member" && details.name !== access.member.name) {
    const named = await setMemberName(email, details.name);
    if (!named.ok) return named;
  }

  if (accessChange) {
    const saved =
      access.kind === "none"
        ? await addMember(email, accessChange, actor.email)
        : await decideMember(
            email,
            accessChange,
            actor.email,
            actor.owner ? undefined : snapshotOf(current),
          );
    if (!saved.ok) return saved;
  }
  return { ok: true, message: current.status === "pending" && accessChange ? "Approved" : "Saved" };
}

/**
 * Turns someone off (they can't sign in, and leave the roster and
 * attendance; their days and payslips stay) or back on with what they had.
 * The founders only, like every other way in or out.
 */
export async function setTeammateOn(actor: Actor, email: string, on: boolean): Promise<TeamResult> {
  if (!actor.owner) return { ok: false, message: `Only ${FOUNDERS} can turn someone's access off or back on.` };
  if (email === actor.email) return { ok: false, message: "You can't turn yourself off." };
  if (isOwner(email)) return { ok: false, message: "The founders can't be turned off." };
  const [access, person] = await Promise.all([accessFor(email), getPerson(email)]);
  if (access.kind === "error") return COULDNT_CHECK;
  if (!person && access.kind !== "member") return { ok: false, message: "That person isn't on the team." };

  if (access.kind === "member") {
    if (on && access.member.roles.length === 0 && !isStaffEmail(email)) {
      const back = await decideMember(email, { status: "active", roles: ["blog_writer"] }, actor.email);
      if (!back.ok) return back;
    } else if (access.member.status !== (on ? "active" : "disabled")) {
      const saved = await decideMember(email, { status: on ? "active" : "disabled", roles: access.member.roles }, actor.email);
      if (!saved.ok) return saved;
    }
  } else if (!on) {
    // Only on the roster: a member row turned off keeps them out at sign-in too.
    const saved = await addMember(email, { status: "disabled", roles: [] }, actor.email);
    if (!saved.ok) return saved;
  }

  if (person && person.active !== on) {
    const saved = await updatePerson({ ...personInput(person), active: on }, actor.email, person);
    if (!saved.ok) return saved;
  } else if (!person && on && isStaffEmail(email)) {
    const added = await addToTeam(email, access.kind === "member" ? access.member.name : "", actor.email);
    if (added === null) {
      return { ok: false, message: "Their access is back on, but they couldn't be put back on the team list. Try again in a minute." };
    }
  }
  return { ok: true, message: on ? "Turned back on" : "Turned off" };
}
