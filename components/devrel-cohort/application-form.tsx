"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, CheckCircle } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
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
import { COHORT } from "@/data/devrel-cohort";
import {
  EMPTY_APPLICATION,
  ROLE_OPTIONS,
  SOURCE_OPTIONS,
  TOOL_MAX,
  WHY_MAX,
  validateApplication,
  type ApplicationErrors,
  type ApplicationField,
  type ApplicationValues,
} from "@/lib/devrel-cohort-application";
import { cn } from "@/lib/utils";

/** Fields in on-screen order, so the first error gets focus. */
const FIELD_ORDER: ApplicationField[] = [
  "name",
  "email",
  "location",
  "role",
  "profileUrl",
  "workUrl",
  "whyDevrel",
  "favoriteTool",
  "source",
  "commitment",
  "contactConsent",
  "emailUpdates",
];

const CARD =
  "rounded-[6px] bg-white text-[#141414] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]";

function CharCount({ value, max }: { value: string; max: number }) {
  const near = value.length > max * 0.9;
  return (
    <span
      className={cn(
        "text-[12px] tabular-nums",
        near ? "text-[#c0341d]" : "text-[#141414]/40",
      )}
    >
      {value.length}/{max}
    </span>
  );
}

/** What the applicant sees once the application is in. */
function Received({ name, email }: { name: string; email: string }) {
  const reduceMotion = useReducedMotion();
  const first = name.split(/\s+/)[0];
  return (
    <motion.div
      role="status"
      className={cn(CARD, "p-7 sm:p-10")}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <CheckCircle weight="fill" className="size-12 text-[#f97316]" />
      <h3 className="mt-6 text-[28px] font-medium leading-tight tracking-[-0.04em] sm:text-[34px]">
        Application received, {first}.
      </h3>
      <p className="mt-4 max-w-[440px] text-[15.5px] leading-[1.65] text-[#141414]/65">
        We read every application for {COHORT.edition} and reply by email to{" "}
        <span className="font-medium text-[#141414]">{email}</span>. Shortlisted
        applicants hear from us about a short chat.
      </p>
      <div className="mt-8 border-t border-[#141414]/10 pt-6">
        <p className="text-[13px] font-medium text-[#141414]/50">
          While you wait
        </p>
        <Link
          href="/devrel-jobs"
          className="group mt-2 inline-flex items-center gap-1.5 text-[15px] font-medium underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]"
        >
          Browse open DevRel roles
          <ArrowUpRight
            weight="bold"
            className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </motion.div>
  );
}

/** The cohort application, saved through /api/devrel-cohort/apply. */
export function CohortApplicationForm() {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const startedAt = useRef(0);
  const [values, setValues] = useState<ApplicationValues>(EMPTY_APPLICATION);
  const [errors, setErrors] = useState<ApplicationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [received, setReceived] = useState<{
    name: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const set = <K extends ApplicationField>(
    field: K,
    value: ApplicationValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const fid = (field: ApplicationField) => `${id}-${field}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setMessage("");

    const check = validateApplication(values);
    if (!check.ok) {
      setErrors(check.errors);
      focusFirstError(formRef.current, FIELD_ORDER, check.errors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/devrel-cohort/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          fillMs: Date.now() - startedAt.current,
        }),
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
      setReceived({ name: check.values.name, email: check.values.email });
    } catch {
      setMessage(
        "We couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (received) return <Received {...received} />;

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className={cn(CARD, "p-5 sm:p-8")}
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-[#141414]/10 pb-5">
        <h3 className="text-[20px] font-medium tracking-[-0.035em]">
          Apply for {COHORT.edition}
        </h3>
        <span className="text-[12.5px] text-[#141414]/45">~5 minutes</span>
      </div>

      <div className="mt-6 grid gap-x-4 gap-y-6 sm:grid-cols-2">
        <Field id={fid("name")} label="Full name" error={errors.name}>
          <input
            id={fid("name")}
            name="name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            {...describedBy(fid("name"), errors.name)}
            className={cn(CONTROL, "h-12")}
          />
        </Field>

        <Field id={fid("email")} label="Email" error={errors.email}>
          <input
            id={fid("email")}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={(event) => set("email", event.target.value)}
            {...describedBy(fid("email"), errors.email)}
            className={cn(CONTROL, "h-12")}
          />
        </Field>

        <Field
          id={fid("location")}
          label="Where you're based"
          error={errors.location}
        >
          <input
            id={fid("location")}
            name="location"
            type="text"
            autoComplete="address-level2"
            placeholder="City, country"
            value={values.location}
            onChange={(event) => set("location", event.target.value)}
            {...describedBy(fid("location"), errors.location)}
            className={cn(CONTROL, "h-12")}
          />
        </Field>

        <Field id={fid("role")} label="What you do now" error={errors.role}>
          <Select
            id={fid("role")}
            name="role"
            value={values.role}
            onChange={(value) => set("role", value)}
            placeholder="Pick one"
            options={ROLE_OPTIONS}
            error={errors.role}
          />
        </Field>

        <Field
          id={fid("profileUrl")}
          label="Your profile"
          hint="LinkedIn, GitHub, X or your site."
          error={errors.profileUrl}
        >
          <input
            id={fid("profileUrl")}
            name="profileUrl"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="linkedin.com/in/you"
            value={values.profileUrl}
            onChange={(event) => set("profileUrl", event.target.value)}
            {...describedBy(fid("profileUrl"), errors.profileUrl, true)}
            className={cn(CONTROL, "h-12")}
          />
        </Field>

        <Field
          id={fid("workUrl")}
          label="Something you made"
          hint="A repo, demo, post, talk or video. Small is fine."
          error={errors.workUrl}
        >
          <input
            id={fid("workUrl")}
            name="workUrl"
            type="url"
            inputMode="url"
            placeholder="github.com/you/project"
            value={values.workUrl}
            onChange={(event) => set("workUrl", event.target.value)}
            {...describedBy(fid("workUrl"), errors.workUrl, true)}
            className={cn(CONTROL, "h-12")}
          />
        </Field>

        <Field
          id={fid("whyDevrel")}
          label="Why do you want to work in DevRel?"
          error={errors.whyDevrel}
          className="sm:col-span-2"
        >
          <textarea
            id={fid("whyDevrel")}
            name="whyDevrel"
            rows={4}
            maxLength={WHY_MAX + 50}
            placeholder="A few lines is plenty."
            value={values.whyDevrel}
            onChange={(event) => set("whyDevrel", event.target.value)}
            {...describedBy(fid("whyDevrel"), errors.whyDevrel)}
            className={cn(
              CONTROL,
              "min-h-[120px] resize-y py-3 leading-[1.55]",
            )}
          />
          <div className="mt-1 flex justify-end">
            <CharCount value={values.whyDevrel} max={WHY_MAX} />
          </div>
        </Field>

        <Field
          id={fid("favoriteTool")}
          label="One developer tool you'd happily teach, and why"
          optional
          error={errors.favoriteTool}
          className="sm:col-span-2"
        >
          <textarea
            id={fid("favoriteTool")}
            name="favoriteTool"
            rows={2}
            maxLength={TOOL_MAX + 50}
            value={values.favoriteTool}
            onChange={(event) => set("favoriteTool", event.target.value)}
            {...describedBy(fid("favoriteTool"), errors.favoriteTool)}
            className={cn(CONTROL, "min-h-[76px] resize-y py-3 leading-[1.55]")}
          />
        </Field>

        <Field
          id={fid("source")}
          label="How did you hear about the cohort?"
          optional
          error={errors.source}
        >
          <Select
            id={fid("source")}
            name="source"
            value={values.source}
            onChange={(value) => set("source", value)}
            placeholder="Pick one"
            options={SOURCE_OPTIONS}
            error={errors.source}
          />
        </Field>

        <Honeypot
          value={values.website}
          onChange={(value) => set("website", value)}
        />

        <div className="space-y-3 border-t border-[#141414]/10 pt-6 sm:col-span-2">
          <label className="flex cursor-pointer gap-3 text-[14px] leading-snug">
            <input
              type="checkbox"
              name="commitment"
              checked={values.commitment}
              onChange={(event) => set("commitment", event.target.checked)}
              {...describedBy(fid("commitment"), errors.commitment)}
              className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-[#f97316]"
            />
            <span>
              I can make time for the live sessions and the weekly assignment
              for all four weeks
              {COHORT.commitment ? ` (about ${COHORT.commitment})` : ""}.
            </span>
          </label>
          {errors.commitment ? (
            <p
              id={`${fid("commitment")}-error`}
              className={cn(ERROR_TEXT, "pl-[30px]")}
            >
              {errors.commitment}
            </p>
          ) : null}
          <label className="flex cursor-pointer gap-3 text-[14px] leading-snug text-[#141414]/70">
            <input
              type="checkbox"
              name="partnerConsent"
              checked={values.partnerConsent}
              onChange={(event) => set("partnerConsent", event.target.checked)}
              className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-[#f97316]"
            />
            <span>
              Studio1 can share my application with partner companies to refer
              me for DevRel roles. Optional.
            </span>
          </label>
          <ContactConsent
            id={id}
            purpose="application"
            values={values}
            errors={errors}
            onChange={(field, checked) => set(field, checked)}
          />
        </div>
      </div>

      {message ? <FormAlert>{message}</FormAlert> : null}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SubmitPill submitting={submitting} busyLabel="Sending…">
          Submit application
        </SubmitPill>
        <p className="text-[12.5px] text-[#141414]/50">
          We read every application.
        </p>
      </div>
    </form>
  );
}
