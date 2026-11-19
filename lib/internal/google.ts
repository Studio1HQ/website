import { createSign } from "node:crypto";

/**
 * The dashboard's Google service account. It reads Search Console
 * (lib/internal/search-console.ts) and Google Analytics
 * (lib/internal/google-analytics.ts), and is added as a user in each.
 *
 *   GSC_CLIENT_EMAIL  the service account's email (…@….iam.gserviceaccount.com)
 *   GSC_PRIVATE_KEY   its private key from the JSON key file ("-----BEGIN
 *                     PRIVATE KEY-----\n…"; \n escapes and outer quotes are fine)
 */
export function serviceAccount() {
  const email = process.env.GSC_CLIENT_EMAIL?.trim();
  const key = process.env.GSC_PRIVATE_KEY?.trim()
    .replace(/^"([\s\S]*)"$/, "$1")
    .replace(/\\n/g, "\n")
    .trim();
  if (!email || !key?.includes("PRIVATE KEY")) return null;
  return { email, key };
}

export type ServiceAccount = NonNullable<ReturnType<typeof serviceAccount>>;

export const GOOGLE_SCOPES = {
  searchConsole: "https://www.googleapis.com/auth/webmasters.readonly",
  analytics: "https://www.googleapis.com/auth/analytics.readonly",
} as const;

const TOKEN_URL = "https://oauth2.googleapis.com/token";

const base64url = (value: string | Buffer) =>
  Buffer.from(value).toString("base64url");

/** A signed service-account assertion, exchanged for an access token. */
export async function googleAccessToken(
  { email, key }: ServiceAccount,
  scope: string,
) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(
    JSON.stringify({
      iss: email,
      scope,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  )}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64url(signature)}`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const json = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error_description?: string;
  };
  if (!response.ok || !json.access_token) {
    throw new Error(
      `Google refused the service account key (${json.error_description ?? response.status}).`,
    );
  }
  return json.access_token;
}

/** Google's own reason from an error response, cut short. */
export async function googleError(response: Response) {
  const json = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  const message = json.error?.message?.split("\n")[0]?.trim();
  return message ? message.slice(0, 240) : `HTTP ${response.status}`;
}
