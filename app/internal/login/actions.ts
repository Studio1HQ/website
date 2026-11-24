"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIp } from "@/lib/rate-limit";
import { loginCookieOptions, sessionCookieOptions } from "@/lib/internal/session";
import { checkCode, sendCode } from "@/lib/internal/sign-in";
import {
  CODE_TTL_SECONDS,
  PENDING_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  emailAddress,
  safeNext,
} from "@/lib/internal/token";

export type RequestCodeState =
  | { status: "idle" }
  | { status: "sent"; email: string; sentAt: number; note?: string }
  | { status: "error"; message: string };

export type CheckCodeState = { status: "idle" } | { status: "error"; message: string };

/** The caller's IP address, or null without the header (local dev). */
async function callerIp() {
  return clientIp(new Request("http://internal", { headers: await headers() }));
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
  const sent = await sendCode(formData.get("email"), await callerIp(), formData.get("resend") === "1");
  if (!sent.ok) return { status: "error", message: sent.message };
  (await cookies()).set(PENDING_COOKIE, sent.email, loginCookieOptions(CODE_TTL_SECONDS));
  return { status: "sent", email: sent.email, sentAt: Date.now(), note: sent.note };
}

/**
 * Step two: check the code for the address in this browser's cookie, then
 * start the dashboard's own 7-day session.
 */
export async function checkSignInCode(
  _previous: CheckCodeState,
  formData: FormData,
): Promise<CheckCodeState> {
  const jar = await cookies();
  const pending = emailAddress(jar.get(PENDING_COOKIE)?.value);
  if (!pending) {
    return { status: "error", message: "This code has run out. Ask for a new one." };
  }
  const checked = await checkCode(pending, formData.get("code"), await callerIp());
  if (!checked.ok) {
    if (checked.forget) jar.set(PENDING_COOKIE, "", loginCookieOptions(0));
    return { status: "error", message: checked.message };
  }
  jar.set(SESSION_COOKIE, checked.session, sessionCookieOptions(SESSION_TTL_SECONDS));
  jar.set(PENDING_COOKIE, "", loginCookieOptions(0));
  redirect(safeNext(formData.get("next")));
}
