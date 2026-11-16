/**
 * Dashboard notifications (the bell): what one looks like and the small
 * pure rules around them. Plain data, safe for client components.
 *
 * A notification is a pointer inside the dashboard: who did what, the
 * thing's name, and the page it opens. Nothing is emailed or sent to Slack.
 * Table: supabase/migrations/20261117110000_notifications.sql.
 */

export const NOTICE_KINDS = ["task", "call", "deliverable", "claim", "access", "other"] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];

export type Notification = {
  id: string;
  created_at: string;
  actor: string;
  kind: NoticeKind;
  title: string;
  body: string;
  href: string;
  read_at: string | null;
};

/** What a caller hands over; the rest is filled in. */
export type Notice = {
  kind: NoticeKind;
  /** "Priya gave you a task". */
  title: string;
  /** The thing's own name or a short detail; may be "". */
  body?: string;
  /** A dashboard path. */
  href: string;
};

/** How many the bell lists, and the most people one notice goes to. */
export const BELL_LIMIT = 30;
export const NOTICE_PEOPLE_LIMIT = 60;

/** Who a notice goes to: lowercased, once each, never the person who did it. */
export function noticeRecipients(to: readonly (string | null | undefined)[], actor: string) {
  const me = actor.trim().toLowerCase();
  const asked = to
    .map((email) => (email ?? "").trim().toLowerCase())
    .filter((email) => /^[^\s@]+@[^\s@]+$/.test(email) && email !== me);
  return [...new Set(asked)].slice(0, NOTICE_PEOPLE_LIMIT);
}

/** One line, cut to length, for a title or body. */
export function noticeLine(value: string | null | undefined, max: number) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max).trim();
}

/** The rows to save for a notice, or none when it has no title or a path outside the dashboard. */
export function noticeRows(to: readonly (string | null | undefined)[], actor: string, notice: Notice) {
  const title = noticeLine(notice.title, 200);
  if (!title || !notice.href.startsWith("/internal")) return [];
  return noticeRecipients(to, actor).map((email) => ({
    email,
    actor: actor.trim().toLowerCase(),
    kind: notice.kind,
    title,
    body: noticeLine(notice.body, 300),
    href: notice.href,
  }));
}

/** "9+" past nine: the badge stays one or two characters wide. */
export function badgeText(unread: number) {
  return unread > 9 ? "9+" : String(unread);
}
