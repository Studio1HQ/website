import type {
  EventKind,
  EventStatus,
  FileKind,
  LeadCard,
} from "@/lib/internal/inbound/schema";
import { MAIL_LABELS } from "@/lib/internal/inbound/schema";

/** Plain words for what the pages show. Pure, so it is tested beside it. */

const KIND_WORDS: Record<EventKind, string> = {
  lead_created: "Research the lead",
  call_notes_added: "Call notes added",
  founder_answers: "Founder answers",
  proposal_sent: "Proposal sent",
  reply_received: "Reply received",
  won: "Marked won",
  lost: "Marked lost",
};

export function eventKindLabel(kind: EventKind) {
  return KIND_WORDS[kind] ?? "Something else";
}

const STATUS_WORDS: Record<EventStatus, string> = {
  queued: "Queued",
  running: "Working",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function eventStatusLabel(status: EventStatus) {
  return STATUS_WORDS[status] ?? status;
}

const STAGE_WORDS: Record<string, string> = {
  lead: "Lead",
  replied: "Replied",
  call_booked: "Call booked",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export function stageLabel(stage: string) {
  return STAGE_WORDS[stage] ?? stage;
}

export function sourceLabel(source: string) {
  return source === "inbound_call"
    ? "Call"
    : source === "inbound_email"
      ? "Mail"
      : source;
}

const FILE_WORDS: Record<FileKind, string> = {
  brief: "Brief",
  deck_pdf: "Deck (PDF)",
  deck_pptx: "Deck (PowerPoint)",
  outline: "Outline",
  other: "File",
};

export function fileKindLabel(kind: FileKind) {
  return FILE_WORDS[kind] ?? "File";
}

export function mailLabel(label: string) {
  return MAIL_LABELS.find((item) => item.value === label)?.label ?? (label || "Not labelled");
}

/** Who queued an event, in words: the system's own names, else the person's name. */
export function queuedBy(createdBy: string | null) {
  if (!createdBy) return "Unknown";
  if (createdBy === "webhook:cal") return "Cal.com booking";
  if (createdBy === "sorter") return "Mail sorter";
  if (createdBy.startsWith("webhook:")) return "A webhook";
  if (!createdBy.includes("@")) return createdBy;
  return createdBy
    .split("@")[0]
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** "12 KB", "3.4 MB". */
export function fileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A short, one-line version of an error message, for a card. */
export function shortError(error: string, max = 80) {
  const line = error.replace(/\s+/g, " ").trim();
  if (!line) return "";
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/** Only http and https links to a lead's website: anything else is not a link. */
export function httpUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

/** The one status line on a board card, from the lead's newest event. */
export function statusLine(
  latest: LeadCard["latest"],
  stage: string,
): string {
  if (!latest) return stage === "call_booked" ? "Call booked" : "Not started";
  switch (latest.status) {
    case "queued":
      return "Waiting for the agent";
    case "running":
      return "Agent is working";
    case "failed": {
      const error = shortError(latest.error);
      return error ? `Failed: ${error}` : "Failed";
    }
    case "cancelled":
      return "Cancelled";
    case "done":
      if (latest.waiting > 0) return "Waiting on you";
      return latest.kind === "lead_created"
        ? "Brief ready"
        : eventKindLabel(latest.kind);
  }
}

export type FitLevel = "strong" | "good" | "weak" | "unclear";

const FIT_LEVELS: Record<string, FitLevel> = {
  Strong: "strong",
  Good: "good",
  Weak: "weak",
  Unclear: "unclear",
};

export const FIT_LABELS: Record<FitLevel, string> = {
  strong: "Strong fit",
  good: "Good fit",
  weak: "Weak fit",
  unclear: "Fit unclear",
};

/**
 * The fit the enrichment step wrote on the first line of why_fit:
 * `Fit: Strong`, optionally followed by ` - reasons`. Null when the first
 * line isn't in that exact form.
 */
export function fitOf(
  whyFit: string,
): { level: FitLevel; reasons: string } | null {
  const first = (whyFit ?? "").split(/\r?\n/, 1)[0] ?? "";
  const match = /^Fit: (Strong|Good|Weak|Unclear)(?: - (.*))?\s*$/.exec(first);
  if (!match) return null;
  return { level: FIT_LEVELS[match[1]], reasons: (match[2] ?? "").trim() };
}
