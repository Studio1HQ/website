import "server-only";
import { isMissingTable } from "@/lib/internal/community/data";
import {
  INBOUND_MIGRATION_HINT,
  type InboundLoad,
} from "@/lib/internal/inbound/schema";
import { mailCutoff } from "@/lib/internal/inbound/rules";
import { TABLES } from "@/lib/internal/inbound/data";
import { selectRows } from "@/lib/supabase-server";

/**
 * Mail for the Review page. Call after requireInbound(). Only what the page
 * shows is read: never body_text or headers. The text is a stranger's, so
 * the page renders it as plain text only.
 */

export type ReviewMail = {
  id: string;
  received_at: string;
  from_address: string;
  from_name: string;
  subject: string;
  excerpt: string;
  label: string;
  decided_by: string;
  reason: string;
  confidence: number | null;
  /** "not_lead" when a person already said so; "" otherwise. */
  correction: "" | "not_lead";
};

const COLUMNS =
  "id,received_at,from_address,from_name,subject,excerpt,label,decided_by,reason,confidence,correction";

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function toReviewMail(row: Record<string, unknown>): ReviewMail {
  const confidence =
    row.confidence === null || row.confidence === undefined
      ? null
      : Number(row.confidence);
  return {
    id: text(row.id),
    received_at: text(row.received_at),
    from_address: text(row.from_address),
    from_name: text(row.from_name),
    subject: text(row.subject),
    excerpt: text(row.excerpt),
    label: text(row.label),
    decided_by: text(row.decided_by),
    reason: text(row.reason),
    confidence:
      confidence !== null && Number.isFinite(confidence) ? confidence : null,
    correction: row.correction === "not_lead" ? "not_lead" : "",
  };
}

function failed(what: string, message: string): InboundLoad<ReviewMail[]> {
  const missing = isMissingTable(message);
  if (!missing) console.error(`[inbound] reading ${what} failed: ${message}`);
  return {
    ok: false,
    missing,
    message: missing
      ? INBOUND_MIGRATION_HINT
      : "Couldn't load mail just now. Reload in a minute.",
  };
}

/** Held mail nobody has decided on yet, newest first. */
export async function listHeldForReview(): Promise<InboundLoad<ReviewMail[]>> {
  const result = await selectRows<Record<string, unknown>>(
    TABLES.mail,
    new URLSearchParams({
      select: COLUMNS,
      held: "is.true",
      correction: "eq.",
      order: "received_at.desc",
      limit: "200",
    }),
  );
  if (!result.ok) return failed("held mail", result.message);
  return { ok: true, value: result.rows.map(toReviewMail) };
}

/**
 * Mail sorted in the kept window that was not held and did not become a
 * lead, newest first. Mail a person marked as a lead is left out: it is on
 * its way to becoming one.
 */
export async function listSkippedMail(): Promise<InboundLoad<ReviewMail[]>> {
  const result = await selectRows<Record<string, unknown>>(
    TABLES.mail,
    new URLSearchParams({
      select: COLUMNS,
      status: "eq.sorted",
      held: "is.false",
      org_id: "is.null",
      correction: "neq.lead",
      received_at: `gte.${mailCutoff()}`,
      order: "received_at.desc",
      limit: "300",
    }),
  );
  if (!result.ok) return failed("skipped mail", result.message);
  return { ok: true, value: result.rows.map(toReviewMail) };
}
