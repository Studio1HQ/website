import { renderEmail } from "@/lib/internal/email-templates";
import { isMailerConfigured, sendMail } from "@/lib/mailer";
import { baseUrl } from "@/lib/site";
import { nameFromEmail } from "@/lib/internal/blog/data";

/**
 * Emails about a post's review: a review request to the chosen reviewers,
 * and changes requested, approvals, comments and publishes to the people
 * on the post. The person who acted never gets their own email. Without
 * SMTP nothing is sent; the dashboard's Blog badge still shows what's waiting.
 */
export async function notifyPeople(
  recipients: string[],
  actor: string,
  postId: string,
  message: { subject: string; text: string; note?: string },
) {
  const to = [...new Set(recipients.map((email) => email.toLowerCase()))].filter((email) => email !== actor);
  if (!to.length || !isMailerConfigured()) return;
  const body = [
    "Hi,",
    message.text,
    message.note ? `${nameFromEmail(actor)} wrote:\n${message.note.trim().slice(0, 2000)}` : "",
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
