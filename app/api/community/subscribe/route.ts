import { NextResponse } from "next/server";
import { looksAutomated } from "@/lib/form-guard";
import { readJsonBody } from "@/lib/read-body";
import {
  TOO_MANY_FOR_ADDRESS,
  TOO_MANY_FROM_NETWORK,
  addressWithinLimit,
  networkWithinLimit,
} from "@/lib/rate-limit";
import { insertRow, isSupabaseConfigured } from "@/lib/supabase-server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Community email signups (community_subscribers): news of the next
 * hackathon or meetup. Signing up twice is fine and reports success.
 */
export async function POST(request: Request) {
  if (!(await networkWithinLimit("community", request))) {
    return NextResponse.json({ error: TOO_MANY_FROM_NETWORK }, { status: 429 });
  }
  const parsed = await readJsonBody(request, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const body = parsed.value;

  // Bots get a normal-looking success and nothing is saved.
  if (looksAutomated({ honeypot: body.website, fillMs: body.fillMs })) {
    return NextResponse.json({ ok: true });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!(await addressWithinLimit(email))) {
    return NextResponse.json({ error: TOO_MANY_FOR_ADDRESS }, { status: 429 });
  }

  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[community/subscribe] (dev, not stored)", email);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Signups are unavailable right now." }, { status: 503 });
  }
  const saved = await insertRow("community_subscribers", { email, source: "community" });
  if (!saved.ok && !saved.duplicate) {
    return NextResponse.json({ error: "Couldn't save that. Try again in a minute." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
