import "server-only";
import { requireArea, type Staff } from "@/lib/internal/session";

/**
 * Inbound pages: people given Inbound on People (the founders always are).
 * Admin alone isn't enough: who is writing to Studio1, and what the design
 * agent has drafted for them, isn't for the whole team. Anyone else goes
 * back to their own start page. Actions and files check canSeeInbound
 * themselves (lib/internal/session.ts).
 */
export async function requireInbound(): Promise<Staff> {
  return requireArea("inbound", "manage");
}
