"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FilePdf, SealCheck } from "@phosphor-icons/react";
import {
  CONTROL,
  ContactConsent,
  ERROR_TEXT,
  Field,
  FormAlert,
  Honeypot,
  Select,
  SubmitPill,
  describedBy,
  focusFirstError,
} from "@/components/paper/paper-form";
import {
  APPLICATION_LIMITS,
  EMPTY_APPLICATION,
  START_OPTIONS,
  resumeError,
  validateApplication,
  type ApplicationErrors,
  type ApplicationField,
  type ApplicationValues,
} from "@/lib/job-application";
import type { ContactConsentValues } from "@/lib/contact-consent";
import { INK, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/** Order used to focus the first field with an error. */
const FIELD_ORDER: readonly ApplicationField[] = [
  "name",
  "email",
  "location",
  "start",
  "linkedin",
  "portfolio",
  "workLinks",
  "planLink",
  "why",
  "resume",
  "contactConsent",
];

/** Fields typed into; the consent checkboxes are set separately. */
type TextField = Exclude<keyof ApplicationValues, keyof ContactConsentValues>;

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ApplicationForm({
  jobId,
  jobTitle,
}: {
  jobId: string;
  jobTitle: string;
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<ApplicationValues>(EMPTY_APPLICATION);
  const [resume, setResume] = useState<File | null>(null);
  const [errors, setErrors] = useState<ApplicationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [sentAs, setSentAs] = useState<string | null>(null);
  // When the form appeared; near-instant submissions are treated as bots.
  const [startedAt] = useState(() => Date.now());

  const clearError = (field: ApplicationField) =>
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });

  const set = (field: TextField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    clearError(field);
  };

  const setFlag = (field: keyof ContactConsentValues, checked: boolean) => {
    setValues((current) => ({ ...current, [field]: checked }));
    clearError(field);
  };

  const ids = (field: ApplicationField) => `${id}-${field}`;
  const control = (field: TextField, hint = false) => ({
    id: ids(field),
    name: field,
    value: values[field],
    ...describedBy(ids(field), errors[field], hint),
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setMessage("");

    const check = validateApplication(values);
    const fileError = resumeError(resume);
    const found: ApplicationErrors = {
      ...(check.ok ? {} : check.errors),
      ...(fileError ? { resume: fileError } : {}),
    };
    if (Object.keys(found).length > 0) {
      setErrors(found);
      focusFirstError(formRef.current, FIELD_ORDER, found);
      return;
    }

    const body = new FormData();
    for (const [key, value] of Object.entries(values))
      body.append(key, String(value));
    body.append("resume", resume!);
    body.append("jobId", jobId);
    body.append("fillMs", String(Date.now() - startedAt));

    setSubmitting(true);
    try {
      const response = await fetch("/api/careers/apply", {
        method: "POST",
        body,
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        fields?: ApplicationErrors;
      };
      if (!response.ok) {
        if (data.fields) {
          setErrors(data.fields);
          focusFirstError(formRef.current, FIELD_ORDER, data.fields);
        }
        setMessage(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setSentAs(values.name);
    } catch {
      setMessage(
        "We couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (sentAs) {
    return (
      <div role="status" className="flex flex-col items-start p-6 sm:p-10">
        <span
          className="flex size-14 items-center justify-center rounded-full text-white"
          style={{ background: PRINT }}
        >
          <SealCheck weight="fill" className="size-7" />
        </span>
        <p className="mt-8 text-[36px] font-medium leading-[1.05] tracking-[-0.05em] sm:text-[48px]">
          Application sent, {sentAs.split(/\s+/)[0]}.
        </p>
        <p className="mt-4 max-w-[520px] text-[16px] leading-[1.65] text-[#141414]/65">
          We read every application for {jobTitle}. If there&apos;s a fit,
          you&apos;ll hear from us within about a week.
        </p>
        <Link
          href="/careers#open-roles"
          className="group mt-8 inline-flex items-center gap-1.5 text-[15px] font-medium underline decoration-[#f97316] decoration-2 underline-offset-[6px]"
        >
          See other open roles
          <ArrowUpRight
            weight="bold"
            className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    );
  }

  const whyCount = `${values.why.length}/${APPLICATION_LIMITS.why.max}`;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="p-5 sm:p-8">
      <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
        <Field id={ids("name")} label="Full name" error={errors.name}>
          <input
            {...control("name")}
            type="text"
            autoComplete="name"
            onChange={(event) => set("name", event.target.value)}
            className={cn(CONTROL, "h-12")}
          />
        </Field>
        <Field id={ids("email")} label="Email" error={errors.email}>
          <input
            {...control("email")}
            type="email"
            autoComplete="email"
            inputMode="email"
            onChange={(event) => set("email", event.target.value)}
            className={cn(CONTROL, "h-12")}
          />
        </Field>
        <Field
          id={ids("location")}
          label="Where are you based?"
          error={errors.location}
        >
          <input
            {...control("location")}
            type="text"
            autoComplete="address-level2"
            placeholder="City, country"
            onChange={(event) => set("location", event.target.value)}
            className={cn(CONTROL, "h-12")}
          />
        </Field>
        <Field
          id={ids("start")}
          label="When could you start?"
          error={errors.start}
        >
          <Select
            id={ids("start")}
            name="start"
            value={values.start}
            onChange={(value) => set("start", value)}
            placeholder="Choose one"
            options={START_OPTIONS}
            error={errors.start}
          />
        </Field>
        <Field
          id={ids("linkedin")}
          label="LinkedIn"
          optional
          error={errors.linkedin}
        >
          <input
            {...control("linkedin")}
            type="url"
            inputMode="url"
            placeholder="linkedin.com/in/you"
            onChange={(event) => set("linkedin", event.target.value)}
            className={cn(CONTROL, "h-12")}
          />
        </Field>
        <Field
          id={ids("portfolio")}
          label="GitHub or portfolio"
          optional
          error={errors.portfolio}
        >
          <input
            {...control("portfolio")}
            type="url"
            inputMode="url"
            placeholder="github.com/you"
            onChange={(event) => set("portfolio", event.target.value)}
            className={cn(CONTROL, "h-12")}
          />
        </Field>

        <Field
          id={ids("workLinks")}
          label="Links to your past work"
          error={errors.workLinks}
          hint={`Repos, demos, blogs, docs, or videos. One per line, up to ${APPLICATION_LIMITS.workLinks}.`}
          className="sm:col-span-2"
        >
          <textarea
            {...control("workLinks", true)}
            rows={3}
            placeholder={"github.com/you/project\nyourblog.dev/post"}
            onChange={(event) => set("workLinks", event.target.value)}
            className={cn(CONTROL, "resize-y py-3 leading-[1.55]")}
          />
        </Field>
        <Field
          id={ids("planLink")}
          label="Your plan for the role"
          error={errors.planLink}
          hint="The short doc or plan this role asks for. Make sure anyone with the link can view it."
          className="sm:col-span-2"
        >
          <input
            {...control("planLink", true)}
            type="url"
            inputMode="url"
            placeholder="docs.google.com/…"
            onChange={(event) => set("planLink", event.target.value)}
            className={cn(CONTROL, "h-12")}
          />
        </Field>
        <Field
          id={ids("why")}
          label="Why does this role fit you?"
          error={errors.why}
          hint={`${whyCount} · A few specific sentences beat a cover letter.`}
          className="sm:col-span-2"
        >
          <textarea
            {...control("why", true)}
            rows={5}
            maxLength={APPLICATION_LIMITS.why.max}
            onChange={(event) => set("why", event.target.value)}
            className={cn(CONTROL, "resize-y py-3 leading-[1.55]")}
          />
        </Field>

        {/* Résumé: a styled label around a visually hidden file input */}
        <div className="sm:col-span-2">
          <p className="text-[13px] font-medium" id={`${ids("resume")}-label`}>
            Résumé
          </p>
          <label
            className={cn(
              "mt-2 flex cursor-pointer items-center gap-4 rounded-[6px] border-[1.5px] border-dashed bg-[#f8f5ef] px-4 py-4 transition-colors focus-within:border-[#f97316] hover:border-[#141414]/45",
              errors.resume ? "border-[#c0341d]" : "border-[#141414]/20",
            )}
          >
            <span
              className="flex size-11 shrink-0 items-center justify-center text-[#f4efe7]"
              style={{ background: resume ? PRINT : INK }}
            >
              <FilePdf className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">
                {resume ? resume.name : "Choose a PDF"}
              </span>
              <span className="mt-0.5 block text-[12.5px] text-[#141414]/50">
                {resume ? formatBytes(resume.size) : "PDF only, up to 4 MB"}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-white px-4 py-2 text-[13px] font-medium ring-1 ring-inset ring-[#141414]/15">
              {resume ? "Replace" : "Browse"}
            </span>
            <input
              type="file"
              name="resume"
              accept="application/pdf,.pdf"
              aria-labelledby={`${ids("resume")}-label`}
              {...describedBy(ids("resume"), errors.resume)}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setResume(file);
                const problem = resumeError(file);
                if (problem && file) {
                  setErrors((current) => ({ ...current, resume: problem }));
                } else {
                  clearError("resume");
                }
              }}
              className="sr-only"
            />
          </label>
          {errors.resume ? (
            <p id={`${ids("resume")}-error`} className={ERROR_TEXT}>
              {errors.resume}
            </p>
          ) : null}
        </div>

        <Honeypot
          value={values.website}
          onChange={(value) => set("website", value)}
        />

        <div className="border-t border-[#141414]/10 pt-6 sm:col-span-2">
          <ContactConsent
            id={id}
            purpose="application"
            values={values}
            error={errors.contactConsent}
            onChange={setFlag}
          />
        </div>
      </div>

      {message ? <FormAlert>{message}</FormAlert> : null}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SubmitPill submitting={submitting} busyLabel="Sending…">
          Send application
        </SubmitPill>
        <p className="text-[12.5px] text-[#141414]/50">
          We usually reply within 1 week if there is a fit.
        </p>
      </div>
    </form>
  );
}
