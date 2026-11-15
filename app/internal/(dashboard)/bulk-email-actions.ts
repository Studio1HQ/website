"use server";

import { revalidatePath } from "next/cache";
import { firstName } from "@/lib/first-name";
import { isEmailAddress } from "@/lib/form-checks";
import {
  HOURLY_SEND_CAP,
  blockedAddresses,
  cleanNonce,
  logEmails,
  parseSendAt,
  recordAccepted,
  sendKey,
  sendsLeftThisHour,
} from "@/lib/email-delivery";
import { isMailerConfigured, sendBatch, type MailMessage } from "@/lib/mailer";
import { selectRows } from "@/lib/supabase-server";
import { updateEntries } from "@/lib/internal/data";
import {
  DEFAULT_CALL_URL,
  composerTemplate,
  fillTemplate,
  reasonFor,
  renderEmail,
  senderName,
  unfilledParts,
} from "@/lib/internal/email-templates";
import { programOf } from "@/lib/internal/program";
import { UUID_PATTERN, sectionFor, statusLabel } from "@/lib/internal/sections";
import { sectionsChanged } from "@/lib/internal/section-cache";
import { requireMember, requireSection } from "@/lib/internal/session";
import { unsubscribeUrl } from "@/lib/unsubscribe";

export type BulkResult =
  | {
      ok: true;
      sent: number;
      skipped: number;
      blocked: number;
      /** Left out because they'd already been sent this template. */
      already: number;
      scheduledFor?: string;
      /** The emails went, but something after them didn't (the log, the status). */
      warning?: string;
    }
  | { ok: false; message: string; notConfigured?: boolean };

/** The most a single bulk send can reach (Resend's batch limit). */
const MAX_RECIPIENTS = 100;

/**
 * One template to many entries: everyone gets their own copy, with their
 * own first name and role, in one request to Resend, now or at a set time
 * (`sendAt`, up to 30 days ahead). Whoever can edit the section. Recipients
 * always come from the stored entries, never the browser. Addresses that
 * bounced or complained before are skipped, and so is anyone who was
 * already sent this template, unless `again` asks for it. Each email is logged on its
 * entry, and the status can move with it (straight away, even if scheduled).
 *
 * A repeat of the same send (a double click, a retry after a timeout) goes
 * out once: Resend gets a key made from the sender, the entries, the text
 * and the dialog's `nonce`. One person can send HOURLY_SEND_CAP emails an
 * hour. If the emails go but the log or the status change fails, the result
 * says so instead of looking like a clean send.
 *
 * No List-Unsubscribe header: these are emails about each person's own
 * application or registration, which unsubscribing doesn't stop. The footer
 * link is there for the updates.
 */
export async function sendBulkEmail(
  sectionKey: unknown,
  ids: unknown,
  input: unknown,
): Promise<BulkResult> {
  const section = sectionFor(sectionKey);
  // The session is checked first, whatever was sent; an unknown section
  // fails the checks below.
  const staff = section ? await requireSection(section, "edit") : await requireMember();
  const idList = Array.isArray(ids) ? [...new Set(ids)] : [];
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
    idList.length === 0 ||
    idList.length > MAX_RECIPIENTS ||
    !idList.every((id): id is string => typeof id === "string" && UUID_PATTERN.test(id)) ||
    !subject ||
    subject.length > 200 ||
    !body ||
    body.length > 10_000 ||
    (fields.call === true && !/^https:\/\/\S{3,500}$/.test(callUrl)) ||
    (status !== undefined && !section.statuses.includes(status))
  ) {
    return { ok: false, message: "Check the recipients, subject, message and call link." };
  }
  // Template parts like "[start time]" left as they were.
  const unfilled = unfilledParts(`${subject}\n${body}`);
  if (unfilled.length) return { ok: false, message: `Fill in "[${unfilled[0]}]" before sending.` };
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

  // Who already got this template, from the log itself (the browser's
  // list can be a moment old). Canceled scheduled sends don't count.
  const alreadySent = new Set<string>();
  if (fields.again !== true) {
    const logged = await selectRows<{ record_id: string; resend_id: string | null }>(
      "internal_email_log",
      new URLSearchParams({
        select: "record_id,resend_id",
        source_table: `eq.${section.table}`,
        template: `eq.${template.key}`,
        record_id: `in.(${idList.join(",")})`,
      }),
    );
    if (!logged.ok) {
      console.error(`[internal] bulk email: reading the email log failed: ${logged.message}`);
      return { ok: false, message: "Couldn't check who already got this email. Try again in a minute." };
    }
    const resendIds = logged.rows.map((row) => row.resend_id).filter((id): id is string => Boolean(id));
    const canceled = resendIds.length
      ? await selectRows<{ resend_id: string }>(
          "email_delivery",
          new URLSearchParams({ select: "resend_id", status: "eq.canceled", resend_id: `in.(${resendIds.join(",")})` }),
        )
      : null;
    const dropped = new Set(canceled?.ok ? canceled.rows.map((row) => row.resend_id) : []);
    for (const row of logged.rows) if (!(row.resend_id && dropped.has(row.resend_id))) alreadySent.add(String(row.record_id));
  }

  const blocked = await blockedAddresses(found.rows.map((record) => String(record.email ?? "")));
  let blockedCount = 0;
  const sender = senderName(staff.email);
  const pipeline = template.pipeline;
  const messages: MailMessage[] = [];
  const sentRows: { id: string; email: string; subject: string }[] = [];
  let alreadyCount = 0;
  for (const record of found.rows) {
    if (alreadySent.has(String(record.id))) {
      alreadyCount += 1;
      continue;
    }
    const to = typeof record.email === "string" ? record.email.trim() : "";
    if (!isEmailAddress(to)) continue;
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
      banner: { pipeline, template: template.key },
      program: vars.program,
    });
    messages.push({ to, subject: personalSubject, html, text, replyTo: staff.email });
    sentRows.push({ id: String(record.id), email: to.toLowerCase(), subject: personalSubject });
  }
  const skipped = idList.length - sentRows.length - blockedCount - alreadyCount;
  if (messages.length === 0) {
    return {
      ok: false,
      message:
        alreadyCount === idList.length
          ? "They've all been sent this email already."
          : blockedCount
            ? "Everyone selected either has no email address, bounced or complained before, or already got this email."
            : "None of those entries has an email address we can use.",
    };
  }

  const left = await sendsLeftThisHour(staff.email);
  if (messages.length > left) {
    return {
      ok: false,
      message: `That's past the limit of ${HOURLY_SEND_CAP} emails an hour from the dashboard${left > 0 ? ` (${left} left this hour)` : ""}. Try again in a while.`,
    };
  }

  const key = sendKey({
    sender: staff.email,
    table: section.table,
    ids: sentRows.map((row) => row.id),
    subject,
    body,
    extra: [template.key, fields.call === true ? callUrl : null, sendAt.at],
    nonce: cleanNonce(fields.nonce),
  });
  let resendIds: (string | null)[];
  try {
    resendIds = await sendBatch(messages, key, pipeline, { scheduledAt: sendAt.at });
  } catch (error) {
    console.error("[internal] bulk email failed", error);
    return { ok: false, message: "Resend didn't accept the emails. Check the Resend dashboard before trying again." };
  }

  // The emails have gone (or are scheduled). Anything that fails from here
  // is reported, not hidden: a missing log entry invites a second send.
  const problems: string[] = [];
  await recordAccepted(
    sentRows.map((row, index) => ({ resendId: resendIds[index] ?? null, to: row.email })),
    sendAt.at ? "scheduled" : "sent",
  );
  const logged = await logEmails(
    sentRows.map((row, index) => ({
      source_table: section.table,
      record_id: row.id,
      to_email: row.email,
      template: template.key,
      subject: row.subject,
      sent_by: staff.email,
      resend_id: resendIds[index] ?? null,
      scheduled_for: sendAt.at ?? null,
    })),
  );
  if (!logged.ok) {
    console.error(`[internal] logging the bulk email failed: ${logged.message}`);
    problems.push("they aren't listed under Emails sent");
  }
  if (status) {
    const moved = await updateEntries(section, sentRows.map((row) => row.id), { status });
    if (!moved.ok) problems.push(`the status didn't move to ${statusLabel(status)}`);
  }
  // The lists mark who's been emailed: show it straight away.
  sectionsChanged();
  revalidatePath("/internal", "layout");
  return {
    ok: true,
    sent: sentRows.length,
    skipped,
    blocked: blockedCount,
    already: alreadyCount,
    scheduledFor: sendAt.at,
    ...(problems.length
      ? { warning: `The emails ${sendAt.at ? "are scheduled" : "were sent"}, but ${problems.join(" and ")}. Don't send them again.` }
      : {}),
  };
}
