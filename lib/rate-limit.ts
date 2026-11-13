import { createHash } from "node:crypto";
import { deleteRows, insertRow, isSupabaseConfigured, selectRows } from "@/lib/supabase-server";

/**
 * Rate limits for the public forms, counted in Supabase (`rate_limit_hits`,
 * supabase/migrations/20261114100000_rate_limits.sql). The honeypot and the
 * fill timer in lib/form-guard.ts only stop naive bots: a script can pass
 * both, so each form also limits how often one network and one email
 * address can submit, and how many confirmation emails one address gets in
 * a day.
 *
 * Server only. Every check fails open: with Supabase unreachable, or the
 * table missing because the migration hasn't run yet, the answer is "allow"
 * and the reason is logged, so a counting problem never breaks a form.
 */

const TABLE = "rate_limit_hits";

export type Limit = { limit: number; windowSeconds: number };

const HOUR = 60 * 60;

/**
 * Submissions from one network, per form. Generous on purpose: a whole
 * college lab or office can share one address.
 */
export const IP_LIMIT: Limit = { limit: 30, windowSeconds: HOUR };
/** The careers form stores a 4 MB PDF per submission, so it gets fewer. */
export const IP_UPLOAD_LIMIT: Limit = { limit: 12, windowSeconds: HOUR };
/** Submissions for one email address, across every form. */
export const ADDRESS_LIMIT: Limit = { limit: 6, windowSeconds: HOUR };
/** "We've received it" emails to one address, across every form. */
export const CONFIRMATION_LIMIT: Limit = { limit: 6, windowSeconds: 24 * HOUR };

/**
 * One inbox, one key: lowercased, with the "+tag" dropped, and for Gmail
 * the dots too, since a.b+x@gmail.com and ab@gmail.com reach the same
 * person. Only for counting; the address itself is stored as typed.
 */
export function normaliseAddress(email: string) {
  const address = email.trim().toLowerCase();
  const at = address.lastIndexOf("@");
  if (at < 1) return address;
  let local = address.slice(0, at).split("+")[0];
  let domain = address.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}

/**
 * The visitor's IP address, from the headers the host sets, or null. Vercel
 * overwrites both, so a visitor can't choose their own.
 */
export function clientIp(request: Request) {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded ? forwarded.slice(0, 64) : null;
}

/** The stored key: a hash, so the table holds no IP or email addresses. */
export function limitKey(kind: string, value: string) {
  return createHash("sha256").update(`studio1-rate-limit:${kind}:${value}`).digest("hex").slice(0, 40);
}

let warnedMissing = false;

function failOpen(message: string) {
  if (/PGRST205|42P01|Could not find the table|does not exist/.test(message)) {
    if (!warnedMissing) {
      warnedMissing = true;
      console.warn(
        "[rate-limit] the rate_limit_hits table is missing, so the forms aren't rate limited. Run supabase/migrations/20261114100000_rate_limits.sql.",
      );
    }
  } else {
    console.error(`[rate-limit] couldn't count, letting the request through: ${message}`);
  }
  return true;
}

/**
 * Counts one attempt against a limit. True when it's within the limit (and
 * now counted); false when the limit is already used up, in which case
 * nothing is added. Two requests at the same instant can both slip through
 * the last free place, which is fine for limits this loose.
 */
export async function withinLimit(kind: string, value: string, { limit, windowSeconds }: Limit, now = Date.now()) {
  if (!isSupabaseConfigured()) return true;
  const key = limitKey(kind, value);
  const since = new Date(now - windowSeconds * 1000).toISOString();
  const counted = await selectRows(
    TABLE,
    new URLSearchParams({ select: "id", key: `eq.${key}`, created_at: `gte.${since}`, limit: "1" }),
    { count: true },
  );
  if (!counted.ok) return failOpen(counted.message);
  if ((counted.total ?? 0) >= limit) return false;

  const saved = await insertRow(TABLE, { key });
  if (!saved.ok) return failOpen(saved.message);
  // Now and then, clear out rows no limit looks at any more.
  if (Math.random() < 0.02) {
    const old = new Date(now - 2 * 24 * HOUR * 1000).toISOString();
    void deleteRows(TABLE, new URLSearchParams({ created_at: `lt.${old}` }));
  }
  return true;
}

/** The form's limit for the visitor's network. Without an IP header, allows. */
export async function networkWithinLimit(form: string, request: Request, limit: Limit = IP_LIMIT) {
  const ip = clientIp(request);
  return ip ? withinLimit(`ip:${form}`, ip, limit) : true;
}

/** The limit on submissions for one email address, across the forms. */
export function addressWithinLimit(email: string) {
  return withinLimit("address", normaliseAddress(email), ADDRESS_LIMIT);
}

/** The daily limit on confirmation emails to one address. */
export function confirmationWithinLimit(email: string) {
  return withinLimit("confirmation", normaliseAddress(email), CONFIRMATION_LIMIT);
}

export const TOO_MANY_FROM_NETWORK =
  "Too many submissions from your network in the last hour. Try again later, or email contact@studio1hq.com.";
export const TOO_MANY_FOR_ADDRESS =
  "Too many submissions with this email address in the last hour. Try again later.";
