"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import {
  endAuthSession,
  ensureAuthUser,
  sendSignInCode,
  verifySignInCode,
} from "@/lib/supabase-server";
import { isInvited, requestAccess, touchMember } from "@/lib/internal/members";
import { teamAccessFor } from "@/lib/internal/team/people";
import { loginCookieOptions, sessionCookieOptions } from "@/lib/internal/session";
import {
  CODE_TTL_SECONDS,
  PENDING_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  STAFF_DOMAIN,
  authSecret,
  emailAddress,
  nowSeconds,
  safeNext,
  signToken,
  staffEmail,
} from "@/lib/internal/token";

export type RequestCodeState =
  | { status: "idle" }
  | { status: "sent"; email: string; sentAt: number; note?: string }
  | { status: "error"; message: string };

export type CheckCodeState = { status: "idle" } | { status: "error"; message: string };

const NOT_ALLOWED = `Use your @${STAFF_DOMAIN} address. Writers from outside Studio1 need an invite from an admin first.`;

/** Staff, or an outside writer an admin invited; anyone else gets null. */
async function allowedEmail(input: unknown) {
  const address = emailAddress(input);
  if (!address) return null;
  return staffEmail(address) ?? ((await isInvited(address)) ? address : null);
}

/**
 * Step one: email a sign-in code. Only staff addresses and invited writers
 * ever reach Supabase. The address goes in a cookie for the login page, so
 * the code is only checked in this browser and the step survives a reload.
 */
export async function requestSignInCode(
  _previous: RequestCodeState,
  formData: FormData,
): Promise<RequestCodeState> {
  if (!authSecret()) {
    console.error("[internal] INTERNAL_AUTH_SECRET (32+ characters) is missing");
    return { status: "error", message: "Sign-in isn't set up yet." };
  }

  if (!emailAddress(formData.get("email"))) {
    return { status: "error", message: "Enter a valid email address." };
  }
  const email = await allowedEmail(formData.get("email"));
  if (!email) return { status: "error", message: NOT_ALLOWED };

  const user = await ensureAuthUser(email);
  if (!user.ok) {
    console.error(`[internal] creating the Supabase Auth user failed: ${user.message}`);
    return { status: "error", message: "Sign-in is unavailable right now. Try again in a minute." };
  }

  const resend = formData.get("resend") === "1";
  const sent = await sendSignInCode(email);
  const jar = await cookies();
  if (!sent.ok) {
    // Supabase sends one email a minute per address; the last code still works.
    if (sent.rateLimited && /only request this after/i.test(sent.message)) {
      jar.set(PENDING_COOKIE, email, loginCookieOptions(CODE_TTL_SECONDS));
      return {
        status: "sent",
        email,
        sentAt: Date.now(),
        note: "We sent you a code less than a minute ago. Use that one, or ask again in a minute.",
      };
    }
    console.error(`[internal] Supabase didn't send the sign-in code: ${sent.message}`);
    return {
      status: "error",
      message: sent.rateLimited
        ? "Too many sign-in emails were sent. Wait a few minutes and try again."
        : "We couldn't send the email. Try again in a minute.",
    };
  }

  jar.set(PENDING_COOKIE, email, loginCookieOptions(CODE_TTL_SECONDS));
  return {
    status: "sent",
    email,
    sentAt: Date.now(),
    note: resend ? "New code sent. Only the newest code works." : undefined,
  };
}

/**
 * Step two: check the code for the address in this browser's cookie, then
 * start the dashboard's own 7-day session.
 */
export async function checkSignInCode(
  _previous: CheckCodeState,
  formData: FormData,
): Promise<CheckCodeState> {
  const secret = authSecret();
  if (!secret) return { status: "error", message: "Sign-in isn't set up yet." };

  const jar = await cookies();
  const pending = emailAddress(jar.get(PENDING_COOKIE)?.value);
  if (!pending) {
    return { status: "error", message: "This code has run out. Ask for a new one." };
  }
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length < 6 || code.length > 10) {
    return { status: "error", message: "Enter the code from the email." };
  }

  const verified = await verifySignInCode(pending, code);
  if (!verified.ok) {
    if (verified.reason === "invalid") {
      return {
        status: "error",
        message: "That code isn't right or has run out. Check the newest email, or ask for a new code.",
      };
    }
    if (verified.reason === "rate_limited") {
      return { status: "error", message: "Too many tries. Wait a few minutes and try again." };
    }
    console.error(`[internal] checking the sign-in code failed: ${verified.message}`);
    return { status: "error", message: "Sign-in is unavailable right now. Try again in a minute." };
  }
  // We keep our own session; Supabase's isn't needed after this.
  const accessToken = verified.accessToken;
  after(() => endAuthSession(accessToken));

  // Checked again here, in case an invite was withdrawn after the code went out.
  const email = await allowedEmail(verified.user.email);
  if (!email || email !== pending || !verified.user.email_confirmed_at) {
    jar.set(PENDING_COOKIE, "", loginCookieOptions(0));
    return { status: "error", message: NOT_ALLOWED };
  }

  // First sign-in files an access request for an owner to approve; owners
  // and approved members go straight in (lib/internal/session.ts decides).
  // People on the team list (or who log interns' days) already have My day
  // or People, so they don't need a request.
  const team = await teamAccessFor(email);
  if (!team.person && team.interns.length === 0) {
    const requested = await requestAccess(email);
    if (!requested.ok) console.error(`[internal] filing access request failed: ${requested.message}`);
  }
  await touchMember(email);

  const now = nowSeconds();
  const session = await signToken({ email, iat: now, exp: now + SESSION_TTL_SECONDS }, secret);
  jar.set(SESSION_COOKIE, session, sessionCookieOptions(SESSION_TTL_SECONDS));
  jar.set(PENDING_COOKIE, "", loginCookieOptions(0));
  redirect(safeNext(formData.get("next")));
}
