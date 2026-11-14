import type { CommunityAccess } from "@/lib/internal/roles";
import {
  ENTITIES,
  isOwnedBy,
  type EntityKey,
  type FieldDef,
  type Task,
} from "@/lib/internal/community/schema";

/**
 * Who sees what in the community area. Managers (and admins) see
 * everything. Community interns (the "viewer" access) see no money and only
 * the tasks assigned to them.
 *
 * Money is marked in schema.ts: `money` on a field (an event's budget, a
 * sponsor's ask) or on a whole record type (sponsorships, expenses). The
 * loaders in data.ts apply these rules on the server, so what an intern may
 * not see never reaches the browser. Pure, and safe for client components.
 */

/** Someone's community access; null (none) is treated like an intern. */
export type Access = CommunityAccess | null | undefined;

/** The signed-in person, as far as the community rules care. */
export type Viewer = { email: string; community: Access };

export function seesMoney(access: Access) {
  return access === "manager";
}

/** True for record types that are money all through: every row is withheld. */
export function isMoneyEntity(entity: EntityKey) {
  return ENTITIES[entity].money === true;
}

/** The money fields of a record type. */
export function moneyFields(entity: EntityKey): readonly FieldDef[] {
  return ENTITIES[entity].fields.filter((field) => field.money === true);
}

/** A record type's fields as this person may see them, for forms and tables. */
export function visibleFields(
  entity: EntityKey,
  access: Access,
): readonly FieldDef[] {
  if (seesMoney(access)) return ENTITIES[entity].fields;
  if (isMoneyEntity(entity)) return [];
  return ENTITIES[entity].fields.filter((field) => field.money !== true);
}

/**
 * Rows with the money taken out: none at all for a money record type, and
 * otherwise every money field blanked (an amount becomes null, a currency
 * the default "INR"), so the rows keep their shape.
 */
export function withoutMoney<T extends object>(
  entity: EntityKey,
  rows: readonly T[],
): T[] {
  if (isMoneyEntity(entity)) return [];
  const fields = moneyFields(entity);
  if (!fields.length) return [...rows];
  return rows.map((row) => {
    const copy = { ...row } as Record<string, unknown>;
    for (const field of fields) {
      if (field.key in copy)
        copy[field.key] = field.type === "currency" ? "INR" : null;
    }
    return copy as T;
  });
}

/** Rows as this person may see them. */
export function visibleRows<T extends object>(
  entity: EntityKey,
  rows: readonly T[],
  access: Access,
): T[] {
  return seesMoney(access) ? [...rows] : withoutMoney(entity, rows);
}

/**
 * True when saving this input would write money: any row of a money record
 * type, or a money field of another one. Only managers may.
 */
export function writesMoney(entity: EntityKey, input: Record<string, unknown>) {
  if (isMoneyEntity(entity)) return true;
  return moneyFields(entity).some((field) => Object.hasOwn(input, field.key));
}

/** Managers act on any task; interns only on the ones assigned to them. */
export function canActOnTask(task: Pick<Task, "owner">, viewer: Viewer) {
  return viewer.community === "manager" || isOwnedBy(task.owner, viewer.email);
}

/** The tasks this person may see: all for managers, their own for interns. */
export function visibleTasks<T extends Pick<Task, "owner">>(
  tasks: readonly T[],
  viewer: Viewer,
): T[] {
  return tasks.filter((task) => canActOnTask(task, viewer));
}
