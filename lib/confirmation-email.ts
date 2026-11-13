import { blockedAddresses, blockedReason, logEmails, recordAccepted } from "@/lib/email-delivery";
import { firstName } from "@/lib/first-name";
import { isMailerConfigured, sendMail } from "@/lib/mailer";
import {
  AUTOMATIC_SENDER,
  CONFIRMATION_EMAILS,
  fillTemplate,
  reasonFor,
  renderEmail,
  type FormKey,
} from "@/lib/internal/email-templates";
import { confirmationWithinLimit } from "@/lib/rate-limit";
import { unsubscribeUrl } from "@/lib/unsubscribe";

const TABLES: Record<FormKey, string> = {
  jobs: "job_applications",
  hackathons: "hackathon_registrations",
  cohort: "devrel_cohort_applications",
};

/**
 * The "we've received it" email a form sends once it has saved an entry.
 * Call it inside `after()` so it runs once the response has gone: a slow or
 * failed send never holds up or fails the submission. Does nothing when
 * Resend isn't set up. Repeat submissions (blocked as duplicates) and bot
 * entries never get here, so nobody gets it twice for the same entry, and
 * one inbox gets only a few a day whatever "+tag" the address carries
 * (lib/rate-limit.ts).
 *
 * No List-Unsubscribe header: this is an email about the entry itself,
 * which unsubscribing doesn't stop. The footer link turns off the updates.
 *
 * The email is logged on the entry, so the dashboard shows it under
 * "Emails sent" as sent automatically.
 */
export async function sendConfirmation(
  form: FormKey,
  entry: { id: string; name: string; email: string; program: string },
) {
  if (!isMailerConfigured()) return;
  const blocked = await blockedAddresses([entry.email]);
  if (blocked.size) {
    console.warn(`[${form}] confirmation skipped: the address ${blockedReason([...blocked.values()][0])} before`);
    return;
  }
  if (!(await confirmationWithinLimit(entry.email))) {
    console.warn(`[${form}] confirmation skipped: this address has had its confirmation emails for today`);
    return;
  }
  const template = CONFIRMATION_EMAILS[form];
  const vars = { first_name: firstName(entry.name), program: entry.program, sender: "Studio1" };
  const subject = fillTemplate(template.subject, vars);
  const unsubscribe = await unsubscribeUrl(entry.email);
  const { html, text } = renderEmail({
    body: fillTemplate(template.body, vars),
    reason: reasonFor(form, entry.program),
    unsubscribeUrl: unsubscribe,
    banner: { pipeline: form, template: "confirmation" },
    program: entry.program,
  });

  let resendId: string | null;
  try {
    ({ id: resendId } = await sendMail(
      { to: entry.email, subject, html, text },
      form,
    ));
  } catch (error) {
    console.error(`[${form}] confirmation email failed`, error);
    return;
  }

  await recordAccepted([{ resendId, to: entry.email }], "sent");
  const logged = await logEmails([
    {
      source_table: TABLES[form],
      record_id: entry.id,
      to_email: entry.email.toLowerCase(),
      template: "confirmation",
      subject,
      sent_by: AUTOMATIC_SENDER,
      resend_id: resendId,
    },
  ]);
  if (!logged.ok) console.error(`[${form}] logging the confirmation email failed: ${logged.message}`);
}
