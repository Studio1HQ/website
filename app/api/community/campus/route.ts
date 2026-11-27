import { randomUUID } from "crypto";
import { NextResponse, after } from "next/server";
import { sendConfirmation } from "@/lib/confirmation-email";
import {
  CAMPUS_PROGRAM,
  validateCampusApplication,
} from "@/lib/campus-application";
import { looksLikeLink } from "@/lib/form-checks";
import { looksAutomated } from "@/lib/form-guard";
import { sectionsChanged } from "@/lib/internal/section-cache";
import { alertNewEntry } from "@/lib/internal/slack";
import { readJsonBody } from "@/lib/read-body";
import {
  TOO_MANY_FOR_ADDRESS,
  TOO_MANY_FROM_NETWORK,
  addressWithinLimit,
  networkWithinLimit,
} from "@/lib/rate-limit";
import { insertRow, isSupabaseConfigured } from "@/lib/supabase-server";

/**
 * Studio1 Across the Campus applications (/community/campus), saved to the
 * campus_applications table (supabase/migrations). A community can apply
 * again for another event, so there's no one-per-email rule; the address
 * and network limits stop floods. Without Supabase configured, development
 * logs the entry and production refuses, so nothing is silently dropped.
 */
export async function POST(request: Request) {
  if (!(await networkWithinLimit("campus", request))) {
    return NextResponse.json({ error: TOO_MANY_FROM_NETWORK }, { status: 429 });
  }

  const parsed = await readJsonBody(request, 32 * 1024);
  if (!parsed.ok) {
    return parsed.reason === "too-large"
      ? NextResponse.json(
          { error: "That application is too long." },
          { status: 413 },
        )
      : NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const body = parsed.value;

  // Bots get a normal-looking success and nothing is saved.
  if (looksAutomated({ honeypot: body.website, fillMs: body.fillMs })) {
    return NextResponse.json({ ok: true });
  }

  const result = validateCampusApplication(body);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Check the highlighted fields.", fields: result.errors },
      { status: 400 },
    );
  }

  const { values } = result;
  // Counted per inbox ("+tags" ignored), before anything is stored.
  if (!(await addressWithinLimit(values.email))) {
    return NextResponse.json({ error: TOO_MANY_FOR_ADDRESS }, { status: 429 });
  }
  const row = {
    name: values.name,
    email: values.email,
    community_name: values.communityName,
    college: values.college || null,
    community_url: values.communityUrl,
    core_team_size: Number(values.coreTeamSize),
    event_turnout: values.eventTurnout,
    support: values.support,
    cash_ask: values.cashAsk || null,
    why_studio1: values.whyStudio1,
    contact_consent: values.contactConsent,
    email_updates: values.emailUpdates,
  };

  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[campus] application (Supabase not configured) ${JSON.stringify(row)}`,
      );
      return NextResponse.json({ ok: true, stored: false });
    }
    return NextResponse.json(
      {
        error:
          "Online applications aren't connected yet. Email contact@studio1hq.com instead.",
      },
      { status: 503 },
    );
  }

  const id = randomUUID();
  const saved = await insertRow("campus_applications", { id, ...row });
  if (!saved.ok) {
    console.error("[campus] application insert failed", saved.message);
    return NextResponse.json(
      { error: "We couldn't save your application. Try again in a minute." },
      { status: 502 },
    );
  }
  // The dashboard keeps its lists for a moment: show this one straight away.
  sectionsChanged();

  after(() =>
    sendConfirmation("campus", {
      id,
      name: values.name,
      email: values.email,
      // Never the community name they typed: this email goes to an address
      // nobody has checked yet, so it carries no applicant text but the
      // first name (which can't hold a link). Emails sent by hand after
      // review name the community (programOf in lib/internal/program.ts).
      program: CAMPUS_PROGRAM,
    }),
  );
  after(() =>
    alertNewEntry({
      form: "campus",
      id,
      name: values.name,
      points: [
        // Slack links bare domains: a name that looks like one is left out.
        [
          "Community",
          looksLikeLink(values.communityName)
            ? undefined
            : values.communityName,
        ],
        [
          "College",
          values.college && !looksLikeLink(values.college)
            ? values.college
            : undefined,
        ],
        [
          "Committee",
          `${values.coreTeamSize} people, ${values.eventTurnout} at events`,
        ],
      ],
    }),
  );
  return NextResponse.json({ ok: true });
}
