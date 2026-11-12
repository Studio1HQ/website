"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  LockSimple,
  SealCheck,
} from "@phosphor-icons/react";
import { InkPill, pad } from "@/components/hackathons/hackathon-ui";
import {
  CONTROL,
  ContactConsent,
  ERROR_TEXT,
  Field,
  FormAlert,
  Honeypot,
  Segments,
  Select,
  SubmitPill,
  focusFirstError,
} from "@/components/paper/paper-form";
import type { HackathonTask } from "@/data/hackathons";
import {
  EMPTY_REGISTRATION,
  EXPERIENCE_OPTIONS,
  IDEA_MAX,
  ROLE_OPTIONS,
  SOURCE_OPTIONS,
  TEAM_OPTIONS,
  UNDECIDED_TRACK,
  validateRegistration,
  type RegistrationErrors,
  type RegistrationField,
  type RegistrationValues,
} from "@/lib/hackathon-registration";
import { PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

const CONTACT_EMAIL = "contact@studio1hq.com";

/** The task that ticks itself when the form goes through. */
const REGISTER_TASK = "register";

type Progress = { registeredAs: string | null; done: string[] };

const EMPTY_PROGRESS: Progress = { registeredAs: null, done: [] };

/** Per-viewer progress, kept in this browser only. */
function useProgress(slug: string) {
  const key = `studio1:hackathon:${slug}`;
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) setProgress({ ...EMPTY_PROGRESS, ...JSON.parse(saved) });
    } catch {
      // Storage can be blocked; the checklist still works for this visit.
    }
  }, [key]);

  const update = (next: (current: Progress) => Progress) => {
    setProgress((current) => {
      const value = next(current);
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Ignore: progress just won't survive a reload.
      }
      return value;
    });
  };

  return [progress, update] as const;
}

/* ------------------------------------------------------------------ */
/* Registration form                                                    */
/* ------------------------------------------------------------------ */

/** Order used to focus the first field with an error. */
const FIELD_ORDER: readonly RegistrationField[] = [
  "name",
  "email",
  "github",
  "country",
  "role",
  "experience",
  "team",
  "teamName",
  "track",
  "source",
  "idea",
  "agree",
  "contactConsent",
  "emailUpdates",
];

function RegistrationForm({
  slug,
  hackathonName,
  tracks,
  onRegistered,
}: {
  slug: string;
  hackathonName: string;
  tracks: string[];
  onRegistered: (name: string) => void;
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<RegistrationValues>(EMPTY_REGISTRATION);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  // When the form appeared; near-instant submissions are treated as bots.
  const [startedAt] = useState(() => Date.now());

  const set = <K extends RegistrationField>(
    field: K,
    value: RegistrationValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const fieldProps = (field: RegistrationField) => ({
    id: `${id}-${field}`,
    name: field,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${id}-${field}-error` : undefined,
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setMessage("");

    const check = validateRegistration(values, tracks);
    if (!check.ok) {
      setErrors(check.errors);
      focusFirstError(formRef.current, FIELD_ORDER, check.errors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/hackathons/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          fillMs: Date.now() - startedAt,
          ...values,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        fields?: RegistrationErrors;
      };
      if (!response.ok) {
        if (data.fields) {
          setErrors(data.fields);
          focusFirstError(formRef.current, FIELD_ORDER, data.fields);
        }
        setMessage(data.error ?? "Something went wrong. Try again.");
        return;
      }
      onRegistered(check.values.name);
    } catch {
      setMessage(
        "We couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="p-5 sm:p-8">
      <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
        <Field id={`${id}-name`} label="Full name" error={errors.name}>
          <input
            {...fieldProps("name")}
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            className={cn(CONTROL, "h-12")}
          />
        </Field>
        <Field id={`${id}-email`} label="Email" error={errors.email}>
          <input
            {...fieldProps("email")}
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={(event) => set("email", event.target.value)}
            className={cn(CONTROL, "h-12")}
          />
        </Field>
        <Field
          id={`${id}-github`}
          label="GitHub username"
          error={errors.github}
          hint="We use it to match your submission."
        >
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-[#141414]/40"
            >
              github.com/
            </span>
            <input
              {...fieldProps("github")}
              aria-describedby={
                errors.github ? `${id}-github-error` : `${id}-github-hint`
              }
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={values.github}
              onChange={(event) => set("github", event.target.value)}
              className={cn(CONTROL, "h-12 pl-[6.4rem]")}
            />
          </div>
        </Field>
        <Field id={`${id}-country`} label="Country" error={errors.country}>
          <input
            {...fieldProps("country")}
            type="text"
            autoComplete="country-name"
            value={values.country}
            onChange={(event) => set("country", event.target.value)}
            className={cn(CONTROL, "h-12")}
          />
        </Field>
        <Field id={`${id}-role`} label="I am a" error={errors.role}>
          <Select
            id={`${id}-role`}
            name="role"
            value={values.role}
            onChange={(value) => set("role", value)}
            placeholder="Choose one"
            options={ROLE_OPTIONS}
            error={errors.role}
          />
        </Field>
        <Segments
          name="experience"
          legend="Experience"
          value={values.experience}
          options={EXPERIENCE_OPTIONS.map((value) => ({ value, label: value }))}
          onChange={(value) => set("experience", value)}
          error={errors.experience}
        />

        <div className="sm:col-span-2">
          <Segments
            name="team"
            legend="How are you joining?"
            value={values.team}
            options={TEAM_OPTIONS}
            onChange={(value) =>
              set("team", value as RegistrationValues["team"])
            }
            error={errors.team}
          />
        </div>

        {values.team === "team" ? (
          <Field
            id={`${id}-teamName`}
            label="Team name"
            error={errors.teamName}
            hint="Each teammate registers separately with the same team name."
            className="sm:col-span-2"
          >
            <input
              {...fieldProps("teamName")}
              aria-describedby={
                errors.teamName ? `${id}-teamName-error` : `${id}-teamName-hint`
              }
              type="text"
              value={values.teamName}
              onChange={(event) => set("teamName", event.target.value)}
              className={cn(CONTROL, "h-12")}
            />
          </Field>
        ) : null}

        <Field id={`${id}-track`} label="Track" error={errors.track}>
          <Select
            id={`${id}-track`}
            name="track"
            value={values.track}
            onChange={(value) => set("track", value)}
            placeholder="Choose a track"
            options={[...tracks, UNDECIDED_TRACK]}
            error={errors.track}
          />
        </Field>
        <Field
          id={`${id}-source`}
          label="How did you hear about it?"
          optional
          error={errors.source}
        >
          <Select
            id={`${id}-source`}
            name="source"
            value={values.source}
            onChange={(value) => set("source", value)}
            placeholder="Choose one"
            options={SOURCE_OPTIONS}
            error={errors.source}
          />
        </Field>

        <Field
          id={`${id}-idea`}
          label="What do you want to build?"
          optional
          error={errors.idea}
          hint={`${values.idea.length}/${IDEA_MAX} · A rough idea is fine. It helps us match mentors.`}
          className="sm:col-span-2"
        >
          <textarea
            {...fieldProps("idea")}
            aria-describedby={
              errors.idea ? `${id}-idea-error` : `${id}-idea-hint`
            }
            rows={4}
            maxLength={IDEA_MAX}
            value={values.idea}
            onChange={(event) => set("idea", event.target.value)}
            className={cn(CONTROL, "resize-y py-3 leading-[1.55]")}
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
              name="agree"
              checked={values.agree}
              onChange={(event) => set("agree", event.target.checked)}
              aria-invalid={errors.agree ? true : undefined}
              aria-describedby={errors.agree ? `${id}-agree-error` : undefined}
              className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-[#f97316]"
            />
            <span>
              I&apos;ve read the{" "}
              <a
                href="#rules"
                className="font-medium underline decoration-[#f97316] underline-offset-4"
              >
                rules
              </a>{" "}
              and agree to follow them and the code of conduct.
            </span>
          </label>
          {errors.agree ? (
            <p id={`${id}-agree-error`} className={cn(ERROR_TEXT, "pl-[30px]")}>
              {errors.agree}
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
              Share my details with this hackathon&apos;s partners so they can
              contact me about their products. Optional.
            </span>
          </label>
          <ContactConsent
            id={id}
            purpose="registration"
            values={values}
            errors={errors}
            onChange={(field, checked) => set(field, checked)}
          />
        </div>
      </div>

      {message ? <FormAlert>{message}</FormAlert> : null}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SubmitPill submitting={submitting} busyLabel="Registering…">
          Register for {hackathonName}
        </SubmitPill>
        <p className="text-[12.5px] text-[#141414]/50">
          Takes about two minutes. Free to join.
        </p>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Pre-hack task checklist                                             */
/* ------------------------------------------------------------------ */

function TaskChecklist({
  tasks,
  progress,
  autoRegister,
  onToggle,
}: {
  tasks: HackathonTask[];
  progress: Progress;
  /** The register task follows the on-page form instead of a manual tick. */
  autoRegister: boolean;
  onToggle: (id: string) => void;
}) {
  const isDone = (task: HackathonTask) =>
    task.id === REGISTER_TASK && autoRegister
      ? progress.registeredAs !== null
      : progress.done.includes(task.id);
  const complete = tasks.filter(isDone).length;
  const ready = complete === tasks.length;

  return (
    <div
      id="tasks"
      className="scroll-mt-28 rounded-[6px] bg-white/80 ring-1 ring-inset ring-[#141414]/10"
    >
      <div className="flex items-center justify-between border-b border-[#141414]/10 px-5 py-4">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#141414]/55">
          Pre-hack tasks
        </h3>
        <span
          className="text-[13px] font-medium tabular-nums"
          style={{ color: ready ? PRINT : undefined }}
          aria-live="polite"
        >
          {pad(complete)}/{pad(tasks.length)} done
        </span>
      </div>

      <div className="px-5 pt-4">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-[#141414]/[0.08]"
          role="progressbar"
          aria-label="Pre-hack tasks completed"
          aria-valuemin={0}
          aria-valuemax={tasks.length}
          aria-valuenow={complete}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${(complete / Math.max(1, tasks.length)) * 100}%`,
              background: PRINT,
            }}
          />
        </div>
      </div>

      <ul role="list" className="px-2 py-2">
        {tasks.map((task) => {
          const done = isDone(task);
          const locked = task.id === REGISTER_TASK && autoRegister;
          const external = task.href?.startsWith("http");
          return (
            <li key={task.id} className="flex gap-3 rounded-[4px] px-3 py-3">
              <label
                className={cn(
                  "relative mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[4px] ring-1 ring-inset transition-colors",
                  done
                    ? "bg-[#141414] text-[#f4efe7] ring-[#141414]"
                    : "bg-white ring-[#141414]/25",
                  locked
                    ? "cursor-default"
                    : "cursor-pointer hover:ring-[#141414]",
                )}
              >
                <input
                  type="checkbox"
                  checked={done}
                  disabled={locked}
                  onChange={() => onToggle(task.id)}
                  aria-label={task.label}
                  className="peer absolute inset-0 cursor-[inherit] opacity-0"
                />
                {done ? <Check weight="bold" className="size-3" /> : null}
                <span className="pointer-events-none absolute -inset-1 rounded-[6px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#f97316]" />
              </label>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[14.5px] font-medium leading-snug tracking-[-0.01em]",
                    done &&
                      "text-[#141414]/45 line-through decoration-[#f97316]/70",
                  )}
                >
                  {task.label}
                </p>
                <p className="mt-1 text-[13px] leading-[1.5] text-[#141414]/55">
                  {locked
                    ? done
                      ? "Done. Your registration is in."
                      : "Ticks itself when you register."
                    : task.description}
                </p>
                {task.href ? (
                  <a
                    href={task.href}
                    {...(external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium underline decoration-[#f97316] underline-offset-4"
                  >
                    {external ? "Open" : "Go there"}
                    <ArrowUpRight weight="bold" className="size-3" />
                  </a>
                ) : task.note && !locked ? (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#141414]/45">
                    <LockSimple weight="bold" className="size-3" />
                    {task.note}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div
        className={cn(
          "flex items-center gap-3 rounded-b-[6px] px-5 py-4 text-[14px] font-medium",
          ready
            ? "text-white"
            : "border-t border-[#141414]/10 text-[#141414]/55",
        )}
        style={ready ? { background: PRINT } : undefined}
      >
        <SealCheck
          weight={ready ? "fill" : "regular"}
          className="size-5 shrink-0"
        />
        {ready
          ? "You're ready to go. See you at kickoff."
          : "Finish every task before kickoff."}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The section                                                          */
/* ------------------------------------------------------------------ */

export function RegistrationSection({
  slug,
  hackathonName,
  tracks,
  tasks,
  registrationOpen,
  closedTitle,
  closedMessage,
  showTasks,
  registerUrl,
}: {
  slug: string;
  hackathonName: string;
  tracks: string[];
  tasks: HackathonTask[];
  registrationOpen: boolean;
  closedTitle: string;
  closedMessage: string;
  /** Hide the checklist once the event is over. */
  showTasks: boolean;
  registerUrl?: string;
}) {
  const [progress, setProgress] = useProgress(slug);
  const autoRegister = !registerUrl;

  const toggle = (id: string) =>
    setProgress((current) => ({
      ...current,
      done: current.done.includes(id)
        ? current.done.filter((task) => task !== id)
        : [...current.done, id],
    }));

  const markRegistered = (name: string) =>
    setProgress((current) => ({ ...current, registeredAs: name }));

  let panel: ReactNode;
  if (progress.registeredAs) {
    const first = progress.registeredAs.split(/\s+/)[0];
    panel = (
      <div
        role="status"
        className="flex h-full flex-col items-start p-6 sm:p-10"
      >
        <span
          className="flex size-14 items-center justify-center rounded-full text-white"
          style={{ background: PRINT }}
        >
          <SealCheck weight="fill" className="size-7" />
        </span>
        <p className="mt-8 text-[36px] font-medium leading-[1.05] tracking-[-0.05em] sm:text-[48px]">
          You&apos;re in, {first}.
        </p>
        <p className="mt-4 max-w-[480px] text-[16px] leading-[1.65] text-[#141414]/65">
          {/* Explicit spaces: the JSX compiler drops them after an expression here */}
          Your spot for {hackathonName}
          {
            " is saved. Next, work through the pre-hack tasks so you're ready to build on day one."
          }
        </p>
        <a
          href="#tasks"
          className="mt-8 inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] border-[#141414] px-5 text-[14px] font-medium transition-colors hover:bg-[#141414] hover:text-[#f4efe7] lg:hidden"
        >
          Go to the tasks
        </a>
        <p className="mt-auto pt-10 text-[12.5px] text-[#141414]/50">
          Need to change something? Email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${hackathonName} registration`)}`}
            className="font-medium underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    );
  } else if (!registrationOpen) {
    panel = (
      <div className="flex h-full flex-col items-start p-6 sm:p-10">
        <span className="flex size-14 items-center justify-center rounded-full bg-[#141414]/[0.06] text-[#141414]/55">
          <LockSimple weight="bold" className="size-6" />
        </span>
        <p className="mt-8 text-[32px] font-medium leading-[1.1] tracking-[-0.05em] sm:text-[40px]">
          {closedTitle}
        </p>
        <p className="mt-4 max-w-[480px] text-[16px] leading-[1.65] text-[#141414]/65">
          {closedMessage}
        </p>
        <a
          href="/hackathons#hackathons"
          className="mt-8 inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] border-[#141414] px-5 text-[14px] font-medium transition-colors hover:bg-[#141414] hover:text-[#f4efe7]"
        >
          See open hackathons
        </a>
      </div>
    );
  } else if (registerUrl) {
    const host = new URL(registerUrl).hostname.replace(/^www\./, "");
    panel = (
      <div className="flex h-full flex-col items-start p-6 sm:p-10">
        <p className="text-[32px] font-medium leading-[1.1] tracking-[-0.05em] sm:text-[40px]">
          Registration is on {host}.
        </p>
        <p className="mt-4 max-w-[480px] text-[16px] leading-[1.65] text-[#141414]/65">
          Register there, then come back and tick off the pre-hack tasks.
        </p>
        <InkPill href={registerUrl} external className="mt-8">
          Register on {host}
        </InkPill>
      </div>
    );
  } else {
    panel = (
      <RegistrationForm
        slug={slug}
        hackathonName={hackathonName}
        tracks={tracks}
        onRegistered={markRegistered}
      />
    );
  }

  return (
    <div
      className={cn(
        "mt-10 grid items-start gap-2",
        showTasks && "lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]",
      )}
    >
      <div className="min-h-full rounded-[6px] bg-white/80 ring-1 ring-inset ring-[#141414]/10">
        {panel}
      </div>
      {showTasks ? (
        <div className="lg:sticky lg:top-28">
          <TaskChecklist
            tasks={tasks}
            progress={progress}
            autoRegister={autoRegister}
            onToggle={toggle}
          />
        </div>
      ) : null}
    </div>
  );
}
