/**
 * The internal dashboard's session cookie, on Web Crypto only so the same
 * code runs in proxy.ts and in server components.
 *
 * Supabase Auth proves the email address (magic link); the dashboard then
 * keeps its own session: `<payload>.<signature>`, base64url JSON and an
 * HMAC-SHA256 of `session.<payload>`.
 */

import { STAFF_DOMAIN } from "@/lib/internal/roles";

export { STAFF_DOMAIN };

export const SESSION_COOKIE = "s1_internal_session";
/** The PKCE verifier: a magic link only works in the browser that asked. */
export const VERIFIER_COOKIE = "s1_internal_verifier";
/** Where to go once the link is opened. */
export const NEXT_COOKIE = "s1_internal_next";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
/** Supabase's default magic-link lifetime (Email OTP Expiration). */
export const LINK_TTL_SECONDS = 60 * 60;

export type SessionPayload = { email: string; iat: number; exp: number };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * The session signing key: INTERNAL_AUTH_SECRET when set (change it to sign
 * everyone out), otherwise derived from the Supabase secret key, so the
 * dashboard needs no extra setup. The environment is part of the key, so a
 * session made on a dev machine never works on the live site.
 */
export function authSecret(): string | null {
  const secret = process.env.INTERNAL_AUTH_SECRET;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base =
    secret && secret.length >= 32
      ? secret
      : supabaseKey && supabaseKey.length >= 32
        ? supabaseKey
        : null;
  return base
    ? `studio1-internal-session:${process.env.NODE_ENV}:${base}`
    : null;
}

/**
 * Local development only: with INTERNAL_DEV_BYPASS set to a staff address in
 * .env.local, `next dev` on localhost skips sign-in and acts as that
 * address. Production builds (NODE_ENV=production) never take this path.
 */
export function devBypassEmail(host: string | null | undefined): string | null {
  if (process.env.NODE_ENV !== "development") return null;
  if (!/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host ?? "")) return null;
  return staffEmail(process.env.INTERNAL_DEV_BYPASS);
}

/**
 * A lowercased, plain email address on any domain, or null. Outside
 * addresses only ever get in when an admin invited them (lib/internal/members.ts).
 */
export function emailAddress(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  if (email.length > 254) return null;
  const local = /^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?$/;
  const host = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
  const [name, domain, extra] = email.split("@");
  if (extra !== undefined || !name || !domain) return null;
  return local.test(name) && !name.includes("..") && host.test(domain) ? email : null;
}

/** Lowercased address on the staff domain, or null for anything else. */
export function staffEmail(input: unknown): string | null {
  const email = emailAddress(input);
  return email && email.endsWith(`@${STAFF_DOMAIN}`) ? email : null;
}

/** Where to go after signing in: a dashboard path, never another site. */
export function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/internal";
  if (
    !/^\/internal(?:[/?]|$)/.test(value) ||
    value.includes("\\") ||
    value.includes("..") ||
    /^\/internal\/(?:login|auth)(?:[/?]|$)/.test(value)
  ) {
    return "/internal";
  }
  return value.slice(0, 500);
}

export function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const padded =
      value.replace(/-/g, "+").replace(/_/g, "/") +
      "===".slice((value.length + 3) % 4);
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

export function randomToken(bytes = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return base64url(new Uint8Array(digest));
}

const keys = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string) {
  let key = keys.get(secret);
  if (!key) {
    key = crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    keys.set(secret, key);
  }
  return key;
}

export async function signToken(payload: SessionPayload, secret: string) {
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    encoder.encode(`session.${body}`),
  );
  return `${body}.${base64url(new Uint8Array(signature))}`;
}

/** The payload when the signature is valid and `exp` is still ahead. */
export async function verifyToken(
  token: string | undefined | null,
  secret: string,
): Promise<SessionPayload | null> {
  if (!token || token.length > 4096) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  const signatureBytes = fromBase64url(signature);
  const bodyBytes = fromBase64url(body);
  if (!signatureBytes || !bodyBytes) return null;
  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    signatureBytes,
    encoder.encode(`session.${body}`),
  );
  if (!valid) return null;
  try {
    const payload = JSON.parse(decoder.decode(bodyBytes)) as SessionPayload;
    return typeof payload.exp === "number" && payload.exp > nowSeconds()
      ? payload
      : null;
  } catch {
    return null;
  }
}

/**
 * Checks a session cookie value: the signed-in email, or null. Sessions are
 * only ever issued to staff and invited writers (app/internal/auth/callback),
 * and every page re-checks access (lib/internal/session.ts).
 */
export async function readSession(token: string | undefined | null) {
  const secret = authSecret();
  if (!secret) return null;
  const payload = await verifyToken(token, secret);
  return payload ? emailAddress(payload.email) : null;
}
