"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { firstName } from "@/lib/first-name";
import { blockedAddresses, logEmails, parseSendAt, recordAccepted } from "@/lib/email-delivery";
import { isMailerConfigured, sendBatch, type MailMessage } from "@/lib/mailer";
import { selectRows } from "@/lib/supabase-server";
import { updateEntries } from "@/lib/internal/data";
import type { EmailPipeline } from "@/lib/internal/email-banners";
import { DEFAULT_CALL_URL, fillTemplate, reasonFor, renderEmail } from "@/lib/internal/email-templates";
import { programOf } from "@/lib/internal/program";
import { UUID_PATTERN, sectionFor } from "@/lib/internal/sections";
import { requireStaff } from "@/lib/internal/session";
import { unsubscribeHeaders, unsubscribeUrl } from "@/lib/unsubscribe";

export type BulkResult =
  | { ok: true; sent: number; skipped: number; blocked: number; scheduledFor?: string }
  | { ok: false; message: string; notConfigured?: boolean };

/** The most a single bulk send can reach (Resend's batch limit). */
const MAX_RECIPIENTS = 100;

/**
 * One template to many entries: everyone gets their own copy, with their
 * own first name and role, in one request to Resend, now or at a set time
 * (`sendAt`, up to 30 days ahead). Reviewers and admins only. Recipients
 * always come from the stored entries, never the browser. Addresses that
 * bounced or complained before are skipped. Each email is logged on its
 * entry, and the status can move with it (straight away, even if scheduled).
 */
export async function sendBulkEmail(
  sectionKey: unknown,
  ids: unknown,
  input: unknown,
): Promise<BulkResult> {
  const staff = await requireStaff("reviewer");
  const section = sectionFor(sectionKey);
  const idList = Array.isArray(ids) ? [...new Set(ids)] : [];
  const fields = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const subject = typeof fields.subject === "string" ? fields.subject.trim() : "";
  const body = typeof fields.body === "string" ? fields.body.trim() : "";
  const template = typeof fields.template === "string" ? fields.template.slice(0, 40) : "custom";
  const callUrl = typeof fields.callUrl === "string" ? fields.callUrl.trim() : DEFAULT_CALL_URL;
  const status = typeof fields.status === "string" ? fields.status : undefined;
  const sendAt = parseSendAt(fields.sendAt);
  if (!sendAt.ok) return { ok: false, message: sendAt.message };
  if (
    !section?.statuses ||
    idList.length === 0 ||
    idList.length > MAX_RECIPIENTS ||
    !idList.every((id) => typeof id === "string" && UUID_PATTERN.test(id)) ||
    !subject ||
    subject.length > 200 ||
    !body ||
    body.length > 10_000 ||
    (fields.call === true && !/^https:\/\/\S{3,500}$/.test(callUrl)) ||
    (status !== undefined && !section.statuses.includes(status))
  ) {
    return { ok: false, message: "Check the recipients, subject, message and call link." };
  }
  if (!isMailerConfigured()) {
    return { ok: false, notConfigured: true, message: "Sending email from the dashboard isn't set up yet." };
  }

  const found = await selectRows(
    section.table,
    new URLSearchParams({ select: "*", id: `in.(${idList.join(",")})` }),
  );
  if (!found.ok) {
    console.error(`[internal] bulk email: reading ${section.table} failed: ${found.message}`);
    return { ok: false, message: "Couldn't load those entries. Try again in a minute." };
  }

  const blocked = await blockedAddresses(found.rows.map((record) => String(record.email ?? "")));
  let blockedCount = 0;
  const sender = firstName(staff.email.split("@")[0].replace(/[._+-]+/g, " "));
  const pipeline = section.key as EmailPipeline;
  const messages: MailMessage[] = [];
  const sentRows: { id: string; email: string; subject: string }[] = [];
  for (const record of found.rows) {
    const to = typeof record.email === "string" ? record.email.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) continue;
    if (blocked.has(to.toLowerCase())) {
      blockedCount += 1;
      continue;
    }
    const vars = { first_name: firstName(String(record.name ?? "")), program: programOf(section, record), sender };
    const unsubscribe = await unsubscribeUrl(to);
    const personalSubject = fillTemplate(subject, vars);
    const { html, text } = renderEmail({
      body: fillTemplate(body, vars),
      call: fields.call === true ? { label: "Book a call", url: callUrl } : null,
      reason: reasonFor(section.key, vars.program),
      unsubscribeUrl: unsubscribe,
      banner: { pipeline, template },
      program: vars.program,
    });
    messages.push({
      to,
      subject: personalSubject,
      html,
      text,
      replyTo: staff.email,
      headers: unsubscribeHeaders(unsubscribe),
    });
    sentRows.push({ id: String(record.id), email: to.toLowerCase(), subject: personalSubject });
  }
  const skipped = idList.length - sentRows.length - blockedCount;
  if (messages.length === 0) {
    return {
      ok: false,
      message: blockedCount
        ? "Everyone selected either has no email address or bounced or complained before."
        : "None of those entries has an email address we can use.",
    };
  }

  let resendIds: (string | null)[];
  try {
    resendIds = await sendBatch(messages, `bulk-${randomUUID()}`, pipeline, { scheduledAt: sendAt.at });
  } catch (error) {
    console.error("[internal] bulk email failed", error);
    return { ok: false, message: "Resend didn't accept the emails. Check the Resend dashboard before trying again." };
  }

  await recordAccepted(
    sentRows.map((row, index) => ({ resendId: resendIds[index] ?? null, to: row.email })),
    sendAt.at ? "scheduled" : "sent",
  );
  const logged = await logEmails(
    sentRows.map((row, index) => ({
      source_table: section.table,
      record_id: row.id,
      to_email: row.email,
      template,
      subject: row.subject,
      sent_by: staff.email,
      resend_id: resendIds[index] ?? null,
      scheduled_for: sendAt.at ?? null,
    })),
  );
  if (!logged.ok) console.error(`[internal] logging the bulk email failed: ${logged.message}`);
  if (status) await updateEntries(section, sentRows.map((row) => row.id), { status });
  revalidatePath("/internal", "layout");
  return { ok: true, sent: sentRows.length, skipped, blocked: blockedCount, scheduledFor: sendAt.at };
}
