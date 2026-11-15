"use server";

import { revalidatePath } from "next/cache";
import { renderEmail } from "@/lib/internal/email-templates";
import { accessFor, decideMember, inviteMember } from "@/lib/internal/members";
import { isOwner, isRoleKey, isStaffEmail, roleChangeProblem, rolesLabel, type RoleKey } from "@/lib/internal/roles";
import { requireStaff } from "@/lib/internal/session";
import { emailAddress } from "@/lib/internal/token";
import { isMailerConfigured, sendMail } from "@/lib/mailer";
import { baseUrl } from "@/lib/site";

export type TeamResult = { ok: true; message?: string } | { ok: false; message: string };

const OWNERS_ONLY = "Only Arindam and Amitesh can invite people.";

function roleList(value: unknown): RoleKey[] {
  return Array.isArray(value) ? value.filter(isRoleKey) : [];
}

/** Inviting skips the waitlist and reaches outside addresses: the owners' call (OWNERS in lib/internal/roles.ts). */
async function requireOwner() {
  const admin = await requireStaff("admin");
  return isOwner(admin.email) ? admin : null;
}

/**
 * Approve, decline, change roles, or turn access off and on. Any admin can
 * give and take away roles (approving included); the Admin role, other
 * admins, declining and turning access off or on are the owners' alone
 * (roleChangeProblem). Server actions are public endpoints, so every input
 * is checked here, against the person's row as it is now.
 */
export async function updateMember(
  email: unknown,
  status: unknown,
  roles: unknown,
): Promise<TeamResult> {
  const admin = await requireStaff("admin");
  const target = emailAddress(email);
  if (!target || (status !== "active" && status !== "disabled")) {
    return { ok: false, message: "That change isn't valid." };
  }
  if (target === admin.email) {
    return { ok: false, message: "You can't change your own access." };
  }
  const wanted = roleList(roles);
  if (!isOwner(admin.email)) {
    const access = await accessFor(target);
    if (access.kind === "error") return { ok: false, message: "Couldn't check that person just now. Try again in a minute." };
    if (access.kind !== "member") {
      return { ok: false, message: access.kind === "owner" ? "Owners can't be changed." : "That person isn't on the list." };
    }
    const problem = roleChangeProblem({ owner: false }, access.member, { status, roles: wanted });
    if (problem) return { ok: false, message: problem };
  }
  const result = await decideMember(
    target,
    { status, roles: wanted },
    admin.email,
  );
  if (result.ok) revalidatePath("/internal", "layout");
  return result;
}

/**
 * Gives someone access now, skipping the waitlist, so owners only. Staff can
 * get any roles; anyone outside @studio1hq.com only the Blog writer role.
 * Emails them a sign-in link when the mailer is set up.
 */
export async function invite(email: unknown, roles: unknown): Promise<TeamResult> {
  const admin = await requireOwner();
  if (!admin) return { ok: false, message: OWNERS_ONLY };
  const target = emailAddress(email);
  if (!target) return { ok: false, message: "Enter a valid email address." };
  if (target === admin.email) return { ok: false, message: "You already have access." };
  const wanted = isStaffEmail(target) ? roleList(roles) : (["blog_writer"] as RoleKey[]);
  const result = await inviteMember(target, wanted, admin.email);
  if (!result.ok) return result;
  revalidatePath("/internal", "layout");

  if (!isMailerConfigured()) {
    return {
      ok: true,
      message: `${target} can sign in now. Email isn't set up, so send them ${baseUrl}/internal/login yourself.`,
    };
  }
  const inviter = admin.email.split("@")[0].replace(/[._+-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const writerOnly = wanted.length === 1 && wanted[0] === "blog_writer";
  const body = writerOnly
    ? `Hi,\n\n${inviter} invited you to write for the Studio1 blog.\n\nSign in with this address (${target}) and you'll land in the blog editor. Write your post there, and when it's ready, ask for a review. A Studio1 reviewer will take it from there.\n\nThe Studio1 team`
    : `Hi,\n\n${inviter} gave you access to the Studio1 dashboard as ${rolesLabel(wanted)}.\n\nSign in with this address (${target}) using the button below.\n\nThe Studio1 team`;
  const { html, text } = renderEmail({
    body,
    call: { label: writerOnly ? "Open the blog editor" : "Open the dashboard", url: `${baseUrl}/internal/login?next=${writerOnly ? "/internal/blog" : "/internal"}` },
    reason: `You're getting this because a Studio1 admin invited ${target}.`,
  });
  try {
    await sendMail({
      to: target,
      subject: writerOnly ? "You're invited to write for the Studio1 blog" : "You have access to the Studio1 dashboard",
      html,
      text,
      replyTo: admin.email,
    });
  } catch (error) {
    console.error("[internal] invite email failed", error);
    return { ok: true, message: `${target} can sign in now, but the invite email didn't send. Send them ${baseUrl}/internal/login.` };
  }
  return { ok: true, message: `Invited ${target}. They'll get an email with a sign-in link.` };
}
