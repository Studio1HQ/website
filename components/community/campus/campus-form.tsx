"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  Check,
  CheckCircle,
  Info,
  Plus,
} from "@phosphor-icons/react";
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
import {
  CASH_MAX,
  EMPTY_CAMPUS,
  SUPPORT,
  TURNOUTS,
  WHY_MAX,
  validateCampusApplication,
  type CampusErrors,
  type CampusField,
  type CampusValues,
} from "@/lib/campus-application";
import { PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/** Fields in on-screen order, so the first error gets focus. */
const FIELD_ORDER: CampusField[] = [
  "name",
  "email",
  "communityName",
  "college",
  "communityUrl",
  "coreTeamSize",
  "eventTurnout",
  "support",
  "cashAsk",
  "whyStudio1",
  "contactConsent",
  "emailUpdates",
];

const CARD =
  "rounded-[6px] bg-white text-[#141414] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]";

function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <span
      className={cn(
        "text-[12px] tabular-nums",
        value.length > max * 0.9 ? "text-[#c0341d]" : "text-[#141414]/40",
      )}
    >
      {value.length}/{max}
    </span>
  );
}

/** A numbered part of the form: "02 Your community in numbers". */
function Part({
  n,
  title,
  note,
  children,
}: {
  n: number;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-[#141414]/10 pt-6 first:border-t-0 first:pt-0">
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="flex items-baseline gap-3 p-0 text-[15px] font-medium tracking-[-0.02em]">
          <span className="text-[12px] tabular-nums" style={{ color: PRINT }}>
            {String(n).padStart(2, "0")}
          </span>
          {title}
        </legend>
        {note ? (
          <p className="mt-1.5 pl-[26px] text-[13px] leading-[1.55] text-[#141414]/55">
            {note}
          </p>
        ) : null}
        <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">
          {children}
        </div>
      </fieldset>
    </div>
  );
}

/** Pick-any options as small pills (tick boxes underneath). */
function Pills<K extends string>({
  name,
  legend,
  hint,
  items,
  value,
  onChange,
  error,
}: {
  name: string;
  legend: string;
  hint?: string;
  items: readonly { key: K; label: string }[];
  value: K[];
  onChange: (next: K[]) => void;
  error?: string;
}) {
  const id = useId();
  const toggle = (key: K, on: boolean) =>
    onChange(on ? [...value, key] : value.filter((item) => item !== key));
  return (
    <fieldset
      className="m-0 min-w-0 border-0 p-0 sm:col-span-2"
      aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
    >
      <legend className="p-0 text-[13px] font-medium">{legend}</legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {items.map((item, index) => {
          const checked = value.includes(item.key);
          return (
            <label key={item.key} className="relative cursor-pointer">
              <input
                type="checkbox"
                name={name}
                value={item.key}
                checked={checked}
                onChange={(event) => toggle(item.key, event.target.checked)}
                aria-invalid={error && index === 0 ? true : undefined}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] ring-1 ring-inset transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#f97316]",
                  checked
                    ? "bg-[#141414] text-[#f4efe7] ring-[#141414]"
                    : error
                      ? "bg-[#f8f5ef] text-[#141414]/75 ring-[#c0341d]/50"
                      : "bg-[#f8f5ef] text-[#141414]/75 ring-[#141414]/[0.12] hover:ring-[#141414]/30",
                )}
              >
                {checked ? (
                  <Check
                    aria-hidden
                    weight="bold"
                    className="size-3.5"
                    style={{ color: PRINT }}
                  />
                ) : (
                  <Plus
                    aria-hidden
                    weight="bold"
                    className="size-3.5 opacity-50"
                  />
                )}
                {item.label}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={`${id}-error`} className={ERROR_TEXT}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-[12.5px] text-[#141414]/50">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}

/** What the applicant sees once the application is in. */
function Received({ name, email }: { name: string; email: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // The form collapses into this card, which would leave the page scrolled
  // down at the footer: bring the card into view.
  useEffect(() => {
    ref.current?.scrollIntoView({
      block: "center",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [reduce]);
  return (
    <motion.div
      ref={ref}
      role="status"
      className={cn(CARD, "p-7 sm:p-10")}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5 }}
    >
      <CheckCircle weight="fill" className="size-12 text-[#f97316]" />
      <h3 className="mt-6 text-[28px] font-medium leading-tight tracking-[-0.04em] sm:text-[34px]">
        Thank you, {name.split(/\s+/)[0]}.
      </h3>
      <p className="mt-4 max-w-[460px] text-[15.5px] leading-[1.65] text-[#141414]/65">
        We&apos;ve got your application. Our community team reads every one and
        will write to you at{" "}
        <span className="font-medium text-[#141414]">{email}</span>, usually to
        set up a short call and plan the details together.
      </p>
      <div className="mt-8 border-t border-[#141414]/10 pt-6">
        <p className="text-[13px] font-medium text-[#141414]/50">
          In the meantime
        </p>
        <Link
          href="/community"
          className="group mt-2 inline-flex items-center gap-1.5 text-[15px] font-medium underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]"
        >
          Say hello in the Studio1 community
          <ArrowUpRight
            weight="bold"
            className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </motion.div>
  );
}

/** The Studio1 Across the Campus application, saved through /api/community/campus. */
export function CampusForm() {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const startedAt = useRef(0);
  const [values, setValues] = useState<CampusValues>(EMPTY_CAMPUS);
  const [errors, setErrors] = useState<CampusErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [received, setReceived] = useState<{
    name: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const set = <K extends CampusField>(field: K, value: CampusValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const fid = (field: CampusField) => `${id}-${field}`;
  const asksFunding = values.support.includes("cash");

  /** A one-line text box in a Field. */
  const input = (
    field: CampusField,
    label: string,
    options: {
      optional?: boolean;
      hint?: string;
      placeholder?: string;
      type?: string;
      autoComplete?: string;
      inputMode?: "email" | "url" | "numeric";
      wide?: boolean;
    } = {},
  ) => (
    <Field
      id={fid(field)}
      label={label}
      optional={options.optional}
      hint={options.hint}
      error={errors[field]}
      className={options.wide ? "sm:col-span-2" : undefined}
    >
      <input
        id={fid(field)}
        name={field}
        type={options.type ?? "text"}
        autoComplete={options.autoComplete}
        inputMode={options.inputMode}
        placeholder={options.placeholder}
        value={values[field] as string}
        onChange={(event) => set(field, event.target.value as never)}
        {...describedBy(fid(field), errors[field], Boolean(options.hint))}
        className={cn(CONTROL, "h-12")}
      />
    </Field>
  );

  /** A dropdown in a Field. */
  const select = (
    field: CampusField,
    label: string,
    options: readonly string[],
  ) => (
    <Field id={fid(field)} label={label} error={errors[field]}>
      <Select
        id={fid(field)}
        name={field}
        value={values[field] as string}
        onChange={(value) => set(field, value as never)}
        placeholder="Pick one"
        options={options}
        error={errors[field]}
      />
    </Field>
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setMessage("");

    const check = validateCampusApplication(values);
    if (!check.ok) {
      setErrors(check.errors);
      focusFirstError(formRef.current, FIELD_ORDER, check.errors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/community/campus", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          fillMs: Date.now() - startedAt.current,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        fields?: CampusErrors;
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
          Apply for support
        </h3>
        <span className="text-[12.5px] text-[#141414]/45">~2 minutes</span>
      </div>

      {/* Said kindly, before anything else: support is mostly people and resources. */}
      <div className="mt-6 flex gap-3 rounded-[6px] bg-[#f97316]/[0.07] px-4 py-3.5 text-[14px] leading-[1.6] ring-1 ring-inset ring-[#f97316]/20">
        <Info
          weight="fill"
          aria-hidden
          className="mt-0.5 size-5 shrink-0"
          style={{ color: PRINT }}
        />
        <p className="text-[#141414]/80">
          <span className="font-medium text-[#141414]">Good to know:</span> we
          usually support events with people and resources, like talks, mentors,
          swag, reach and introductions to devtool teams. Financial support is
          something we can offer only now and then, so we look at those requests
          case by case.
        </p>
      </div>

      <div className="mt-8 space-y-7">
        <Part n={1} title="You and your community">
          {input("name", "Full name", { autoComplete: "name" })}
          {input("email", "Email", {
            type: "email",
            autoComplete: "email",
            inputMode: "email",
          })}
          {input("communityName", "Community or club", {
            placeholder: "GDG on Campus JU",
          })}
          {input("college", "College or university", {
            optional: true,
            placeholder: "Jadavpur University",
          })}
          {input("communityUrl", "Link to your community", {
            type: "url",
            inputMode: "url",
            placeholder: "linkedin.com/company/your-club",
            hint: "LinkedIn, Instagram, a website or your Luma page.",
            wide: true,
          })}
        </Part>

        <Part n={2} title="Your community in numbers">
          {input("coreTeamSize", "Committee size", {
            inputMode: "numeric",
            placeholder: "12",
            hint: "People organising events, including you.",
          })}
          {select("eventTurnout", "Average turnout at your events", TURNOUTS)}
        </Part>

        <Part n={3} title="How we can help">
          <Field
            id={fid("whyStudio1")}
            label="Tell us a little about your plans"
            error={errors.whyStudio1}
            className="sm:col-span-2"
          >
            <textarea
              id={fid("whyStudio1")}
              name="whyStudio1"
              rows={3}
              maxLength={WHY_MAX + 50}
              placeholder="The event you have in mind, who it's for, and why you'd like Studio1 there."
              value={values.whyStudio1}
              onChange={(event) => set("whyStudio1", event.target.value)}
              {...describedBy(fid("whyStudio1"), errors.whyStudio1)}
              className={cn(
                CONTROL,
                "min-h-[96px] resize-y py-3 leading-[1.55]",
              )}
            />
            <div className="mt-1 flex justify-end">
              <CharCount value={values.whyStudio1} max={WHY_MAX} />
            </div>
          </Field>
          <Pills
            name="support"
            legend="Anything in particular that would help?"
            hint="Optional. Pick any that fit, or leave it to us and we'll suggest what works."
            items={SUPPORT}
            value={values.support}
            onChange={(next) => set("support", next)}
            error={errors.support}
          />
          {asksFunding ? (
            <Field
              id={fid("cashAsk")}
              label="Roughly how much, and what would it cover?"
              hint="We can offer funding only occasionally, so this helps us look at it properly."
              error={errors.cashAsk}
              className="sm:col-span-2"
            >
              <textarea
                id={fid("cashAsk")}
                name="cashAsk"
                rows={2}
                maxLength={CASH_MAX + 50}
                placeholder="About ₹40,000 for the venue."
                value={values.cashAsk}
                onChange={(event) => set("cashAsk", event.target.value)}
                {...describedBy(fid("cashAsk"), errors.cashAsk, true)}
                className={cn(
                  CONTROL,
                  "min-h-[76px] resize-y py-3 leading-[1.55]",
                )}
              />
            </Field>
          ) : null}
        </Part>

        <Honeypot
          value={values.website}
          onChange={(value) => set("website", value)}
        />

        <div className="border-t border-[#141414]/10 pt-6">
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
          Send application
        </SubmitPill>
        <p className="text-[12.5px] text-[#141414]/50">
          We read every application.
        </p>
      </div>
    </form>
  );
}
