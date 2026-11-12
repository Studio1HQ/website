/**
 * Minimal server-side Supabase client over the REST and Storage APIs, so the
 * site needs no Supabase SDK. Import it only from route handlers or other
 * server code: it uses the service-role key, which bypasses row-level
 * security and must never reach the browser.
 *
 * Env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (the legacy service_role
 * JWT or a newer "sb_secret_..." key; both work).
 */

type Failure = { ok: false; message: string };

export type InsertResult = { ok: true } | (Failure & { duplicate: boolean });
export type UploadResult = { ok: true } | Failure;

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export function isSupabaseConfigured() {
  return config() !== null;
}

function authHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = { apikey: key };
  // service_role keys are JWTs and also go in Authorization; sb_secret_ keys
  // are not JWTs, and the gateway rejects them there.
  if (key.startsWith("eyJ")) headers.authorization = `Bearer ${key}`;
  return headers;
}

const encodePath = (path: string) =>
  path.split("/").map(encodeURIComponent).join("/");

/** Inserts one row. `duplicate` is true when a unique constraint blocked it. */
export async function insertRow(
  table: string,
  row: Record<string, unknown>,
): Promise<InsertResult> {
  const supabase = config();
  if (!supabase) {
    return {
      ok: false,
      duplicate: false,
      message: "Supabase isn't configured",
    };
  }
  try {
    const response = await fetch(`${supabase.url}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        ...authHeaders(supabase.key),
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify(row),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return { ok: true };
    const detail = await response.text().catch(() => "");
    return {
      ok: false,
      // 23505: unique_violation, e.g. the same email applying twice.
      duplicate: response.status === 409 && detail.includes("23505"),
      message: `${response.status} ${detail.slice(0, 300)}`,
    };
  } catch (error) {
    return { ok: false, duplicate: false, message: String(error) };
  }
}

/** Inserts several rows in one request. */
export async function insertRows(
  table: string,
  rows: Record<string, unknown>[],
): Promise<{ ok: true } | Failure> {
  const supabase = config();
  if (!supabase) return { ok: false, message: "Supabase isn't configured" };
  if (rows.length === 0) return { ok: true };
  try {
    const response = await fetch(`${supabase.url}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        ...authHeaders(supabase.key),
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify(rows),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return { ok: true };
    const detail = await response.text().catch(() => "");
    return { ok: false, message: `${response.status} ${detail.slice(0, 300)}` };
  } catch (error) {
    return { ok: false, message: String(error) };
  }
}

/**
 * Inserts rows; a row whose `onConflict` key already exists is merged into
 * the existing one, or left alone with `keepExisting`.
 */
export async function upsertRows(
  table: string,
  rows: Record<string, unknown>[],
  options: { onConflict: string; keepExisting?: boolean },
): Promise<{ ok: true } | Failure> {
  const supabase = config();
  if (!supabase) return { ok: false, message: "Supabase isn't configured" };
  if (rows.length === 0) return { ok: true };
  const resolution = options.keepExisting ? "ignore-duplicates" : "merge-duplicates";
  try {
    const response = await fetch(
      `${supabase.url}/rest/v1/${table}?on_conflict=${encodeURIComponent(options.onConflict)}`,
      {
        method: "POST",
        headers: {
          ...authHeaders(supabase.key),
          "content-type": "application/json",
          prefer: `resolution=${resolution},return=minimal`,
        },
        body: JSON.stringify(rows),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.ok) return { ok: true };
    const detail = await response.text().catch(() => "");
    return { ok: false, message: `${response.status} ${detail.slice(0, 300)}` };
  } catch (error) {
    return { ok: false, message: String(error) };
  }
}

/** A PostgREST `in.(…)` filter value, each item quoted. */
export function inList(values: string[]) {
  return `in.(${values.map((value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")})`;
}

/** Uploads a file to a Storage bucket; never overwrites an existing path. */
export async function uploadFile(
  bucket: string,
  path: string,
  file: Blob,
  contentType: string,
): Promise<UploadResult> {
  const supabase = config();
  if (!supabase) return { ok: false, message: "Supabase isn't configured" };
  try {
    const response = await fetch(
      `${supabase.url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodePath(path)}`,
      {
        method: "POST",
        headers: {
          ...authHeaders(supabase.key),
          "content-type": contentType,
          "x-upsert": "false",
        },
        body: file,
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (response.ok) return { ok: true };
    const detail = await response.text().catch(() => "");
    return { ok: false, message: `${response.status} ${detail.slice(0, 300)}` };
  } catch (error) {
    return { ok: false, message: String(error) };
  }
}

/** Reads a file from a private Storage bucket. */
export async function downloadFile(
  bucket: string,
  path: string,
): Promise<{ ok: true; body: ArrayBuffer; contentType: string } | (Failure & { notFound: boolean })> {
  const supabase = config();
  if (!supabase) return { ok: false, notFound: false, message: "Supabase isn't configured" };
  try {
    const response = await fetch(
      `${supabase.url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodePath(path)}`,
      { headers: authHeaders(supabase.key), cache: "no-store", signal: AbortSignal.timeout(20_000) },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        notFound: response.status === 404 || response.status === 400,
        message: `${response.status} ${detail.slice(0, 300)}`,
      };
    }
    return {
      ok: true,
      body: await response.arrayBuffer(),
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
    };
  } catch (error) {
    return { ok: false, notFound: false, message: String(error) };
  }
}

/** Best-effort delete, used to clean up an upload when the insert fails. */
export async function removeFiles(bucket: string, paths: string[]) {
  const supabase = config();
  if (!supabase || paths.length === 0) return;
  try {
    const response = await fetch(
      `${supabase.url}/storage/v1/object/${encodeURIComponent(bucket)}`,
      {
        method: "DELETE",
        headers: {
          ...authHeaders(supabase.key),
          "content-type": "application/json",
        },
        body: JSON.stringify({ prefixes: paths }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) {
      console.error(
        `[supabase] removing ${paths.length} file(s) from ${bucket} failed: ${response.status}`,
      );
    }
  } catch (error) {
    console.error(`[supabase] removing files from ${bucket} failed`, error);
  }
}

export type SelectResult<T> =
  | { ok: true; rows: T[]; total: number | null }
  | Failure;

/**
 * Reads rows with a PostgREST query (`select`, filters, `order`, `limit`,
 * `offset`). With `count`, `total` is the number of rows matching the
 * filters, ignoring limit and offset.
 */
export async function selectRows<T = Record<string, unknown>>(
  table: string,
  query: URLSearchParams,
  options: { count?: boolean } = {},
): Promise<SelectResult<T>> {
  const supabase = config();
  if (!supabase) return { ok: false, message: "Supabase isn't configured" };
  try {
    const response = await fetch(
      `${supabase.url}/rest/v1/${table}?${query.toString()}`,
      {
        headers: {
          ...authHeaders(supabase.key),
          ...(options.count ? { prefer: "count=exact" } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
    const range = response.headers.get("content-range");
    const total = range?.match(/\/(\d+)$/)?.[1];
    // 416: an offset past the last row. No rows, but the count still holds.
    if (response.status === 416) {
      return { ok: true, rows: [], total: total ? Number(total) : 0 };
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { ok: false, message: `${response.status} ${detail.slice(0, 300)}` };
    }
    return {
      ok: true,
      rows: (await response.json()) as T[],
      total: total ? Number(total) : null,
    };
  } catch (error) {
    return { ok: false, message: String(error) };
  }
}

/** Updates the rows matching `query`; `count` is how many changed. */
export async function updateRows(
  table: string,
  query: URLSearchParams,
  patch: Record<string, unknown>,
  /** A column to return per changed row, for the count. */
  returning = "id",
): Promise<{ ok: true; count: number } | Failure> {
  const supabase = config();
  if (!supabase) return { ok: false, message: "Supabase isn't configured" };
  const filters = new URLSearchParams(query);
  filters.set("select", returning);
  try {
    const response = await fetch(
      `${supabase.url}/rest/v1/${table}?${filters.toString()}`,
      {
        method: "PATCH",
        headers: {
          ...authHeaders(supabase.key),
          "content-type": "application/json",
          prefer: "return=representation",
        },
        body: JSON.stringify(patch),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { ok: false, message: `${response.status} ${detail.slice(0, 300)}` };
    }
    const rows = (await response.json()) as unknown[];
    return { ok: true, count: rows.length };
  } catch (error) {
    return { ok: false, message: String(error) };
  }
}

/** Deletes the rows matching `query`; `count` is how many went. */
export async function deleteRows(
  table: string,
  query: URLSearchParams,
): Promise<{ ok: true; count: number } | Failure> {
  const supabase = config();
  if (!supabase) return { ok: false, message: "Supabase isn't configured" };
  // PostgREST refuses a DELETE without filters; never send one anyway.
  if ([...query.keys()].length === 0) return { ok: false, message: "No filter given" };
  const filters = new URLSearchParams(query);
  filters.set("select", "id");
  try {
    const response = await fetch(`${supabase.url}/rest/v1/${table}?${filters.toString()}`, {
      method: "DELETE",
      headers: { ...authHeaders(supabase.key), prefer: "return=representation" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { ok: false, message: `${response.status} ${detail.slice(0, 300)}` };
    }
    return { ok: true, count: ((await response.json()) as unknown[]).length };
  } catch (error) {
    return { ok: false, message: String(error) };
  }
}

/** A short-lived link to a file in a private bucket. */
export async function signedFileUrl(
  bucket: string,
  path: string,
  expiresIn = 120,
): Promise<{ ok: true; url: string } | Failure> {
  const supabase = config();
  if (!supabase) return { ok: false, message: "Supabase isn't configured" };
  try {
    const response = await fetch(
      `${supabase.url}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodePath(path)}`,
      {
        method: "POST",
        headers: {
          ...authHeaders(supabase.key),
          "content-type": "application/json",
        },
        body: JSON.stringify({ expiresIn }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { ok: false, message: `${response.status} ${detail.slice(0, 300)}` };
    }
    const { signedURL } = (await response.json()) as { signedURL?: string };
    if (!signedURL) return { ok: false, message: "No signed URL returned" };
    return { ok: true, url: `${supabase.url}/storage/v1${signedURL}` };
  } catch (error) {
    return { ok: false, message: String(error) };
  }
}

// ---------------------------------------------------------------------
// Auth: magic-link sign-in for the internal dashboard (app/internal).
// ---------------------------------------------------------------------

async function authError(response: Response) {
  const detail = await response.text().catch(() => "");
  let code = "";
  try {
    const body = JSON.parse(detail) as { error_code?: string; code?: string };
    code = body.error_code ?? (typeof body.code === "string" ? body.code : "");
  } catch {
    // Not JSON; keep the raw text in the message.
  }
  return { status: response.status, code, message: `${response.status} ${detail.slice(0, 300)}` };
}

/**
 * Makes sure an Auth user exists for this address, confirmed. Uses the admin
 * API, so it works with public sign-ups turned off; callers check the
 * address first.
 */
export async function ensureAuthUser(email: string): Promise<{ ok: true } | Failure> {
  const supabase = config();
  if (!supabase) return { ok: false, message: "Supabase isn't configured" };
  try {
    const response = await fetch(`${supabase.url}/auth/v1/admin/users`, {
      method: "POST",
      headers: { ...authHeaders(supabase.key), "content-type": "application/json" },
      body: JSON.stringify({ email, email_confirm: true }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return { ok: true };
    const error = await authError(response);
    // Already registered: nothing to do.
    if (error.code === "email_exists" || /already been registered/i.test(error.message)) {
      return { ok: true };
    }
    return { ok: false, message: error.message };
  } catch (error) {
    return { ok: false, message: String(error) };
  }
}

export type MagicLinkResult =
  | { ok: true }
  | (Failure & { rateLimited: boolean });

/**
 * Emails a magic link with the PKCE flow: the link comes back to
 * `redirectTo` with a `code` that only the holder of the verifier (the
 * browser that asked) can exchange for a session.
 */
export async function sendMagicLink(
  email: string,
  redirectTo: string,
  codeChallenge: string,
): Promise<MagicLinkResult> {
  const supabase = config();
  if (!supabase) {
    return { ok: false, rateLimited: false, message: "Supabase isn't configured" };
  }
  try {
    const response = await fetch(
      `${supabase.url}/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`,
      {
        method: "POST",
        headers: { ...authHeaders(supabase.key), "content-type": "application/json" },
        body: JSON.stringify({
          email,
          create_user: false,
          code_challenge: codeChallenge,
          code_challenge_method: "s256",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (response.ok) return { ok: true };
    const error = await authError(response);
    return {
      ok: false,
      rateLimited: error.status === 429 || error.code.includes("rate_limit"),
      message: error.message,
    };
  } catch (error) {
    return { ok: false, rateLimited: false, message: String(error) };
  }
}

export type AuthUser = { id: string; email?: string; email_confirmed_at?: string | null };

/** Trades a magic link's `code` and the PKCE verifier for the signed-in user. */
export async function exchangeAuthCode(
  code: string,
  codeVerifier: string,
): Promise<{ ok: true; user: AuthUser; accessToken: string } | Failure> {
  const supabase = config();
  if (!supabase) return { ok: false, message: "Supabase isn't configured" };
  try {
    const response = await fetch(`${supabase.url}/auth/v1/token?grant_type=pkce`, {
      method: "POST",
      headers: { ...authHeaders(supabase.key), "content-type": "application/json" },
      body: JSON.stringify({ auth_code: code, code_verifier: codeVerifier }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { ok: false, message: (await authError(response)).message };
    const body = (await response.json()) as { access_token?: string; user?: AuthUser };
    if (!body.user || !body.access_token) {
      return { ok: false, message: "No user in the token response" };
    }
    return { ok: true, user: body.user, accessToken: body.access_token };
  } catch (error) {
    return { ok: false, message: String(error) };
  }
}

/** Ends a Supabase session we don't keep (best effort). */
export async function endAuthSession(accessToken: string) {
  const supabase = config();
  if (!supabase) return;
  try {
    await fetch(`${supabase.url}/auth/v1/logout?scope=local`, {
      method: "POST",
      headers: { apikey: supabase.key, authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // The session expires on its own.
  }
}
