/**
 * Weekly and monthly reports: the snapshot built from a person's tasks,
 * client deliverables, community tasks, work logs and attendance, and the
 * plain text and email forms of a report. Pure; the data comes in.
 */

import { istNow, type AttendanceDay } from "@/lib/internal/team/shared";
import type { DeliverableStatus } from "@/lib/internal/clients/schema";
import {
  communityColumn,
  deliverableColumn,
  deliverableStatusLabel,
  forKey,
  forLabel,
  minutesByDay,
  nextPeriodLabel,
  periodLabel,
  statusLabel,
  sumMinutes,
  totalsByFor,
  type CommunityCard,
  type EngagementLabel,
  type ReportPeriod,
  type ReportSnapshot,
  type SnapshotItem,
  type Task,
  type WorkLog,
} from "@/lib/internal/tasks/shared";

/** A client deliverable as a report needs it. */
export type ReportDeliverable = {
  id: string;
  title: string;
  status: DeliverableStatus;
  engagement_id: string;
  published_url: string | null;
  published_at: string | null;
  due_on: string | null;
  blocked: boolean;
  block_reason: string;
};

/** A status move someone made on a client deliverable. */
export type ReportMove = {
  title: string;
  engagement_id: string | null;
  from_status: string | null;
  to_status: string | null;
  at: string;
};

export type SnapshotInput = {
  period: ReportPeriod;
  starts_on: string;
  ends_on: string;
  /** Their attendance days in the period, or null when it couldn't be read. */
  attendance: readonly Pick<AttendanceDay, "day" | "kind" | "active_minutes">[] | null;
  logs: readonly WorkLog[];
  /** Their own tasks: open ones and the ones done in the period. */
  tasks: readonly Task[];
  /** Client deliverables they own: open, and published in the period. */
  deliverables: readonly ReportDeliverable[];
  /** Community tasks they own: open, and done in the period. */
  community: readonly CommunityCard[];
  moves: readonly ReportMove[];
  engagements: ReadonlyMap<string, EngagementLabel>;
};

/** The IST day of a timestamp, or null. */
export function istDay(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : istNow(date).date;
}

function within(day: string | null | undefined, from: string, to: string) {
  return Boolean(day && day >= from && day <= to);
}

const COMMUNITY_FOR = "Studio1 · Community";

function deliverableFor(engagementId: string | null, engagements: ReadonlyMap<string, EngagementLabel>) {
  return engagementId ? forLabel(`e:${engagementId}`, engagements) : "A client";
}

/** Builds what a report shows, from the period's data. */
export function buildSnapshot(input: SnapshotInput): ReportSnapshot {
  const { starts_on: from, ends_on: to, engagements } = input;
  const logs = input.logs.filter((log) => within(log.day, from, to));

  const attendance = input.attendance
    ? input.attendance
        .filter((day) => within(day.day, from, to))
        .reduce(
          (sum, day) => ({
            worked: sum.worked + (day.kind === "work" ? 1 : 0),
            half: sum.half + (day.kind === "half_day" ? 1 : 0),
            leave: sum.leave + (day.kind === "leave" ? 1 : 0),
            active_minutes: sum.active_minutes + (day.kind === "leave" ? 0 : (day.active_minutes ?? 0)),
          }),
          { worked: 0, half: 0, leave: 0, active_minutes: 0 },
        )
    : null;

  const done: SnapshotItem[] = [];
  const open: SnapshotItem[] = [];

  for (const task of input.tasks) {
    const item: SnapshotItem = {
      title: task.title,
      for: forLabel(forKey(task), engagements),
      source: "task",
      due_on: task.due_on,
      blocked: task.blocked,
      reason: task.blocked ? task.block_reason : undefined,
    };
    if (task.status === "done") {
      if (within(task.done_on, from, to)) done.push({ ...item, day: task.done_on, blocked: false, reason: undefined });
    } else open.push({ ...item, column: task.status });
  }

  for (const deliverable of input.deliverables) {
    const item: SnapshotItem = {
      title: deliverable.title,
      for: deliverableFor(deliverable.engagement_id, engagements),
      source: "deliverable",
      status: deliverableStatusLabel(deliverable.status),
      due_on: deliverable.due_on,
      blocked: deliverable.blocked,
      reason: deliverable.blocked ? deliverable.block_reason : undefined,
    };
    if (deliverable.status === "published") {
      const day = istDay(deliverable.published_at);
      if (within(day, from, to))
        done.push({ ...item, day, url: deliverable.published_url, blocked: false, reason: undefined });
    } else open.push({ ...item, column: deliverableColumn(deliverable.status) });
  }

  for (const task of input.community) {
    const item: SnapshotItem = {
      title: task.title,
      for: COMMUNITY_FOR,
      source: "community",
      due_on: task.due_on,
      blocked: task.status === "blocked",
    };
    if (task.status === "done") {
      const day = istDay(task.completed_at);
      if (within(day, from, to)) done.push({ ...item, day, blocked: false });
    } else open.push({ ...item, column: communityColumn(task.status) });
  }

  done.sort((a, b) => (a.day ?? "").localeCompare(b.day ?? "") || a.title.localeCompare(b.title));
  const order = { review: 0, doing: 1, todo: 2, done: 3 } as const;
  open.sort(
    (a, b) =>
      Number(Boolean(b.blocked)) - Number(Boolean(a.blocked)) ||
      order[a.column ?? "todo"] - order[b.column ?? "todo"] ||
      (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999") ||
      a.title.localeCompare(b.title),
  );

  const moved = input.moves
    .map((move) => ({ ...move, day: istDay(move.at) }))
    .filter((move) => within(move.day, from, to) && move.to_status)
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((move) => ({
      title: move.title,
      for: deliverableFor(move.engagement_id, engagements),
      from: move.from_status ? deliverableStatusLabel(move.from_status) : "",
      to: deliverableStatusLabel(move.to_status ?? ""),
      day: move.day ?? "",
    }));

  return {
    version: 1,
    period: input.period,
    starts_on: from,
    ends_on: to,
    attendance,
    logged_minutes: sumMinutes(logs),
    logged_days: Object.keys(minutesByDay(logs)).length,
    by_for: totalsByFor(logs.filter((log) => log.minutes > 0), engagements),
    done,
    moved,
    open,
  };
}

/** Reads a stored snapshot back, or null when it isn't one. */
export function readSnapshot(value: unknown): ReportSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as Partial<ReportSnapshot>;
  if (snapshot.version !== 1 || !Array.isArray(snapshot.done) || !Array.isArray(snapshot.open)) return null;
  return {
    version: 1,
    period: snapshot.period === "month" ? "month" : "week",
    starts_on: String(snapshot.starts_on ?? ""),
    ends_on: String(snapshot.ends_on ?? ""),
    attendance: snapshot.attendance ?? null,
    logged_minutes: Number(snapshot.logged_minutes ?? 0) || 0,
    logged_days: Number(snapshot.logged_days ?? 0) || 0,
    by_for: Array.isArray(snapshot.by_for) ? snapshot.by_for : [],
    ...(Array.isArray(snapshot.work) ? { work: snapshot.work } : {}),
    done: snapshot.done,
    moved: Array.isArray(snapshot.moved) ? snapshot.moved : [],
    open: snapshot.open,
  };
}

/* --------------------------------------------------------------- words */

export type ReportWords = {
  highlights: string;
  blockers: string;
  next_plan: string;
};

function attendanceLine(snapshot: ReportSnapshot) {
  const days = snapshot.attendance;
  if (!days) return null;
  const parts = [`${days.worked} day${days.worked === 1 ? "" : "s"} worked`];
  if (days.half) parts.push(`${days.half} half day${days.half === 1 ? "" : "s"}`);
  if (days.leave) parts.push(`${days.leave} on leave`);
  return parts.join(", ");
}

function shortDay(day: string | null | undefined) {
  if (!day) return "";
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

/** The report as plain text: for "Copy" and the email's text part. */
export function reportText(name: string, words: ReportWords, snapshot: ReportSnapshot) {
  const lines: string[] = [];
  lines.push(`${name}: ${periodLabel(snapshot.period, snapshot.starts_on)} report`);
  lines.push("");
  const attendance = attendanceLine(snapshot);
  if (attendance) lines.push(`Attendance: ${attendance}`);
  const forClients = snapshot.done.filter((item) => !item.for.startsWith("Studio1")).length;
  lines.push(`Done: ${snapshot.done.length} (${forClients} for clients)`);
  const section = (title: string, body: string) => {
    lines.push("", title);
    lines.push(body.trim() || "(nothing written)");
  };
  section("What went well", words.highlights);
  section("Blockers / what I need", words.blockers);
  section(`Plan for ${nextPeriodLabel(snapshot.period)}`, words.next_plan);
  lines.push("", `Done (${snapshot.done.length})`);
  if (!snapshot.done.length) lines.push("  Nothing marked done.");
  for (const item of snapshot.done)
    lines.push(`  - ${item.title} (${item.for}${item.day ? `, ${shortDay(item.day)}` : ""})${item.url ? ` ${item.url}` : ""}`);
  if (snapshot.moved.length) {
    lines.push("", "Client work moved");
    for (const move of snapshot.moved) lines.push(`  - ${move.title} (${move.for}): ${move.from} → ${move.to}, ${shortDay(move.day)}`);
  }
  lines.push("", `Still open (${snapshot.open.length})`);
  for (const item of snapshot.open.slice(0, 30)) {
    const where = item.status ?? (item.column ? statusLabel(item.column) : "");
    lines.push(`  - ${item.title} (${item.for}, ${where}${item.blocked ? `, BLOCKED${item.reason ? `: ${item.reason}` : ""}` : ""})`);
  }
  if (snapshot.open.length > 30) lines.push(`  …and ${snapshot.open.length - 30} more`);
  return lines.join("\n");
}

function escape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function paragraphs(value: string) {
  const text = value.trim();
  if (!text) return `<p style="margin:0;color:#8a8580">Nothing written.</p>`;
  return text
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 8px">${escape(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** The email the founders get when someone submits. */
export function reportEmailHtml(name: string, words: ReportWords, snapshot: ReportSnapshot, link: string) {
  const attendance = attendanceLine(snapshot);
  const h2 = (text: string) =>
    `<h2 style="margin:22px 0 8px;font-size:13px;font-weight:600;letter-spacing:.02em;text-transform:uppercase;color:#6b6560">${escape(text)}</h2>`;
  const list = (items: string[], empty: string) =>
    items.length
      ? `<ul style="margin:0;padding-left:18px">${items.map((item) => `<li style="margin:0 0 4px">${item}</li>`).join("")}</ul>`
      : `<p style="margin:0;color:#8a8580">${escape(empty)}</p>`;
  const done = snapshot.done.map(
    (item) =>
      `${escape(item.title)} <span style="color:#8a8580">· ${escape(item.for)}${item.day ? ` · ${shortDay(item.day)}` : ""}</span>${
        item.url ? ` · <a href="${escape(item.url)}" style="color:#c2410c">live</a>` : ""
      }`,
  );
  const open = snapshot.open.slice(0, 20).map(
    (item) =>
      `${escape(item.title)} <span style="color:#8a8580">· ${escape(item.for)} · ${escape(item.status ?? (item.column ? statusLabel(item.column) : ""))}</span>${
        item.blocked ? ` <strong style="color:#be123c">blocked${item.reason ? `: ${escape(item.reason)}` : ""}</strong>` : ""
      }`,
  );
  return `<!doctype html><html><body style="margin:0;background:#f4f1ec;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1c1917">
<div style="max-width:620px;margin:0 auto;padding:28px 16px">
<div style="background:#fbf9f5;border:1px solid #e7e2da;border-radius:6px;padding:24px;font-size:14px;line-height:1.55">
<p style="margin:0 0 4px;font-size:12px;color:#8a8580">Studio1 · ${escape(periodLabel(snapshot.period, snapshot.starts_on))}</p>
<h1 style="margin:0 0 14px;font-size:20px;font-weight:600">${escape(name)}'s report</h1>
<p style="margin:0">${attendance ? `${escape(attendance)}. ` : ""}${snapshot.done.length} done, ${
  snapshot.done.filter((item) => !item.for.startsWith("Studio1")).length
} of them for clients.</p>
${h2("What went well")}${paragraphs(words.highlights)}
${h2("Blockers / what they need")}${paragraphs(words.blockers)}
${h2(`Plan for ${nextPeriodLabel(snapshot.period)}`)}${paragraphs(words.next_plan)}
${h2(`Done (${snapshot.done.length})`)}${list(done, "Nothing marked done.")}
${h2(`Still open (${snapshot.open.length})`)}${list(open, "Nothing open.")}
<p style="margin:24px 0 0"><a href="${escape(link)}" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;padding:9px 16px;border-radius:999px;font-size:13px">Open in the dashboard ↗</a></p>
</div></div></body></html>`;
}
