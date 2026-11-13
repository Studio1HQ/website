import { baseUrl } from "@/lib/site";
import { selectRows, updateRows } from "@/lib/supabase-server";

/**
 * Unsubscribe links for Studio1's email updates. Each link carries the
 * address and an HMAC of it, so nobody can unsubscribe someone else by
 * editing the URL. Links don't expire: they have to keep working in old
 * emails. Unsubscribing sets email_updates = false on every form entry from
 * that address, which takes it off the email_subscribers view.
 */

const FORM_TABLES = [
  "job_applications",
  "hackathon_registrations",
  "devrel_cohort_applications",
] as const;

const encoder = new TextEncoder();

let warnedNoSecret = false;

/**
 * The signing key. Which variable signs is fixed: links in emails already
 * sent have to keep verifying. With neither set (or one under 32
 * characters), emails go out with no unsubscribe link and old links stop
 * working, so that is logged loudly, once per server start.
 */
function secret() {
  const key = process.env.INTERNAL_AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (key && key.length >= 32) return `studio1-unsubscribe:${key}`;
  if (!warnedNoSecret) {
    warnedNoSecret = true;
    console.error(
      "[unsubscribe] NO SIGNING SECRET: set INTERNAL_AUTH_SECRET (32+ characters). Until then emails carry no unsubscribe link and existing links don't work.",
    );
  }
  return null;
}

function base64url(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(email: string) {
  const key = secret();
  if (!key) return null;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(email.toLowerCase()));
  return base64url(signature).slice(0, 32);
}

export async function unsubscribeUrl(email: string) {
  const token = await sign(email);
  if (!token) return null;
  const params = new URLSearchParams({ e: email.toLowerCase(), t: token });
  return `${baseUrl}/unsubscribe?${params}`;
}

/**
 * List-Unsubscribe headers for an unsubscribe link, so mail apps show their
 * own Unsubscribe button, which posts to the one-click route. Only for
 * email that unsubscribing really stops (the updates about new roles,
 * cohorts and events). Emails about someone's own application or
 * registration don't carry it: the button would promise something it can't
 * do, and the next click is "Report spam".
 */
export function unsubscribeHeaders(url: string | null): Record<string, string> {
  if (!url) return {};
  const oneClick = url.replace(`${baseUrl}/unsubscribe?`, `${baseUrl}/unsubscribe/one-click?`);
  return {
    "List-Unsubscribe": `<${oneClick}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** The address when the token matches it, else null. */
export async function verifyUnsubscribe(email: unknown, token: unknown) {
  if (typeof email !== "string" || typeof token !== "string") return null;
  const address = email.trim().toLowerCase();
  if (!address.includes("@") || address.length > 254 || token.length !== 32) return null;
  const expected = await sign(address);
  if (!expected) return null;
  // Compare digests so the check takes the same time whatever the input.
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(token)),
  ]);
  return base64url(a) === base64url(b) ? address : null;
}

/** Turns email updates off on every entry from this address. */
export async function unsubscribe(email: string) {
  const address = email.toLowerCase();
  // ilike matches case-insensitively; its wildcards are escaped, and the
  // exact comparison below drops anything else it caught.
  const pattern = address.replace(/[\\%_*]/g, (char) => `\\${char}`);
  let changed = 0;
  for (const table of FORM_TABLES) {
    const found = await selectRows(
      table,
      new URLSearchParams({ select: "id,email", email: `ilike.${pattern}`, email_updates: "is.true" }),
    );
    if (!found.ok) return { ok: false as const, message: found.message };
    const ids = found.rows
      .filter((row) => String(row.email ?? "").toLowerCase() === address)
      .map((row) => String(row.id));
    if (!ids.length) continue;
    const result = await updateRows(
      table,
      new URLSearchParams({ id: `in.(${ids.join(",")})` }),
      { email_updates: false },
    );
    if (!result.ok) return { ok: false as const, message: result.message };
    changed += result.count;
  }
  return { ok: true as const, changed };
}
