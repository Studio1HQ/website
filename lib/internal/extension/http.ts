import "server-only";
import { hasAccess, staffForEmail, type Staff } from "@/lib/internal/session";
import { readSession } from "@/lib/internal/token";

const NO_STORE = { "cache-control": "no-store" };

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

/**
 * The person behind an extension request: the extension signs in with an
 * emailed code like the dashboard (app/api/extension/sign-in) and sends the
 * same signed 7-day session as "Authorization: Bearer …". Nothing is
 * stored per browser. Null when the session is missing, forged or run out,
 * or its owner has lost access; their roles are read fresh every time, so
 * it never opens more than the dashboard would.
 */
export async function staffFromRequest(request: Request): Promise<Staff | null> {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
  const email = await readSession(match?.[1]);
  if (!email) return null;
  const staff = await staffForEmail(email);
  return hasAccess(staff) && staff.status !== "disabled" ? staff : null;
}

/** Runs an extension request as the signed-in person: 401 without a valid session, else `run`. */
export async function asConnected(request: Request, run: (staff: Staff) => Promise<Response>) {
  const staff = await staffFromRequest(request);
  if (!staff) return json({ error: "You're signed out. Sign in again." }, 401);
  return run(staff);
}

/** The request's JSON body as an object, or {} (never throws). */
export async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
