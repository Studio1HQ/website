import { insertRow, selectRows } from "@/lib/supabase-server";
import { isMissingTable } from "@/lib/internal/team/shared";

/**
 * Who changed what on the team and money pages (team_audit, added by
 * supabase/migrations/20261114120000_team_fixes.sql): payments marked paid,
 * undone, edited or deleted, salary lines, claim decisions, attendance
 * someone overwrote or removed, team-list changes, and intake emails that
 * were turned away.
 *
 * Writing is best effort: a change is never refused because its audit row
 * couldn't be saved, and everything keeps working before the migration has
 * run. Server only.
 */

const TABLE = "team_audit";

export type AuditArea = "payments" | "payroll" | "claims" | "attendance" | "people" | "intake";

export type AuditEntry = {
  /** Who did it: a staff email, or the sender's address for intake emails. */
  actor: string;
  area: AuditArea;
  /** A short verb: "paid", "undone", "deleted", "skipped"… */
  action: string;
  /** What it was done to: a payment id, a person's email, an email's subject. */
  subject: string;
  /** Anything worth keeping: the values before and after, or the reason. */
  detail?: Record<string, unknown>;
};

let warned = false;

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const result = await insertRow(TABLE, {
      actor: entry.actor.slice(0, 254),
      area: entry.area,
      action: entry.action.slice(0, 40),
      subject: entry.subject.slice(0, 300),
      detail: entry.detail ?? {},
    });
    if (result.ok) return;
    if (isMissingTable(result.message)) {
      // Say it once per server start, not on every change.
      if (!warned) console.warn(`[team] ${TABLE} isn't there yet: run 20261114120000_team_fixes.sql to keep an audit trail`);
      warned = true;
      return;
    }
    console.error(`[team] saving an audit row failed: ${result.message}`);
  } catch (error) {
    console.error("[team] saving an audit row failed", error);
  }
}

export type AuditRow = AuditEntry & { id: string; created_at: string };

/** The latest rows for an area, newest first; empty before the migration. */
export async function listAudit(area: AuditArea, options: { action?: string; limit?: number } = {}): Promise<AuditRow[]> {
  const query = new URLSearchParams({
    select: "id,created_at,actor,area,action,subject,detail",
    area: `eq.${area}`,
    order: "created_at.desc",
    limit: String(options.limit ?? 20),
  });
  if (options.action) query.set("action", `eq.${options.action}`);
  const result = await selectRows(TABLE, query);
  if (!result.ok) {
    if (!isMissingTable(result.message)) console.error(`[team] reading ${TABLE} failed: ${result.message}`);
    return [];
  }
  return result.rows.flatMap((row): AuditRow[] => {
    if (typeof row.id !== "string" || typeof row.subject !== "string") return [];
    return [
      {
        id: row.id,
        created_at: String(row.created_at ?? ""),
        actor: String(row.actor ?? ""),
        area,
        action: String(row.action ?? ""),
        subject: row.subject,
        detail: row.detail && typeof row.detail === "object" ? (row.detail as Record<string, unknown>) : {},
      },
    ];
  });
}
