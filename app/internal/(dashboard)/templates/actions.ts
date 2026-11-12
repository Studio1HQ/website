"use server";

import {
  DEFAULT_CALL_URL,
  SAMPLE_VARS,
  fillTemplate,
  reasonFor,
  renderEmail,
  templatesFor,
  type FormKey,
} from "@/lib/internal/email-templates";
import { requireStaff } from "@/lib/internal/session";
import { isMailerConfigured, sendMail } from "@/lib/mailer";
import { unsubscribeHeaders, unsubscribeUrl } from "@/lib/unsubscribe";

const PIPELINES: FormKey[] = ["jobs", "cohort", "hackathons"];

export type TestSendResult = { ok: true; to: string } | { ok: false; message: string };

/**
 * Sends one template, filled with the sample details, to the signed-in
 * person only: the real sender, layout and footer, with "[Test]" in the
 * subject. Nothing is logged against an entry. Reviewers and admins.
 */
export async function sendTestEmail(pipeline: unknown, templateKey: unknown): Promise<TestSendResult> {
  const staff = await requireStaff("reviewer");
  const form = PIPELINES.find((key) => key === pipeline);
  const template = form ? templatesFor(form).find((item) => item.key === templateKey) : undefined;
  if (!form || !template) return { ok: false, message: "Unknown template." };
  if (!isMailerConfigured()) return { ok: false, message: "Sending email isn't set up yet (RESEND_API_KEY)." };

  const vars = {
    ...SAMPLE_VARS[form],
    sender: template.automatic
      ? "The Studio1 team"
      : (staff.email.split("@")[0].split(/[._+-]/)[0] || "Studio1").replace(/^./, (c) => c.toUpperCase()),
  };
  const unsubscribe = await unsubscribeUrl(staff.email);
  const { html, text } = renderEmail({
    body: fillTemplate(template.body || "Hi {first_name},\n\n(Your message.)\n\n{sender}\nStudio1", vars),
    call: template.call ? { label: "Book a call", url: DEFAULT_CALL_URL } : null,
    reason: reasonFor(form, vars.program),
    unsubscribeUrl: unsubscribe,
    banner: { pipeline: form, template: template.key },
    program: vars.program,
  });

  try {
    await sendMail(
      {
        to: staff.email,
        subject: `[Test] ${fillTemplate(template.subject || "(You write the subject.)", vars)}`,
        html,
        text,
        headers: unsubscribeHeaders(unsubscribe),
      },
      form,
    );
  } catch (error) {
    console.error("[internal] test email failed", error);
    return { ok: false, message: "The test email didn't send. Try again in a minute." };
  }
  return { ok: true, to: staff.email };
}
