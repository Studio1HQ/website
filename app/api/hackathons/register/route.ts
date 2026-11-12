import { randomUUID } from "crypto";
import { NextResponse, after } from "next/server";
import { getHackathon } from "@/data/hackathons";
import { looksAutomated } from "@/lib/form-guard";
import { readJsonBody } from "@/lib/read-body";
import { sendConfirmation } from "@/lib/confirmation-email";
import { validateRegistration } from "@/lib/hackathon-registration";
import { HACKATHONS_PUBLIC, isRegistrationOpen } from "@/lib/hackathons";
import { insertRow, isSupabaseConfigured } from "@/lib/supabase-server";

/**
 * Hackathon registrations, stored in Supabase (hackathon_registrations).
 * One registration per email per hackathon, enforced by the table.
 * Without Supabase configured, development logs the entry and production
 * refuses, so no registration is ever silently dropped.
 */
export async function POST(request: Request) {
  if (!HACKATHONS_PUBLIC) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const parsed = await readJsonBody(request, 32 * 1024);
  if (!parsed.ok) {
    return parsed.reason === "too-large"
      ? NextResponse.json(
          { error: "That registration is too long." },
          { status: 413 },
        )
      : NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const body = parsed.value;

  const hackathon =
    typeof body.slug === "string" ? getHackathon(body.slug) : undefined;
  if (!hackathon) {
    return NextResponse.json(
      { error: "That hackathon doesn't exist." },
      { status: 404 },
    );
  }
  if (hackathon.registerUrl || !isRegistrationOpen(hackathon)) {
    return NextResponse.json(
      { error: "Registration for this hackathon is closed." },
      { status: 409 },
    );
  }

  // Bots get a normal-looking success and nothing is saved.
  if (looksAutomated({ honeypot: body.website, fillMs: body.fillMs })) {
    return NextResponse.json({ ok: true });
  }

  const result = validateRegistration(
    body,
    hackathon.tracks.map((track) => track.name),
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: "Check the highlighted fields.", fields: result.errors },
      { status: 400 },
    );
  }

  const values = result.values;
  const row = {
    hackathon_slug: hackathon.slug,
    hackathon_name: hackathon.name,
    name: values.name,
    email: values.email,
    github: values.github,
    country: values.country,
    role: values.role,
    experience: values.experience,
    team: values.team,
    team_name: values.teamName || null,
    track: values.track,
    idea: values.idea || null,
    source: values.source || null,
    partner_consent: values.partnerConsent,
    // Validation rejects the entry without it, so a stored row always has it.
    contact_consent: true,
    email_updates: values.emailUpdates,
  };

  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[hackathons] registration (Supabase not configured) ${JSON.stringify(row)}`,
      );
      return NextResponse.json({ ok: true, stored: false });
    }
    return NextResponse.json(
      { error: "Registration isn't connected yet. Check back soon." },
      { status: 503 },
    );
  }

  const id = randomUUID();
  const saved = await insertRow("hackathon_registrations", { id, ...row });
  if (!saved.ok) {
    // A repeat answers like a first registration, so the response never
    // reveals whether an email is registered. The first registration stands.
    if (saved.duplicate) return NextResponse.json({ ok: true });
    console.error("[hackathons] registration insert failed", saved.message);
    return NextResponse.json(
      { error: "We couldn't save your registration. Try again in a minute." },
      { status: 502 },
    );
  }

  after(() =>
    sendConfirmation("hackathons", { id, name: values.name, email: values.email, program: hackathon.name }),
  );
  return NextResponse.json({ ok: true });
}
