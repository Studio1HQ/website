"use server";

import { revalidatePath } from "next/cache";
import {
  blockedAddresses,
  blockedReason,
  cleanNonce,
  logEmails,
  parseSendAt,
  recordAccepted,
  recordDelivery,
  sendKey,
  sendsLeftThisHour,
} from "@/lib/email-delivery";
import { firstName } from "@/lib/first-name";
import { isEmailAddress } from "@/lib/form-checks";
import { cancelScheduled, isMailerConfigured, sendMail } from "@/lib/mailer";
import { selectRows } from "@/lib/supabase-server";
import { updateEntries } from "@/lib/internal/data";
import {
  DEFAULT_CALL_URL,
  composerTemplate,
  fillTemplate,
  reasonFor,
  renderEmail,
  senderName,
} from "@/lib/internal/email-templates";
import { programOf } from "@/lib/internal/program";
import { PIPELINES, SECTIONS, UUID_PATTERN, sectionFor, statusLabel } from "@/lib/internal/sections";
import { requireStaff } from "@/lib/internal/session";
import { unsubscribeUrl } from "@/lib/unsubscribe";

export type SendResult =
  | {
      ok: true;
      scheduledFor?: string;
      /** The email went, but something after it didn't (the log, the status). */
      warning?: string;
    }
  | { ok: false; message: string; notConfigured?: boolean };

/**
 * Emails one applicant from the dashboard in the paper layout, now or at a
 * set time (`sendAt`, up to 30 days ahead). Reviewers and admins only. The
 * recipient always comes from the stored entry, never from the browser;
 * replies go to whoever sent it. Addresses that bounced or complained before
 * are refused.
 *
 * A repeat of the same send (a double click, a retry after a timeout) goes
 * out once: Resend gets a key made from the sender, the entry, the text and
 * the composer's `nonce`. If the email goes but the log or the status
 * change fails, the result says so instead of looking like a clean send.
 *
 * No List-Unsubscribe header: this is an email about the person's own
 * application, which unsubscribing doesn't stop. The footer link is there
 * for the updates.
 */
export async function sendEntryEmail(
  sectionKey: unknown,
  id: unknown,
  input: unknown,
): Promise<SendResult> {
  const staff = await requireStaff("reviewer");
  const section = sectionFor(sectionKey);
  const fields = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const subject = typeof fields.subject === "string" ? fields.subject.trim() : "";
  const body = typeof fields.body === "string" ? fields.body.trim() : "";
  const template = composerTemplate(section?.key, fields.template);
  const callUrl = typeof fields.callUrl === "string" ? fields.callUrl.trim() : DEFAULT_CALL_URL;
  const status = typeof fields.status === "string" ? fields.status : undefined;
  const sendAt = parseSendAt(fields.sendAt);
  if (!sendAt.ok) return { ok: false, message: sendAt.message };
  if (
    !section?.statuses ||
    !template ||
    typeof id !== "string" ||
    !UUID_PATTERN.test(id) ||
    !subject ||
    subject.length > 200 ||
    !body ||
    body.length > 10_000 ||
    (fields.call === true && !/^https:\/\/\S{3,500}$/.test(callUrl)) ||
    (status !== undefined && !section.statuses.includes(status))
  ) {
    return { ok: false, message: "Check the subject, message and call link." };
  }
  if (!isMailerConfigured()) {
    return { ok: false, notConfigured: true, message: "Sending email from the dashboard isn't set up yet." };
  }

  const found = await selectRows(section.table, new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" }));
  if (!found.ok) {
    console.error(`[internal] email: reading ${section.table} ${id} failed: ${found.message}`);
    return { ok: false, message: "Couldn't load this entry. Try again in a minute." };
  }
  const record = found.rows[0];
  if (!record) return { ok: false, message: "This entry doesn't exist any more." };
  const to = typeof record.email === "string" ? record.email.trim() : "";
  if (!isEmailAddress(to)) return { ok: false, message: "This entry has no email address we can send to." };
  const blocked = (await blockedAddresses([to])).get(to.toLowerCase());
  if (blocked) {
    return { ok: false, message: `Not sent: this address ${blockedReason(blocked)} before, so we've stopped emailing it.` };
  }
  if ((await sendsLeftThisHour(staff.email)) < 1) {
    return { ok: false, message: "You've reached the hourly limit for emails from the dashboard. Try again in a while." };
  }

  const vars = {
    first_name: firstName(String(record.name ?? "")),
    program: programOf(section, record),
    sender: senderName(staff.email),
  };
  const personalSubject = fillTemplate(subject, vars);
  const unsubscribe = await unsubscribeUrl(to);
  const { html, text } = renderEmail({
    body: fillTemplate(body, vars),
    call: fields.call === true ? { label: "Book a call", url: callUrl } : null,
    reason: reasonFor(section.key, vars.program),
    unsubscribeUrl: unsubscribe,
    banner: { pipeline: template.pipeline, template: template.key },
    program: vars.program,
  });

  let resendId: string | null;
  try {
    ({ id: resendId } = await sendMail({ to, subject: personalSubject, html, text, replyTo: staff.email }, template.pipeline, {
      scheduledAt: sendAt.at,
      idempotencyKey: sendKey({
        sender: staff.email,
        table: section.table,
        ids: [id],
        subject,
        body,
        extra: [template.key, fields.call === true ? callUrl : null, sendAt.at],
        nonce: cleanNonce(fields.nonce),
      }),
    }));
  } catch (error) {
    console.error("[internal] sending applicant email failed", error);
    return { ok: false, message: "The email didn't send. Try again in a minute." };
  }

  // The email has gone (or is scheduled). Anything that fails from here is
  // reported, not hidden: a missing log entry invites a second send.
  const problems: string[] = [];
  await recordAccepted([{ resendId, to }], sendAt.at ? "scheduled" : "sent");
  const logged = await logEmails([
    {
      source_table: section.table,
      record_id: id,
      to_email: to.toLowerCase(),
      template: template.key,
      subject: personalSubject,
      sent_by: staff.email,
      resend_id: resendId,
      scheduled_for: sendAt.at ?? null,
    },
  ]);
  if (!logged.ok) {
    console.error(`[internal] logging the email failed: ${logged.message}`);
    problems.push("it isn't listed under Emails sent");
  }
  if (status) {
    const moved = await updateEntries(section, [id], { status });
    if (!moved.ok) problems.push(`the status didn't move to ${statusLabel(status)}`);
  }
  revalidatePath("/internal", "layout");
  return {
    ok: true,
    scheduledFor: sendAt.at,
    ...(problems.length
      ? { warning: `The email ${sendAt.at ? "is scheduled" : "was sent"}, but ${problems.join(" and ")}. Don't send it again.` }
      : {}),
  };
}

/** The tables whose emails the pipeline pages list, and so can cancel. */
const PIPELINE_TABLES = PIPELINES.map((key) => SECTIONS[key].table);

/**
 * Cancels an email scheduled from a pipeline entry, before it goes.
 * Reviewers and admins only; the log entry stays, marked canceled. Emails
 * logged by other parts of the dashboard aren't theirs to cancel.
 */
export async function cancelScheduledEmail(logId: unknown): Promise<SendResult> {
  await requireStaff("reviewer");
  if (typeof logId !== "string" || !UUID_PATTERN.test(logId)) return { ok: false, message: "Unknown email." };
  const found = await selectRows(
    "internal_email_log",
    new URLSearchParams({ select: "id,source_table,to_email,resend_id,scheduled_for", id: `eq.${logId}`, limit: "1" }),
  );
  if (!found.ok) {
    console.error(`[internal] reading the email log failed: ${found.message}`);
    return { ok: false, message: "Couldn't load that email. Try again in a minute." };
  }
  const row = found.rows[0];
  const resendId = typeof row?.resend_id === "string" ? row.resend_id : "";
  const scheduledFor = typeof row?.scheduled_for === "string" ? Date.parse(row.scheduled_for) : Number.NaN;
  if (!row || !PIPELINE_TABLES.includes(String(row.source_table)) || !resendId || !(scheduledFor > Date.now())) {
    return { ok: false, message: "This email isn't waiting to be sent any more." };
  }
  try {
    await cancelScheduled(resendId);
  } catch (error) {
    console.error("[internal] canceling a scheduled email failed", error);
    return { ok: false, message: "Resend couldn't cancel it. It may already be on its way." };
  }
  const recorded = await recordDelivery({ resendId, to: String(row.to_email), status: "canceled" });
  revalidatePath("/internal", "layout");
  if (!recorded.ok) {
    console.error(`[internal] marking the email canceled failed: ${recorded.message}`);
    return { ok: true, warning: "The email is canceled, but it may still show as scheduled here for a while." };
  }
  return { ok: true };
}
