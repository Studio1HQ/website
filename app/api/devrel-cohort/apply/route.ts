import { NextResponse } from "next/server";
import { COHORT } from "@/data/devrel-cohort";
import { validateApplication } from "@/lib/devrel-cohort-application";
import { looksAutomated } from "@/lib/form-guard";
import { insertRow, isSupabaseConfigured } from "@/lib/supabase-server";

/**
 * DevRel Cohort applications, saved to the devrel_cohort_applications table
 * (supabase/migrations). One application per email per cohort. Without
 * Supabase configured, development logs the entry and production refuses,
 * so no application is ever silently dropped.
 */
export async function POST(request: Request) {
  if (COHORT.status !== "open") {
    return NextResponse.json(
      { error: "Applications for this cohort are closed." },
      { status: 409 },
    );
  }

  if (Number(request.headers.get("content-length") ?? 0) > 32 * 1024) {
    return NextResponse.json(
      { error: "That application is too long." },
      { status: 413 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Bots get a normal-looking success and nothing is saved.
  if (looksAutomated({ honeypot: body.website, fillMs: body.fillMs })) {
    return NextResponse.json({ ok: true });
  }

  const result = validateApplication(body);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Check the highlighted fields.", fields: result.errors },
      { status: 400 },
    );
  }

  const { values } = result;
  const row = {
    cohort: COHORT.edition,
    name: values.name,
    email: values.email,
    location: values.location,
    role: values.role,
    profile_url: values.profileUrl,
    work_url: values.workUrl,
    why_devrel: values.whyDevrel,
    favorite_tool: values.favoriteTool || null,
    source: values.source || null,
    partner_consent: values.partnerConsent,
    contact_consent: values.contactConsent,
    email_updates: values.emailUpdates,
  };

  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[devrel-cohort] application (Supabase not configured) ${JSON.stringify(row)}`,
      );
      return NextResponse.json({ ok: true, stored: false });
    }
    return NextResponse.json(
      {
        error:
          "Online applications aren't connected yet. Email careers@studio1hq.com instead.",
      },
      { status: 503 },
    );
  }

  const saved = await insertRow("devrel_cohort_applications", row);
  if (!saved.ok) {
    if (saved.duplicate) {
      return NextResponse.json(
        {
          error: `${values.email} has already applied to ${COHORT.edition}. We'll reply by email.`,
          fields: { email: "Already applied with this email." },
        },
        { status: 409 },
      );
    }
    console.error("[devrel-cohort] application insert failed", saved.message);
    return NextResponse.json(
      { error: "We couldn't save your application. Try again in a minute." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
