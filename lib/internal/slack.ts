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
 * A title with the person's name, up to three short points about them and a
 * button into the dashboard, which asks for sign-in. No email address, links
 * or written answers: Slack keeps messages, and the dashboard is the place
 * for those. Call it inside `after()`; without a webhook it does nothing.
 * Duplicates and spam-guard drops return before it's called.
 */

export type NewEntry = {
  form: FormKey;
  id: string;
  name: string;
  /**
   * Up to three points as [label, value], e.g. ["Track", "Docs audit"].
   * Empty values are left out. Never an email, link or written answer.
   */
  points: [label: string, value: string | undefined][];
};

const MAX_POINTS = 3;

const FORMS: Record<FormKey, { label: string; emoji: string; path: string; env: string }> = {
  jobs: { label: "New job application", emoji: ":briefcase:", path: "/internal/jobs", env: "SLACK_WEBHOOK_URL_JOBS" },
  hackathons: {
    label: "New hackathon registration",
    emoji: ":hammer_and_wrench:",
    path: "/internal/hackathons",
    env: "SLACK_WEBHOOK_URL_HACKATHONS",
  },
  cohort: { label: "New DevRel Cohort application", emoji: ":mortar_board:", path: "/internal/cohort", env: "SLACK_WEBHOOK_URL_COHORT" },
};

/** Slack reads <, > and & as markup; everything a visitor typed is escaped. */
export function slackEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** One escaped line, cut to `max` characters. */
function line(value: string | undefined, max: number) {
  return slackEscape((value ?? "").replace(/\s+/g, " ").trim().slice(0, max));
}

export function webhookFor(form: FormKey, env: Record<string, string | undefined> = process.env) {
  const url = (env[FORMS[form].env] || env.SLACK_WEBHOOK_URL || "").trim();
  return url.startsWith("https://hooks.slack.com/") ? url : null;
}

export function slackMessage(entry: NewEntry, site = baseUrl) {
  const form = FORMS[entry.form];
  const title = `${form.label}: ${line(entry.name, 80) || "Someone"}`;
  const points = entry.points
    .map(([label, value]) => [label, line(value, 100)] as const)
    .filter(([, value]) => value)
    .slice(0, MAX_POINTS);
  const link = `${site}${form.path}/${entry.id}`;
  // In the channel:
  //   🛠 *New hackathon registration: Priya Sharma*
  //   • *Hackathon:* Docs Sprint
  //   • *Track:* Docs audit
  //   • *Experience:* Intermediate
  //   [Open in dashboard]
  return {
    // The notification preview.
    text: [title, ...points.map(([, value]) => value)].join(" · "),
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [`${form.emoji} *${title}*`, ...points.map(([label, value]) => `• *${label}:* ${value}`)].join("\n"),
        },
      },
      {
        type: "actions",
        elements: [{ type: "button", text: { type: "plain_text", text: "Open in dashboard" }, url: link, style: "primary" }],
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
