"use server";

import { revalidatePath } from "next/cache";
import { setMemberName } from "@/lib/internal/members";
import { isOwner } from "@/lib/internal/roles";
import { requireMember } from "@/lib/internal/session";
import { updateOwnName } from "@/lib/internal/team/people";
import { cleanOwnName, type TeamResult } from "@/lib/internal/team/shared";

/**
 * Saves someone's own name, wherever they have a row: the team list (what
 * payslips and attendance use) and their dashboard membership. Anyone signed
 * in may change their own; nobody else's goes through here.
 */
export async function saveMyProfile(name: unknown): Promise<TeamResult> {
  const staff = await requireMember();
  const clean = cleanOwnName(name);
  if (!clean.ok) return clean;

  let saved = false;
  if (staff.person) {
    const onTeam = await updateOwnName(staff.email, clean.name);
    if (!onTeam.ok) return onTeam;
    saved = true;
  }
  // Owners have no member row; everyone else usually does.
  if (!isOwner(staff.email)) {
    const member = await setMemberName(staff.email, clean.name);
    if (!member.ok) {
      // The team list has the new name; say the rest didn't save, so they
      // try again rather than leave Team & roles showing the old one.
      if (saved) revalidatePath("/internal", "layout");
      return saved ? { ok: false, message: `Saved on the team list, but not everywhere. ${member.message}` } : member;
    }
    saved = saved || member.found;
  }
  if (!saved) return { ok: false, message: "Couldn't find your profile. Ask Arindam or Amitesh." };
  revalidatePath("/internal", "layout");
  return { ok: true, message: "Name saved" };
}
