import { body, json } from "@/lib/internal/extension/http";
import { clientIp } from "@/lib/rate-limit";
import { checkCode, sendCode } from "@/lib/internal/sign-in";
import { emailAddress } from "@/lib/internal/token";

export const dynamic = "force-dynamic";

/**
 * Studio1 Connect signs in exactly like the dashboard: { email } emails a
 * code; { email, code } checks it and returns the 7-day session the
 * extension keeps and sends with every request. Same people, same limits
 * (lib/internal/sign-in.ts).
 */
export async function POST(request: Request) {
  const input = await body(request);
  const ip = clientIp(request);
  if (input.code === undefined) {
    const sent = await sendCode(input.email, ip, input.resend === true);
    return sent.ok ? json({ email: sent.email, note: sent.note ?? null }) : json({ error: sent.message }, 400);
  }
  const email = emailAddress(input.email);
  if (!email) return json({ error: "Ask for a new code." }, 400);
  const checked = await checkCode(email, input.code, ip);
  return checked.ok ? json({ email: checked.email, session: checked.session }) : json({ error: checked.message }, 400);
}
