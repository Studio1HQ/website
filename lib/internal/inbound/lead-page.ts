import type {
  AgentEvent,
  AgentFile,
  EventKind,
} from "@/lib/internal/inbound/schema";
import { canQueue } from "@/lib/internal/inbound/rules";

/** Pure helpers for the lead page, kept apart so they are tested. */

/** The events the lead page asks for (the same list inbound/actions.ts allows). */
export const ASKABLE_KINDS: readonly EventKind[] = [
  "lead_created",
  "call_notes_added",
  "founder_answers",
  "proposal_sent",
  "won",
  "lost",
];

/** The newest finished event: the "Next" panel reads its three lists. */
export function latestDone(events: readonly AgentEvent[]): AgentEvent | null {
  let best: AgentEvent | null = null;
  for (const event of events) {
    if (event.status !== "done") continue;
    if (
      !best ||
      Date.parse(event.finished_at ?? event.created_at) >
        Date.parse(best.finished_at ?? best.created_at)
    )
      best = event;
  }
  return best;
}

/** The newest event still queued or running, if any. */
export function inFlight(events: readonly AgentEvent[]): AgentEvent | null {
  const open = events.filter(
    (event) => event.status === "queued" || event.status === "running",
  );
  return open.length ? open[0] : null;
}

/** Whether "Try again" is offered for this event to this person. */
export function canRetry(
  event: Pick<AgentEvent, "status" | "kind">,
  stage: string,
  isFounder: boolean,
): boolean {
  if (event.status !== "failed") return false;
  if (!ASKABLE_KINDS.includes(event.kind)) return false;
  if (event.kind === "founder_answers" && !isFounder) return false;
  return canQueue(stage, event.kind);
}

/** A report this long (or this many lines) starts collapsed. */
export function isLongReport(report: string) {
  return report.length > 280 || report.split("\n").length > 5;
}

export type FileGroup = {
  name: string;
  /** Newest first; the first is the current version. */
  versions: AgentFile[];
};

/** Files with the same name together, newest version first, groups by their newest. */
export function groupFiles(files: readonly AgentFile[]): FileGroup[] {
  const sorted = [...files].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  const groups = new Map<string, AgentFile[]>();
  for (const file of sorted) {
    const list = groups.get(file.name);
    if (list) list.push(file);
    else groups.set(file.name, [file]);
  }
  return [...groups].map(([name, versions]) => ({ name, versions }));
}
