import type { LeadCard } from "@/lib/internal/inbound/schema";
import { listInboundLeads } from "@/lib/internal/inbound/data";

/** One line on My day: a lead whose newest event is waiting on a person. */
export type WaitingLead = { id: string; name: string; waiting: number };

export type WaitingLeads = {
  /** The newest few, at most `limit`. */
  items: WaitingLead[];
  /** How many more there are beyond `items`. */
  more: number;
};

/**
 * Open leads (not won or lost) whose newest event has things waiting on a
 * person, newest event first, cut to `limit`. Pure, so it can be tested.
 */
export function pickWaitingLeads(cards: LeadCard[], limit = 5): WaitingLeads {
  const all = cards
    .filter(
      (card) =>
        card.column !== "won" &&
        card.column !== "lost" &&
        card.latest &&
        card.latest.waiting > 0,
    )
    .sort(
      (a, b) =>
        Date.parse(b.latest!.created_at) - Date.parse(a.latest!.created_at),
    )
    .map((card) => ({
      id: card.org.id,
      name: card.org.name,
      waiting: card.latest!.waiting,
    }));
  return { items: all.slice(0, limit), more: Math.max(0, all.length - limit) };
}

/** My day's read: nothing (null) when it fails or nothing is waiting. */
export async function waitingLeads(): Promise<WaitingLeads | null> {
  try {
    const result = await listInboundLeads();
    if (!result.ok) return null;
    const picked = pickWaitingLeads(result.value);
    return picked.items.length ? picked : null;
  } catch {
    return null;
  }
}
