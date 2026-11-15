import { slackEscape } from "@/lib/internal/slack";
import {
  statusLabel,
  weekLabel,
  type DeliverableKind,
  type DeliverableStatus,
} from "@/lib/internal/clients/schema";
import {
  WEEK_GROUPS,
  groupWeek,
  shortDay,
  type WeekLine,
} from "@/lib/internal/clients/week";

/**
 * Client work in Slack, through an incoming webhook
 * (SLACK_WEBHOOK_URL_CLIENTS). Slack is the notification layer, not the
 * record: a status change posts one short line, and the board's "Post to
 * Slack" button posts the week's plan (Monday) or results (Friday). No
 * links to drafts or review copies, ever; only live (published) links in
 * the results. Without the env var nothing is sent and the button says so.
 */

export const CLIENTS_WEBHOOK_ENV = "SLACK_WEBHOOK_URL_CLIENTS";

export function clientsWebhook(
  env: Record<string, string | undefined> = process.env,
) {
  const url = (env[CLIENTS_WEBHOOK_ENV] ?? "").trim();
  return url.startsWith("https://hooks.slack.com/") ? url : null;
}

/** True when posting to Slack is set up (for hiding or explaining the button). */
export function clientsSlackReady(
  env: Record<string, string | undefined> = process.env,
) {
  return clientsWebhook(env) !== null;
}

/** One escaped line, cut to `max` characters. */
function clip(value: string | null | undefined, max: number) {
  return slackEscape((value ?? "").replace(/\s+/g, " ").trim().slice(0, max));
}

export type SlackMessage = {
  text: string;
  blocks?: unknown[];
  unfurl_links: false;
  unfurl_media: false;
};

export type StatusChange = {
  client: string;
  title: string;
  from: DeliverableStatus | null;
  to: DeliverableStatus;
  /** Who moved it: a name. */
  by: string;
  /** Blogs and other written work name their stages differently. */
  kind?: DeliverableKind | null;
};

/** "Acme · Launch blog: Internal review → Client review (Priya)". */
export function statusLine(change: StatusChange): SlackMessage {
  const from = change.from ? statusLabel(change.from, change.kind) : null;
  const to = statusLabel(change.to, change.kind);
  const move = from ? `${from} → ${to}` : to;
  const emoji =
    change.to === "published"
      ? ":white_check_mark:"
      : change.to === "changes_requested"
        ? ":leftwards_arrow_with_hook:"
        : ":arrow_right:";
  const text = `${emoji} *${clip(change.client, 60) || "Client"}* · ${clip(change.title, 120)}: ${move}${change.by ? ` (${clip(change.by, 40)})` : ""}`;
  return { text, unfurl_links: false, unfurl_media: false };
}

/** A blocked or unblocked line. */
export function blockLine(input: {
  client: string;
  title: string;
  blocked: boolean;
  /** "the client", "Studio1"… */
  waitsOn?: string;
  reason?: string;
  by: string;
}): SlackMessage {
  const head = `*${clip(input.client, 60) || "Client"}* · ${clip(input.title, 120)}`;
  const text = input.blocked
    ? `:no_entry: ${head}: blocked, waiting on ${clip(input.waitsOn, 40) || "someone"}${input.reason ? ` (${clip(input.reason, 160)})` : ""}${input.by ? ` · ${clip(input.by, 40)}` : ""}`
    : `:arrow_forward: ${head}: unblocked${input.by ? ` · ${clip(input.by, 40)}` : ""}`;
  return { text, unfurl_links: false, unfurl_media: false };
}

const MAX_ITEMS = 25;

/**
 * One client's week (the workspace's "Post to Slack"): Done, In progress,
 * Up next and Blocked, from the same lines as the workspace. Internal, so
 * it names who's on each line; still no links but live ones.
 */
export function clientWeekSummary(input: {
  client: string;
  /** The Monday. */
  week: string;
  lines: readonly WeekLine[];
  /** email → name. */
  names: Readonly<Record<string, string>>;
  /** engagement id → name, when the client has more than one. */
  engagements?: Readonly<Record<string, string>>;
  /** Link to the client's workspace for that week. */
  workspaceUrl: string;
}): SlackMessage {
  const groups = groupWeek(input.lines);
  const who = (email: string | null) =>
    email ? input.names[email.toLowerCase()] || email.split("@")[0] : "";
  const line = (item: WeekLine) => {
    const engagement =
      input.engagements && item.engagementId
        ? input.engagements[item.engagementId]
        : "";
    const part =
      item.deliverableTitle && item.deliverableTitle !== item.title
        ? ` (${clip(item.deliverableTitle, 80)})`
        : "";
    const day = item.day
      ? ` · ${item.dayKind === "done" ? "done" : "due"} ${shortDay(item.day)}`
      : "";
    const flags = [
      item.waitingOnClient ? "waiting on client" : item.blocked ? "blocked" : null,
      item.late ? "late" : null,
    ].filter(Boolean);
    const link =
      item.url && /^https?:\/\//i.test(item.url)
        ? ` <${item.url.replace(/[<>|]/g, "")}|live>`
        : "";
    return `• ${engagement ? `_${clip(engagement, 40)}_ · ` : ""}${clip(item.title, 100)}${part}${who(item.who) ? ` (${clip(who(item.who), 40)})` : ""}${day}${flags.length ? ` · _${flags.join(", ")}_` : ""}${link}`;
  };
  const body = WEEK_GROUPS.filter((group) => groups[group.value].length).map(
    (group) => {
      const items = groups[group.value];
      const shown = items.slice(0, MAX_ITEMS).map(line);
      const more = items.length - shown.length;
      return [
        `*${group.label}* (${items.length})`,
        ...shown,
        ...(more > 0 ? [`…and ${more} more`] : []),
      ].join("\n");
    },
  );
  const title = `:spiral_calendar_pad: ${clip(input.client, 60) || "Client"}, week of ${weekLabel(input.week)}`;
  const summary = WEEK_GROUPS.map(
    (group) => `${groups[group.value].length} ${group.value === "blocked" ? "blocked or waiting" : group.label.toLowerCase()}`,
  ).join(" · ");
  return {
    text: `${title}: ${summary}`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*${title}*\n${summary}` },
      },
      ...(body.length
        ? body.map((section) => ({
            type: "section",
            text: { type: "mrkdwn", text: section.slice(0, 2900) },
          }))
        : [
            {
              type: "section",
              text: { type: "mrkdwn", text: "Nothing for this week yet." },
            },
          ]),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open the client's week" },
            url: input.workspaceUrl,
          },
        ],
      },
    ],
    unfurl_links: false,
    unfurl_media: false,
  };
}

/** Posts to the client-work channel. Does nothing without the webhook; never throws. */
export async function postToClients(message: SlackMessage): Promise<boolean> {
  const url = clientsWebhook();
  if (!url) return false;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(
        `[slack] clients post failed: ${response.status} ${(await response.text().catch(() => "")).slice(0, 200)}`,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("[slack] clients post failed", error);
    return false;
  }
}
