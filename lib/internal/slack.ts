import { baseUrl } from "@/lib/site";
import type { FormKey } from "@/lib/internal/email-templates";

/**
 * A Slack message for every new form entry, through a Slack incoming
 * webhook (Slack → Apps → Incoming Webhooks → Add to a channel).
 *
 *   SLACK_WEBHOOK_URL            the channel for every form
 *   SLACK_WEBHOOK_URL_JOBS       optional: job applications go here instead
 *   SLACK_WEBHOOK_URL_HACKATHONS optional: hackathon registrations
 *   SLACK_WEBHOOK_URL_COHORT     optional: DevRel Cohort applications
 *
 * The message has what they applied for, where they are and a link into the
 * dashboard, which asks for sign-in. No name, email address, links or
 * answers: Slack keeps messages, and the dashboard is the place for
 * applicants' details. Call it inside `after()`; without a webhook it does
 * nothing. Duplicates and spam-guard drops return before it's called.
 */

export type NewEntry = {
  form: FormKey;
  id: string;
  /** The role, hackathon or cohort they applied for. */
  program: string;
  /** The city or country they gave. */
  place?: string;
};

const FORMS: Record<FormKey, { label: string; path: string; env: string }> = {
  jobs: { label: "New job application", path: "/internal/jobs", env: "SLACK_WEBHOOK_URL_JOBS" },
  hackathons: { label: "New hackathon registration", path: "/internal/hackathons", env: "SLACK_WEBHOOK_URL_HACKATHONS" },
  cohort: { label: "New DevRel Cohort application", path: "/internal/cohort", env: "SLACK_WEBHOOK_URL_COHORT" },
};

/** Slack reads <, > and & as markup; everything a visitor typed is escaped. */
export function slackEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function webhookFor(form: FormKey, env: Record<string, string | undefined> = process.env) {
  const url = (env[FORMS[form].env] || env.SLACK_WEBHOOK_URL || "").trim();
  return url.startsWith("https://hooks.slack.com/") ? url : null;
}

export function slackMessage(entry: NewEntry, site = baseUrl) {
  const form = FORMS[entry.form];
  const program = slackEscape(entry.program.trim().slice(0, 120));
  const place = slackEscape((entry.place ?? "").replace(/\s+/g, " ").trim().slice(0, 80));
  const link = `${site}${form.path}/${entry.id}`;
  const summary = [form.label, program, place].filter(Boolean);
  return {
    // The notification preview.
    text: summary.join(" · "),
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: [`*${form.label}*`, program, place].filter(Boolean).join(" · ") } },
      {
        type: "actions",
        elements: [{ type: "button", text: { type: "plain_text", text: "Open in the dashboard" }, url: link }],
      },
    ],
    unfurl_links: false,
  };
}

export async function alertNewEntry(entry: NewEntry) {
  const url = webhookFor(entry.form);
  if (!url) return;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(slackMessage(entry)),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`[slack] ${entry.form} alert failed: ${response.status} ${(await response.text().catch(() => "")).slice(0, 200)}`);
    }
  } catch (error) {
    console.error(`[slack] ${entry.form} alert failed`, error);
  }
}
