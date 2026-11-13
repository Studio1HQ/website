import { renderEmail, withoutLinks } from "@/lib/internal/email-templates";
import { membersWith } from "@/lib/internal/members";
import { isMailerConfigured, sendMail } from "@/lib/mailer";
import { baseUrl } from "@/lib/site";
import { nameFromEmail } from "@/lib/internal/blog/data";

/**
 * Emails about a post's review: a review request to the chosen reviewers,
 * and changes requested, approvals, comments and publishes to the people
 * on the post. The person who acted never gets their own email, and
 * neither does anyone who can't open the blog anymore (turned off, or the
 * role taken away). Without SMTP nothing is sent; the dashboard's Blog badge
 * still shows what's waiting.
 *
 * `text` is the dashboard's own sentence; callers take links out of any
 * title or quote they put in it. `note` is what a person typed: it goes in
 * as plain text, never as a link.
 */
export async function notifyPeople(
  recipients: string[],
  actor: string,
  postId: string,
  message: { subject: string; text: string; note?: string },
) {
  const asked = [...new Set(recipients.map((email) => email.toLowerCase()))].filter((email) => email !== actor);
  if (!asked.length || !isMailerConfigured()) return;
  const active = new Set(await membersWith(["admin", "blog_reviewer", "blog_writer"]));
  const to = asked.filter((email) => active.has(email));
  if (!to.length) return;
  const note = withoutLinks(message.note?.trim().slice(0, 2000) ?? "");
  const body = [
    "Hi,",
    message.text,
    note ? `${nameFromEmail(actor)} wrote:\n${note}` : "",
    "The Studio1 blog",
  ]
    .filter(Boolean)
    .join("\n\n");
  const { html, text } = renderEmail({
    body,
    call: { label: "Open the post", url: `${baseUrl}/internal/blog/${postId}` },
    reason: "You're getting this because you write or review posts for the Studio1 blog.",
  });
  await Promise.allSettled(
    to.map((recipient) =>
      sendMail({ to: recipient, subject: message.subject, html, text, replyTo: actor }).catch((error) => {
        console.error("[blog] notification email failed", error);
      }),
    ),
  );
}
