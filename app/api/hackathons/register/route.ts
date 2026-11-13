import { randomUUID } from "crypto";
import { NextResponse, after } from "next/server";
import { getHackathon } from "@/data/hackathons";
import { looksAutomated } from "@/lib/form-guard";
import { readJsonBody } from "@/lib/read-body";
import {
  TOO_MANY_FOR_ADDRESS,
  TOO_MANY_FROM_NETWORK,
  addressWithinLimit,
  networkWithinLimit,
} from "@/lib/rate-limit";
import { sendConfirmation } from "@/lib/confirmation-email";
import { alertNewEntry } from "@/lib/internal/slack";
import { storedAnswers, validateRegistration } from "@/lib/hackathon-registration";
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
  if (!(await networkWithinLimit("hackathons", request))) {
    return NextResponse.json({ error: TOO_MANY_FROM_NETWORK }, { status: 429 });
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

  const questions = hackathon.questions ?? [];
  const result = validateRegistration(
    body,
    hackathon.tracks.map((track) => track.name),
    questions,
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: "Check the highlighted fields.", fields: result.errors },
      { status: 400 },
    );
  }

  const values = result.values;
  // Counted per inbox ("+tags" ignored), before anything is stored.
  if (!(await addressWithinLimit(values.email))) {
    return NextResponse.json({ error: TOO_MANY_FOR_ADDRESS }, { status: 429 });
  }
  const answers = storedAnswers(questions, values.answers);
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
  // Answers are only sent when there are some, so events without questions
  // work before 20261113150000_hackathon_answers.sql has run.
  let saved = await insertRow("hackathon_registrations", {
    id,
    ...row,
    ...(answers.length ? { answers } : {}),
  });
  // No answers column yet: keep the registration rather than lose it. What
  // people wrote stays out of the server log.
  if (!saved.ok && !saved.duplicate && answers.length && /answers/.test(saved.message)) {
    console.error(
      `[hackathons] answers column missing; saving ${id} without its ${answers.length} answer(s). Run 20261113150000_hackathon_answers.sql.`,
    );
    saved = await insertRow("hackathon_registrations", { id, ...row });
  }
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
  after(() =>
    alertNewEntry({
      form: "hackathons",
      id,
      name: values.name,
      points: [
        ["Hackathon", hackathon.name],
        ["Track", values.track],
        ["Experience", values.experience],
      ],
    }),
  );
  return NextResponse.json({ ok: true });
}
