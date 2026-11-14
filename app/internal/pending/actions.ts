"use server";

import { revalidatePath } from "next/cache";
import { requestAccess, setMemberName } from "@/lib/internal/members";
import { getStaff } from "@/lib/internal/session";
import { cleanOwnName, type TeamResult } from "@/lib/internal/team/shared";

/**
 * The name someone gives while they wait for approval, so the founders see
 * who is asking. Only for a signed-in person's own pending request.
 */
export async function saveWaitingName(name: unknown): Promise<TeamResult> {
  const staff = await getStaff();
  if (!staff || staff.status !== "pending") return { ok: false, message: "Sign in again to continue." };
  const clean = cleanOwnName(name);
  if (!clean.ok) return clean;
  // The request is normally filed at sign-in; make sure it's there.
  await requestAccess(staff.email);
  const result = await setMemberName(staff.email, clean.name);
  if (!result.ok) return result;
  if (!result.found) return { ok: false, message: "Couldn't find your request. Try signing in again." };
  revalidatePath("/internal/pending");
  return { ok: true, message: "Thanks. Arindam and Amitesh will see your name with the request." };
}
