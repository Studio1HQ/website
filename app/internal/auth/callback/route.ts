import { NextResponse, type NextRequest } from "next/server";
import { endAuthSession, exchangeAuthCode } from "@/lib/supabase-server";
import { isInvited, requestAccess, touchMember } from "@/lib/internal/members";
import { linkCookieOptions, sessionCookieOptions } from "@/lib/internal/session";
import {
  NEXT_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  VERIFIER_COOKIE,
  authSecret,
  emailAddress,
  nowSeconds,
  safeNext,
  signToken,
  staffEmail,
} from "@/lib/internal/token";

/**
 * Where Supabase's magic link lands. The `code` only turns into a session
 * with the PKCE verifier saved in this browser when the link was asked for,
 * so a forwarded or leaked link can't sign anyone in.
 */
export async function GET(request: NextRequest) {
  const fail = (reason: "expired" | "browser" | "denied") => {
    const url = new URL("/internal/login", request.url);
    url.searchParams.set("error", reason);
    return NextResponse.redirect(url, 303);
  };

  const secret = authSecret();
  const code = request.nextUrl.searchParams.get("code");
  // Supabase sends error=… (e.g. otp_expired) instead of a code.
  if (!secret || !code) return fail("expired");

  const verifier = request.cookies.get(VERIFIER_COOKIE)?.value;
  if (!verifier) return fail("browser");

  const exchanged = await exchangeAuthCode(code, verifier);
  if (!exchanged.ok) {
    console.error(`[internal] magic link exchange failed: ${exchanged.message}`);
    return fail("expired");
  }
  // We keep our own session; Supabase's isn't needed after this.
  void endAuthSession(exchanged.accessToken);

  // Staff, or an outside writer an admin invited (checked again here, in
  // case the invite was withdrawn after the link went out).
  const address = emailAddress(exchanged.user.email);
  const email = address && (staffEmail(address) ?? ((await isInvited(address)) ? address : null));
  if (!email || !exchanged.user.email_confirmed_at) return fail("denied");

  // First sign-in files an access request for an admin to approve; owners
  // and approved members go straight in (lib/internal/session.ts decides).
  const requested = await requestAccess(email);
  if (!requested.ok) console.error(`[internal] filing access request failed: ${requested.message}`);
  await touchMember(email);

  const now = nowSeconds();
  const session = await signToken({ email, iat: now, exp: now + SESSION_TTL_SECONDS }, secret);
  const next = safeNext(request.cookies.get(NEXT_COOKIE)?.value);

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions(SESSION_TTL_SECONDS));
  response.cookies.set(VERIFIER_COOKIE, "", linkCookieOptions(0));
  response.cookies.set(NEXT_COOKIE, "", linkCookieOptions(0));
  return response;
}
