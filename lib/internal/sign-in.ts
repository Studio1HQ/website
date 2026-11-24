import "server-only";
import { after } from "next/server";
import { endAuthSession, ensureAuthUser, sendSignInCode, verifySignInCode } from "@/lib/supabase-server";
import { accessFor, isInvited, membersWith, requestAccess, touchMember } from "@/lib/internal/members";
import { notify } from "@/lib/internal/notifications/data";
import { OWNERS, isOwner, isStaffEmail } from "@/lib/internal/roles";
import {
  SIGN_IN_CODE_ALL_NETWORKS,
  SIGN_IN_CODE_LIMIT,
  SIGN_IN_NETWORK_REQUESTS,
  SIGN_IN_NETWORK_TRIES,
  strictlyWithinLimit,
  type Limit,
} from "@/lib/rate-limit";
import { addToTeam, teamAccessFor } from "@/lib/internal/team/people";
import { SESSION_TTL_SECONDS, STAFF_DOMAIN, authSecret, emailAddress, nowSeconds, signToken, staffEmail } from "@/lib/internal/token";

/**
 * Signing in with an emailed code: the dashboard's login page
 * (app/internal/login/actions.ts) and the Studio1 Connect extension
 * (app/api/extension/sign-in) both go through these two steps, so the same
 * people get in, under the same limits, and get the same 7-day session.
 */

export const NOT_ALLOWED = `Use your @${STAFF_DOMAIN} address. Writers from outside Studio1 need an invite from an admin first.`;
const TOO_MANY = "Too many sign-in tries from this network. Wait an hour and try again.";
const UNAVAILABLE = "Sign-in is unavailable right now. Try again in a minute.";

/**
 * The limit for the caller's network, so one script can't send code emails
 * to made-up addresses or burn through an address's tries. Without an IP
 * (local dev) there's nothing to count.
 */
async function networkProblem(kind: string, limit: Limit, ip: string | null) {
  if (!ip) return null;
  const allowed = await strictlyWithinLimit(kind, ip, limit);
  return allowed === "limited" ? TOO_MANY : allowed === "unavailable" ? UNAVAILABLE : null;
}

/** Staff, or an outside writer an admin invited; anyone else gets null. */
async function allowedEmail(input: unknown) {
  const address = emailAddress(input);
  if (!address) return null;
  return staffEmail(address) ?? ((await isInvited(address)) ? address : null);
}

export type CodeSent = { ok: true; email: string; note?: string } | { ok: false; message: string };

/** Step one: email a sign-in code. Only staff addresses and invited writers ever reach Supabase. */
export async function sendCode(input: unknown, ip: string | null, resend = false): Promise<CodeSent> {
  if (!authSecret()) {
    console.error("[internal] INTERNAL_AUTH_SECRET (32+ characters) is missing");
    return { ok: false, message: "Sign-in isn't set up yet." };
  }
  if (!emailAddress(input)) return { ok: false, message: "Enter a valid email address." };
  const blocked = await networkProblem("sign-in-request-ip", SIGN_IN_NETWORK_REQUESTS, ip);
  if (blocked) return { ok: false, message: blocked };
  const email = await allowedEmail(input);
  if (!email) return { ok: false, message: NOT_ALLOWED };

  const user = await ensureAuthUser(email);
  if (!user.ok) {
    console.error(`[internal] creating the Supabase Auth user failed: ${user.message}`);
    return { ok: false, message: UNAVAILABLE };
  }

  const sent = await sendSignInCode(email);
  if (!sent.ok) {
    // Supabase sends one email a minute per address; the last code still works.
    if (sent.rateLimited && /only request this after/i.test(sent.message)) {
      return { ok: true, email, note: "We sent you a code less than a minute ago. Use that one, or ask again in a minute." };
    }
    console.error(`[internal] Supabase didn't send the sign-in code: ${sent.message}`);
    return {
      ok: false,
      message: sent.rateLimited
        ? "Too many sign-in emails were sent. Wait a few minutes and try again."
        : "We couldn't send the email. Try again in a minute.",
    };
  }
  return { ok: true, email, note: resend ? "New code sent. Only the newest code works." : undefined };
}

export type CodeChecked =
  | { ok: true; email: string; session: string }
  | { ok: false; message: string; /** The address may no longer sign in: forget it. */ forget?: boolean };

/**
 * Step two: check the code sent to `pending`, then start a 7-day session
 * (the signed token the dashboard keeps in its cookie).
 */
export async function checkCode(pending: string, input: unknown, ip: string | null): Promise<CodeChecked> {
  const secret = authSecret();
  if (!secret) return { ok: false, message: "Sign-in isn't set up yet." };
  const code = String(input ?? "").replace(/\D/g, "");
  if (code.length < 6 || code.length > 10) return { ok: false, message: "Enter the code from the email." };

  // The network first, so one script can't work through address after address.
  const blocked = await networkProblem("sign-in-code-ip", SIGN_IN_NETWORK_TRIES, ip);
  if (blocked) return { ok: false, message: blocked };

  // Then the address, so a script can't guess its way in (Supabase's own
  // limit is per IP, and every check comes from our server): ten tries an
  // hour from this network, and forty from every network together. A
  // network over its ten stops here, before it counts toward the forty, so
  // one network can't lock the person out for everyone else.
  const fromHere = await strictlyWithinLimit("sign-in-code", `${pending}|${ip ?? "no-ip"}`, SIGN_IN_CODE_LIMIT);
  const everywhere =
    fromHere === "allowed" ? await strictlyWithinLimit("sign-in-code-all", pending, SIGN_IN_CODE_ALL_NETWORKS) : fromHere;
  if (everywhere === "limited") return { ok: false, message: "Too many tries for this address. Wait an hour, then ask for a new code." };
  if (everywhere === "unavailable") return { ok: false, message: UNAVAILABLE };

  const verified = await verifySignInCode(pending, code);
  if (!verified.ok) {
    if (verified.reason === "invalid") {
      return { ok: false, message: "That code isn't right or has run out. Check the newest email, or ask for a new code." };
    }
    if (verified.reason === "rate_limited") return { ok: false, message: "Too many tries. Wait a few minutes and try again." };
    console.error(`[internal] checking the sign-in code failed: ${verified.message}`);
    return { ok: false, message: UNAVAILABLE };
  }
  // We keep our own session; Supabase's isn't needed after this.
  const accessToken = verified.accessToken;
  after(() => endAuthSession(accessToken));

  // Checked again here, in case an invite was withdrawn after the code went out.
  const email = await allowedEmail(verified.user.email);
  if (!email || email !== pending || !verified.user.email_confirmed_at) return { ok: false, message: NOT_ALLOWED, forget: true };

  // Everyone who signs in with an @studio1hq.com address joins People
  // straight away, with My day, Tasks and Calls and no approval needed (the
  // owner, 16 Nov 2026). Areas on People still wait for an admin.
  // Someone whose access is turned off, or who's marked as left on People,
  // stays out (addToTeam never touches an existing row).
  if (isStaffEmail(email) && !isOwner(email)) {
    const access = await accessFor(email);
    if (access.kind === "none" || (access.kind === "member" && access.member.status !== "disabled")) {
      await addToTeam(email, access.kind === "member" ? access.member.name : "", email);
    }
  }

  // Anyone else's first sign-in files an access request for an owner to
  // approve; owners and approved members go straight in
  // (lib/internal/session.ts decides). People on the team list (or who log
  // interns' days) already have My day or People, so they don't need one.
  const team = await teamAccessFor(email);
  if (!team.person && team.interns.length === 0) {
    const requested = await requestAccess(email);
    if (!requested.ok) console.error(`[internal] filing access request failed: ${requested.message}`);
    else if (requested.created) {
      // So the request doesn't wait until an admin happens to open People.
      after(async () => {
        const admins = await membersWith(["admin"]).catch(() => [] as string[]);
        await notify([...OWNERS, ...admins], email, {
          kind: "access",
          title: "Someone is asking for dashboard access",
          body: email,
          href: "/people",
        });
      });
    }
  }
  await touchMember(email);

  const now = nowSeconds();
  const session = await signToken({ email, iat: now, exp: now + SESSION_TTL_SECONDS }, secret);
  return { ok: true, email, session };
}
