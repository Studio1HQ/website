import "server-only";
import { redirect } from "next/navigation";
import { homeFor, isAdmin, requireMember, type Staff } from "@/lib/internal/session";

/**
 * Outreach pages and files: admins only for now (the founders are admins).
 * Who Studio1 is pitching, and for how much, isn't for the whole team.
 * Anyone else goes back to their own start page. The actions check the
 * same thing themselves (app/internal/(dashboard)/outreach/actions.ts).
 */
export async function requireOutreach(): Promise<Staff> {
  const staff = await requireMember();
  if (!isAdmin(staff)) redirect(homeFor(staff));
  return staff;
}
