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
