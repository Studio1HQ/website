/**
 * Search on the Tasks page: finds someone's tasks (and the client pieces
 * that show on their week) by any words in the title, the note or what it's
 * for ("nebius", "backlink plan", "hiring"). Pure: the page loads the rows.
 */

import { DELIVERABLE_KINDS, DELIVERABLE_STATUSES, labelOf, statusLabel, toneOf, type Deliverable } from "@/lib/internal/clients/schema";
import { isLate as isPieceLate } from "@/lib/internal/clients/rules";
import { notePreview } from "@/lib/internal/tasks/note-links";
import { TASK_STATUSES, forKey, forLabel, isClientKey, isTaskLate, type EngagementLabel, type Task, type Tone } from "@/lib/internal/tasks/shared";

/** Shortest search that runs: one letter matches nearly everything. */
export const MIN_SEARCH = 2;
/** Most results shown per group (open, done). */
export const SEARCH_LIMIT = 60;

export type SearchHit = {
  kind: "task" | "deliverable";
  id: string;
  title: string;
  /** The note on one line, links by name; "" when there's none. */
  note: string;
  /** "Nebius Token Factory · DevRel", "Studio1 · Content", "Studio1". */
  forLabel: string;
  client: boolean;
  status: { label: string; tone: Tone };
  done: boolean;
  /** Still owed and past its day (in review is handed in, so never). */
  late: boolean;
  /** Its day on the week calendar: done → the day it was done; open → its due day; null → no day yet. */
  day: string | null;
  /** Whose it is (lowercase email). */
  email: string;
  /** Who else it's on the lists of (a shared task), lowercase. */
  with: string[];
};

/** The words searched for, lowercased (at most eight). */
export function searchTerms(query: string) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 8);
}

/** Every word is somewhere in the text (any case). */
function hasAll(text: string, terms: readonly string[]) {
  const haystack = text.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export function findWork(input: {
  query: string;
  tasks: readonly Task[];
  deliverables: readonly Deliverable[];
  engagements: ReadonlyMap<string, EngagementLabel>;
  /** IST day of a timestamp. */
  dayOf: (value: string | null | undefined) => string | null;
  /** IST, for "late". */
  today: string;
}): { open: SearchHit[]; done: SearchHit[]; total: number } {
  const terms = searchTerms(input.query);
  if (input.query.trim().length < MIN_SEARCH || !terms.length) return { open: [], done: [], total: 0 };
  const hits: SearchHit[] = [];
  const seen = new Set<string>();

  for (const task of input.tasks) {
    if (seen.has(`task:${task.id}`)) continue;
    const key = forKey(task);
    const label = forLabel(key, input.engagements);
    const note = notePreview(task.notes ?? "");
    // The raw note too, so a pasted link's words are found.
    if (!hasAll(`${task.title}\n${task.notes ?? ""}\n${note}\n${label}`, terms)) continue;
    seen.add(`task:${task.id}`);
    const status = TASK_STATUSES.find((option) => option.value === task.status) ?? TASK_STATUSES[0];
    const done = task.status === "done";
    hits.push({
      kind: "task",
      id: task.id,
      title: task.title,
      note,
      forLabel: label,
      client: isClientKey(key, input.engagements),
      status: { label: status.label, tone: status.tone },
      done,
      late: isTaskLate(task, input.today),
      day: done ? (task.done_on ?? task.due_on) : task.due_on,
      email: task.email.toLowerCase(),
      with: (task.with_emails ?? []).map((email) => email.toLowerCase()),
    });
  }

  for (const row of input.deliverables) {
    if (seen.has(`deliverable:${row.id}`)) continue;
    const label = forLabel(`e:${row.engagement_id}`, input.engagements);
    const kind = labelOf(DELIVERABLE_KINDS, row.kind);
    if (!hasAll(`${row.title}\n${label}\n${kind}`, terms)) continue;
    seen.add(`deliverable:${row.id}`);
    const done = row.status === "published";
    hits.push({
      kind: "deliverable",
      id: row.id,
      title: row.title,
      note: kind,
      forLabel: label,
      client: !input.engagements.get(row.engagement_id)?.internal,
      status: { label: statusLabel(row.status, row.kind), tone: toneOf(DELIVERABLE_STATUSES, row.status) as Tone },
      done,
      late: isPieceLate(row, input.today),
      day: done ? input.dayOf(row.published_at) : row.due_on,
      email: (row.owner ?? "").toLowerCase(),
      with: [],
    });
  }

  // Open: soonest first, no day last. Done: latest first.
  const open = hits
    .filter((hit) => !hit.done)
    .sort((a, b) => (a.day ?? "9999-99-99").localeCompare(b.day ?? "9999-99-99") || a.title.localeCompare(b.title));
  const done = hits
    .filter((hit) => hit.done)
    .sort((a, b) => (b.day ?? "").localeCompare(a.day ?? "") || a.title.localeCompare(b.title));
  return { open: open.slice(0, SEARCH_LIMIT), done: done.slice(0, SEARCH_LIMIT), total: hits.length };
}

/** A title cut into plain and matched pieces, for marking what was found. */
export function markTerms(text: string, query: string): { text: string; hit: boolean }[] {
  const terms = searchTerms(query).filter((term) => term.length >= 2);
  if (!terms.length) return [{ text, hit: false }];
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  return text
    .split(pattern)
    .filter(Boolean)
    .map((piece) => ({ text: piece, hit: terms.includes(piece.toLowerCase()) }));
}
