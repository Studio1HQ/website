import { randomUUID } from "crypto";
import { NextResponse, after } from "next/server";
import { getJobById, getJobIds } from "@/lib/careers";
import { sendConfirmation } from "@/lib/confirmation-email";
import { storedAnswers } from "@/lib/form-questions";
import { alertNewEntry } from "@/lib/internal/slack";
import { looksAutomated } from "@/lib/form-guard";
import { readFormBody } from "@/lib/read-body";
import {
  TOO_MANY_FOR_ADDRESS,
  TOO_MANY_FROM_NETWORK,
  addressWithinLimit,
  IP_UPLOAD_LIMIT,
  networkWithinLimit,
} from "@/lib/rate-limit";
import {
  APPLICATION_LIMITS,
  isJobOpen,
  resumeError,
  validateApplication,
} from "@/lib/job-application";
import {
  insertRow,
  isSupabaseConfigured,
  removeFiles,
  uploadFile,
} from "@/lib/supabase-server";

const BUCKET = "job-applications";

/** The role's answers, sent by the form as one JSON field. */
function parseAnswers(value: string): unknown {
  if (!value || value.length > 64 * 1024) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

/**
 * Job applications: the résumé goes to a private Storage bucket, the rest to
 * the job_applications table. One application per email per role. A role
 * with its own questions (in its brief) saves their answers instead of the
 * generic plan link.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Online applications aren't open yet. Email careers@studio1hq.com instead.",
      },
      { status: 503 },
    );
  }

  // Before the upload is read: one network can only send so many an hour.
  if (!(await networkWithinLimit("jobs", request, IP_UPLOAD_LIMIT))) {
    return NextResponse.json({ error: TOO_MANY_FROM_NETWORK }, { status: 429 });
  }

  // Résumé cap plus room for the text fields, counted on the bytes read.
  const body = await readFormBody(
    request,
    APPLICATION_LIMITS.resumeBytes + 256 * 1024,
  );
  if (!body.ok) {
    return body.reason === "too-large"
      ? NextResponse.json(
          {
            error: "That upload is too large.",
            fields: { resume: "Keep the PDF under 4 MB." },
          },
          { status: 413 },
        )
      : NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const form = body.value;
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };

  // Only ids that exist; never build a file path from raw input.
  const jobId = field("jobId");
  const job = getJobIds().includes(jobId) ? getJobById(jobId, "en") : null;
  if (!job) {
    return NextResponse.json(
      { error: "That role doesn't exist." },
      { status: 404 },
    );
  }
  if (!isJobOpen(job.status)) {
    return NextResponse.json(
      { error: "This role isn't taking applications right now." },
      { status: 409 },
    );
  }

  // Bots get a normal-looking success and nothing is saved.
  if (looksAutomated({ honeypot: field("website"), fillMs: field("fillMs") })) {
    return NextResponse.json({ ok: true });
  }

  const result = validateApplication(
    {
      name: field("name"),
      email: field("email"),
      location: field("location"),
      linkedin: field("linkedin"),
      portfolio: field("portfolio"),
      workLinks: field("workLinks"),
      planLink: field("planLink"),
      answers: parseAnswers(field("answers")),
      why: field("why"),
      start: field("start"),
      contactConsent: field("contactConsent"),
      emailUpdates: field("emailUpdates"),
    },
    job.questions,
  );
  const resume = form.get("resume");
  const file = resume instanceof File ? resume : null;
  let fileError = resumeError(file);
  // Check the bytes, not just the name: real PDFs start with "%PDF".
  if (!fileError && file && (await file.slice(0, 5).text()) !== "%PDF-") {
    fileError = "That file isn't a valid PDF.";
  }

  if (!result.ok || fileError) {
    return NextResponse.json(
      {
        error: "Check the highlighted fields.",
        fields: {
          ...(result.ok ? {} : result.errors),
          ...(fileError ? { resume: fileError } : {}),
        },
      },
      { status: 400 },
    );
  }

  const { values, links } = result;
  // Counted per inbox ("+tags" ignored), before anything is stored.
  if (!(await addressWithinLimit(values.email))) {
    return NextResponse.json({ error: TOO_MANY_FOR_ADDRESS }, { status: 429 });
  }
  const path = `${job.id}/${new Date().toISOString().slice(0, 10)}-${randomUUID()}.pdf`;
  const upload = await uploadFile(BUCKET, path, file!, "application/pdf");
  if (!upload.ok) {
    console.error("[careers] résumé upload failed", upload.message);
    return NextResponse.json(
      { error: "We couldn't upload your résumé. Try again in a minute." },
      { status: 502 },
    );
  }

  const id = randomUUID();
  const answers = storedAnswers(job.questions, values.answers);
  const row = {
    id,
    job_id: job.id,
    job_title: job.title,
    requisition_id: job.requisitionId,
    name: values.name,
    email: values.email,
    location: values.location,
    linkedin: values.linkedin || null,
    portfolio: values.portfolio || null,
    work_links: links,
    plan_link: values.planLink || null,
    why: values.why,
    start_availability: values.start,
    resume_path: path,
    contact_consent: values.contactConsent,
    email_updates: values.emailUpdates,
  };
  let saved = await insertRow(
    "job_applications",
    job.questions.length ? { ...row, answers } : row,
  );
  // Before 20261114160000_job_answers.sql runs there's no answers column and
  // the plan link is required: keep the application, with the answers
  // written under "why" so nothing the applicant sent is lost.
  if (
    !saved.ok &&
    !saved.duplicate &&
    job.questions.length &&
    /answers|plan_link/.test(saved.message)
  ) {
    console.error(
      `[careers] answers column missing; saving ${id} with its answers in "why". Run 20261114160000_job_answers.sql.`,
    );
    const written = answers
      .map((item) => `${item.question}\n${item.answer}`)
      .join("\n\n");
    saved = await insertRow("job_applications", {
      ...row,
      plan_link: "",
      why: written ? `${values.why}\n\n---\n\n${written}` : values.why,
    });
  }

  if (!saved.ok) {
    await removeFiles(BUCKET, [path]);
    // A repeat answers like a first application, so the response never
    // reveals whether an email has applied. The first application stands.
    if (saved.duplicate) return NextResponse.json({ ok: true });
    console.error("[careers] application insert failed", saved.message);
    return NextResponse.json(
      { error: "We couldn't save your application. Try again in a minute." },
      { status: 502 },
    );
  }

  after(() =>
    sendConfirmation("jobs", {
      id,
      name: values.name,
      email: values.email,
      program: job.title,
    }),
  );
  after(() =>
    alertNewEntry({
      form: "jobs",
      id,
      name: values.name,
      points: [
        ["Role", job.title],
        ["Location", values.location],
        ["Can start", values.start],
      ],
    }),
  );
  return NextResponse.json({ ok: true });
}
