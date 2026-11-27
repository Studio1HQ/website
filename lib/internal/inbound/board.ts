import type { BoardColumn, LeadCard } from "@/lib/internal/inbound/schema";

/** Small pure helpers for the Inbound board page. */

export type SourceFilter = "" | "call" | "mail";

/** The ?source= value: only the two known ones count. */
export function parseSource(value: string | undefined): SourceFilter {
  return value === "call" || value === "mail" ? value : "";
}

/** Cards for the chosen source; Lost cards only when asked for. */
export function filterCards(
  cards: readonly LeadCard[],
  source: SourceFilter,
  showLost: boolean,
): LeadCard[] {
  return cards.filter((card) => {
    if (card.column === "lost" && !showLost) return false;
    if (source === "call") return card.org.source === "inbound_call";
    if (source === "mail") return card.org.source === "inbound_email";
    return true;
  });
}

/** Cards of one column, in the order given. */
export function inColumn(cards: readonly LeadCard[], column: BoardColumn) {
  return cards.filter((card) => card.column === column);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long ago, in short words: "Today", "3 days ago", "2 weeks ago". */
export function ageLabel(iso: string, now = new Date()) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const days = Math.floor((now.getTime() - then) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

/** The lead whose newest event failed most recently, or null. */
export function lastFailure(cards: readonly LeadCard[]): LeadCard | null {
  let found: LeadCard | null = null;
  for (const card of cards) {
    if (card.latest?.status !== "failed") continue;
    if (!found || card.latest.created_at > (found.latest?.created_at ?? ""))
      found = card;
  }
  return found;
}
