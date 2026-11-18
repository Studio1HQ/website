import "server-only";
import { requireArea, type Staff } from "@/lib/internal/session";

/**
 * Outreach pages: people given Outreach on People (the founders always
 * are). Admin alone isn't enough: who Studio1 is pitching, and for how much,
 * isn't for the whole team. Anyone else goes back to their own start page.
 * The actions and files check canSeeOutreach themselves
 * (app/internal/(dashboard)/outreach/actions.ts).
 */
export async function requireOutreach(): Promise<Staff> {
  return requireArea("outreach", "manage");
}
