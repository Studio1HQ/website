"use server";

import { revalidatePath } from "next/cache";
import { isOwner } from "@/lib/internal/roles";
import { requireMember, staffName } from "@/lib/internal/session";
import { isFounder } from "@/lib/internal/tasks/access";
import { audit } from "@/lib/internal/team/audit";
import { findPerson } from "@/lib/internal/team/people";
import { followUpHtml, MAX_FOLLOW_UP } from "@/lib/internal/team/review";
import { isMonthKey, type TeamResult } from "@/lib/internal/team/shared";
import { emailAddress } from "@/lib/internal/token";
import { isMailerConfigured, sendMail } from "@/lib/mailer";

/**
 * The monthly review's one write: a founder emails someone about their
 * month ("what's getting in the way?"). It goes from the founder's name,
 * replies come back to them, and the audit trail keeps what was sent so the
 * review shows who was followed up and when.
 */

const NOT_FOUND = "That person isn't on the team list.";

export async function sendFollowUp(input: {
  email: unknown;
  month: unknown;
  subject: unknown;
  body: unknown;
  /** One per opened draft, so a double click can't send it twice. */
  key: unknown;
}): Promise<TeamResult> {
  const staff = await requireMember();
  if (!isFounder(staff)) return { ok: false, message: "Only Arindam or Amitesh can send these." };

  const address = emailAddress(input.email);
  if (!address || isOwner(address)) return { ok: false, message: NOT_FOUND };
  if (!isMonthKey(input.month)) return { ok: false, message: "Pick a month first." };
  const subject = typeof input.subject === "string" ? input.subject.replace(/\s+/g, " ").trim() : "";
  const body = typeof input.body === "string" ? input.body.replace(/\r\n/g, "\n").trim() : "";
  if (!subject || subject.length > 150) return { ok: false, message: "Give it a subject (up to 150 characters)." };
  if (!body) return { ok: false, message: "Write the message first." };
  if (body.length > MAX_FOLLOW_UP) return { ok: false, message: `Keep it under ${MAX_FOLLOW_UP} characters.` };
  const key = typeof input.key === "string" && /^[a-z0-9-]{8,64}$/i.test(input.key) ? input.key : null;
  if (!key) return { ok: false, message: "Reload the page and try again." };

  const found = await findPerson(address);
  if (!found.ok) return { ok: false, message: "Couldn't check the team list. Try again in a minute." };
  const person = found.person;
  if (!person || !person.active) return { ok: false, message: NOT_FOUND };
  if (!isMailerConfigured()) return { ok: false, message: "Email isn't set up on this dashboard (no Resend key)." };

  const name = staffName(staff);
  try {
    await sendMail(
      {
        to: person.email,
        subject,
        html: followUpHtml(body),
        text: body,
        replyTo: staff.email,
        fromName: `${name.split(" ")[0]} at Studio1`,
      },
      undefined,
      { idempotencyKey: `follow-up-${key}` },
    );
  } catch (error) {
    console.error(`[review] the follow-up to ${person.email} failed`, error);
    return { ok: false, message: "The email didn't go. Try again in a minute." };
  }

  await audit({
    actor: staff.email,
    area: "people",
    action: "followed_up",
    subject: person.email,
    detail: { month: input.month, subject, body },
  });
  revalidatePath("/internal/tasks/reports/review");
  const first = (person.name || person.email).split(" ")[0];
  return { ok: true, message: `Sent to ${first}. Replies come to you.` };
}
