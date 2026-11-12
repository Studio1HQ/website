"use server";

import { revalidatePath } from "next/cache";
import {
  blockedAddresses,
  blockedReason,
  logEmails,
  parseSendAt,
  recordAccepted,
  recordDelivery,
} from "@/lib/email-delivery";
import { cancelScheduled, isMailerConfigured, sendMail } from "@/lib/mailer";
import { selectRows } from "@/lib/supabase-server";
import { programOf, updateEntries } from "@/lib/internal/data";
import {
  DEFAULT_CALL_URL,
  fillTemplate,
  firstName,
  reasonFor,
  renderEmail,
} from "@/lib/internal/email-templates";
import type { EmailPipeline } from "@/lib/internal/email-banners";
import { UUID_PATTERN, sectionFor } from "@/lib/internal/sections";
import { requireStaff } from "@/lib/internal/session";
import { unsubscribeHeaders, unsubscribeUrl } from "@/lib/unsubscribe";

export type SendResult =
  | { ok: true; scheduledFor?: string }
  | { ok: false; message: string; notConfigured?: boolean };

/**
 * Emails one applicant from the dashboard in the paper layout, now or at a
 * set time (`sendAt`, up to 30 days ahead). Reviewers and admins only. The
 * recipient always comes from the stored entry, never from the browser;
 * replies go to whoever sent it. Addresses that bounced or complained before
 * are refused.
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
  const template = typeof fields.template === "string" ? fields.template.slice(0, 40) : "custom";
  const callUrl = typeof fields.callUrl === "string" ? fields.callUrl.trim() : DEFAULT_CALL_URL;
  const status = typeof fields.status === "string" ? fields.status : undefined;
  const sendAt = parseSendAt(fields.sendAt);
  if (!sendAt.ok) return { ok: false, message: sendAt.message };
  if (
    !section?.statuses ||
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
  const record = found.ok ? found.rows[0] : undefined;
  const to = typeof record?.email === "string" ? record.email : "";
  if (!record || !to.includes("@")) return { ok: false, message: "This entry has no email address." };
  const blocked = (await blockedAddresses([to])).get(to.toLowerCase());
  if (blocked) {
    return { ok: false, message: `Not sent: this address ${blockedReason(blocked)} before, so we've stopped emailing it.` };
  }

  const vars = {
    first_name: firstName(String(record.name ?? "")),
    program: programOf(section, record),
    sender: firstName(staff.email.split("@")[0].replace(/[._+-]+/g, " ")),
  };
  const unsubscribe = await unsubscribeUrl(to);
  const { html, text } = renderEmail({
    body: fillTemplate(body, vars),
    call: fields.call === true ? { label: "Book a call", url: callUrl } : null,
    reason: reasonFor(section.key, vars.program),
    unsubscribeUrl: unsubscribe,
    banner: { pipeline: section.key as EmailPipeline, template },
    program: vars.program,
  });

  let resendId: string | null;
  try {
    ({ id: resendId } = await sendMail(
      {
        to,
        subject: fillTemplate(subject, vars),
        html,
        text,
        replyTo: staff.email,
        headers: unsubscribeHeaders(unsubscribe),
      },
      section.key as EmailPipeline,
      { scheduledAt: sendAt.at },
    ));
  } catch (error) {
    console.error("[internal] sending applicant email failed", error);
    return { ok: false, message: "The email didn't send. Try again in a minute." };
  }

  await recordAccepted([{ resendId, to }], sendAt.at ? "scheduled" : "sent");
  const logged = await logEmails([
    {
      source_table: section.table,
      record_id: id,
      to_email: to.toLowerCase(),
      template,
      subject: fillTemplate(subject, vars),
      sent_by: staff.email,
      resend_id: resendId,
      scheduled_for: sendAt.at ?? null,
    },
  ]);
  if (!logged.ok) console.error(`[internal] logging the email failed: ${logged.message}`);
  if (status) await updateEntries(section, [id], { status });
  revalidatePath("/internal", "layout");
  return { ok: true, scheduledFor: sendAt.at };
}

/**
 * Cancels an email scheduled from the dashboard, before it goes. Reviewers
 * and admins only; the log entry stays, marked canceled.
 */
export async function cancelScheduledEmail(logId: unknown): Promise<SendResult> {
  await requireStaff("reviewer");
  if (typeof logId !== "string" || !UUID_PATTERN.test(logId)) return { ok: false, message: "Unknown email." };
  const found = await selectRows(
    "internal_email_log",
    new URLSearchParams({ select: "id,to_email,resend_id,scheduled_for", id: `eq.${logId}`, limit: "1" }),
  );
  const row = found.ok ? found.rows[0] : undefined;
  const resendId = typeof row?.resend_id === "string" ? row.resend_id : "";
  const scheduledFor = typeof row?.scheduled_for === "string" ? Date.parse(row.scheduled_for) : Number.NaN;
  if (!row || !resendId || !(scheduledFor > Date.now())) {
    return { ok: false, message: "This email isn't waiting to be sent any more." };
  }
  try {
    await cancelScheduled(resendId);
  } catch (error) {
    console.error("[internal] canceling a scheduled email failed", error);
    return { ok: false, message: "Resend couldn't cancel it. It may already be on its way." };
  }
  const recorded = await recordDelivery({ resendId, to: String(row.to_email), status: "canceled" });
  if (!recorded.ok) console.error(`[internal] marking the email canceled failed: ${recorded.message}`);
  revalidatePath("/internal", "layout");
  return { ok: true };
}
