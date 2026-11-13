"use server";

import {
  DEFAULT_CALL_URL,
  SAMPLE_VARS,
  fillTemplate,
  reasonFor,
  renderEmail,
  senderName,
  templatesFor,
  type FormKey,
} from "@/lib/internal/email-templates";
import { SECTIONS, sectionAccess } from "@/lib/internal/sections";
import { requireMember } from "@/lib/internal/session";
import { isMailerConfigured, sendMail } from "@/lib/mailer";
import { unsubscribeUrl } from "@/lib/unsubscribe";

const PIPELINES: FormKey[] = ["jobs", "cohort", "hackathons"];

export type TestSendResult = { ok: true; to: string } | { ok: false; message: string };

/**
 * Sends one template, filled with the sample details, to the signed-in
 * person only: the real sender, layout and footer, with "[Test]" in the
 * subject. Nothing is logged against an entry. Whoever can email from that
 * pipeline: reviewers and admins, community managers for hackathons.
 */
export async function sendTestEmail(pipeline: unknown, templateKey: unknown): Promise<TestSendResult> {
  const staff = await requireMember();
  const form = PIPELINES.find((key) => key === pipeline);
  const template = form ? templatesFor(form).find((item) => item.key === templateKey) : undefined;
  if (!form || !template) return { ok: false, message: "Unknown template." };
  if (sectionAccess(staff, SECTIONS[form]) !== "edit") return { ok: false, message: "You can't send emails from this pipeline." };
  if (!isMailerConfigured()) return { ok: false, message: "Sending email isn't set up yet (RESEND_API_KEY)." };

  const vars = {
    ...SAMPLE_VARS[form],
    sender: template.automatic ? "The Studio1 team" : senderName(staff.email),
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
      },
      form,
    );
  } catch (error) {
    console.error("[internal] test email failed", error);
    return { ok: false, message: "The test email didn't send. Try again in a minute." };
  }
  return { ok: true, to: staff.email };
}
