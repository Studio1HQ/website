"use server";

import { cookies, headers } from "next/headers";
import { baseUrl } from "@/lib/site";
import { ensureAuthUser, sendMagicLink } from "@/lib/supabase-server";
import { isInvited } from "@/lib/internal/members";
import { linkCookieOptions } from "@/lib/internal/session";
import {
  LINK_TTL_SECONDS,
  NEXT_COOKIE,
  STAFF_DOMAIN,
  VERIFIER_COOKIE,
  authSecret,
  emailAddress,
  randomToken,
  safeNext,
  sha256,
  staffEmail,
} from "@/lib/internal/token";

export type LoginState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

/**
 * Production links always point at the live site, never at whatever Host the
 * request claimed. Vercel previews and local dev use their own host so the
 * link lands in the same browser session. Each origin's callback must be in
 * Supabase → Authentication → URL Configuration → Redirect URLs.
 */
async function siteOrigin() {
  const host = (await headers()).get("host") ?? "";
  if (
    process.env.NODE_ENV === "development" &&
    /^(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(host)
  ) {
    return `http://${host}`;
  }
  if (process.env.VERCEL_ENV === "preview" && /^[a-z0-9-]+\.vercel\.app$/.test(host)) {
    return `https://${host}`;
  }
  return baseUrl;
}

export async function requestSignInLink(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!authSecret()) {
    console.error("[internal] INTERNAL_AUTH_SECRET (32+ characters) is missing");
    return { status: "error", message: "Sign-in isn't set up yet." };
  }

  // Only staff addresses and invited writers ever reach Supabase.
  const address = emailAddress(formData.get("email"));
  if (!address) return { status: "error", message: "Enter a valid email address." };
  const email = staffEmail(address) ?? ((await isInvited(address)) ? address : null);
  if (!email) {
    return {
      status: "error",
      message: `Use your @${STAFF_DOMAIN} address. Writers from outside Studio1 need an invite from an admin first.`,
    };
  }

  const user = await ensureAuthUser(email);
  if (!user.ok) {
    console.error(`[internal] creating the Supabase Auth user failed: ${user.message}`);
    return { status: "error", message: "Sign-in is unavailable right now. Try again in a minute." };
  }

  const verifier = randomToken(48);
  const sent = await sendMagicLink(
    email,
    `${await siteOrigin()}/internal/auth/callback`,
    await sha256(verifier),
  );
  if (!sent.ok) {
    console.error(`[internal] Supabase didn't send the magic link: ${sent.message}`);
    return {
      status: "error",
      message: sent.rateLimited
        ? "Too many sign-in emails were sent. Wait a few minutes and try again."
        : "We couldn't send the email. Try again in a minute.",
    };
  }

  const jar = await cookies();
  jar.set(VERIFIER_COOKIE, verifier, linkCookieOptions(LINK_TTL_SECONDS));
  jar.set(NEXT_COOKIE, safeNext(formData.get("next")), linkCookieOptions(LINK_TTL_SECONDS));
  return { status: "sent", email };
}
