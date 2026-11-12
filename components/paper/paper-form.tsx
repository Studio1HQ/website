"use client";

import { useId, type ReactNode } from "react";
import { ArrowUpRight, CaretDown, CircleNotch } from "@phosphor-icons/react";
import { INK, PAPER, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/**
 * Form controls in the paper style: warm wells, ink type, an orange focus
 * ring, and errors in a brick red that reads on the cream sheet.
 */

export const CONTROL =
  "w-full rounded-[6px] bg-[#f8f5ef] px-4 text-[15px] text-[#141414] outline-none ring-1 ring-inset ring-[#141414]/[0.12] transition-shadow placeholder:text-[#141414]/35 focus:bg-white focus:ring-2 focus:ring-[#f97316] aria-[invalid=true]:ring-[#c0341d]";

export const ERROR_TEXT = "mt-1.5 text-[12.5px] font-medium text-[#c0341d]";

/** Label, control, then the error (or the hint when there's no error). */
export function Field({
  id,
  label,
  optional = false,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium">{label}</span>
        {optional ? (
          <span className="text-[12px] text-[#141414]/45">Optional</span>
        ) : null}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} className={ERROR_TEXT}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[12.5px] text-[#141414]/50">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** `aria-*` wiring for a control inside a Field with the same id. */
export function describedBy(id: string, error?: string, hint?: boolean) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

export function Select({
  id,
  name,
  value,
  onChange,
  placeholder,
  options,
  error,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: readonly string[];
  error?: string;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...describedBy(id, error)}
        className={cn(
          CONTROL,
          "h-12 appearance-none pr-10",
          !value && "text-[#141414]/40",
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option} value={option} className="text-[#141414]">
            {option}
          </option>
        ))}
      </select>
      <CaretDown
        weight="bold"
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 size-3.5 -translate-y-1/2 text-[#141414]/50"
      />
    </div>
  );
}

/** Radio buttons drawn as a row of segments. */
export function Segments({
  name,
  legend,
  value,
  options,
  onChange,
  error,
}: {
  name: string;
  legend: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  error?: string;
}) {
  const errorId = useId();
  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      className="min-w-0"
    >
      <legend className="text-[13px] font-medium">{legend}</legend>
      <div
        className={cn(
          "mt-2 grid gap-1 rounded-[6px] bg-[#f8f5ef] p-1 ring-1 ring-inset",
          error ? "ring-[#c0341d]" : "ring-[#141414]/[0.12]",
          options.length === 3 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {options.map((option) => (
          <label key={option.value} className="relative min-w-0">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-invalid={error ? true : undefined}
              className="peer sr-only"
            />
            <span className="flex h-10 cursor-pointer items-center justify-center truncate rounded-[4px] px-2 text-center text-[13.5px] font-medium text-[#141414]/60 transition-colors hover:text-[#141414] peer-checked:bg-[#141414] peer-checked:text-[#f4efe7] peer-focus-visible:ring-2 peer-focus-visible:ring-[#f97316]">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} className={ERROR_TEXT}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

const CHECKBOX = "mt-0.5 size-[18px] shrink-0 cursor-pointer accent-[#f97316]";

/**
 * The last thing before submit on every form: two required ticks, one to
 * store the entry and email about it, one to subscribe to email updates.
 * Values and validation live in lib/contact-consent.ts.
 */
export function ContactConsent({
  id,
  purpose,
  values,
  errors = {},
  onChange,
}: {
  /** Base id; errors get `${id}-contactConsent-error` / `${id}-emailUpdates-error`. */
  id: string;
  /** What they're sending, e.g. "application" or "registration". */
  purpose: string;
  values: { contactConsent: boolean; emailUpdates: boolean };
  errors?: { contactConsent?: string; emailUpdates?: string };
  onChange: (
    field: "contactConsent" | "emailUpdates",
    checked: boolean,
  ) => void;
}) {
  const box = (
    field: "contactConsent" | "emailUpdates",
    label: ReactNode,
  ) => {
    const error = errors[field];
    const errorId = `${id}-${field}-error`;
    return (
      <div>
        <label className="flex cursor-pointer gap-3 text-[14px] leading-snug">
          <input
            type="checkbox"
            name={field}
            checked={values[field]}
            onChange={(event) => onChange(field, event.target.checked)}
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={CHECKBOX}
          />
          <span>{label}</span>
        </label>
        {error ? (
          <p id={errorId} className={cn(ERROR_TEXT, "mt-1.5 pl-[30px]")}>
            {error}
          </p>
        ) : null}
      </div>
    );
  };
  return (
    <div className="space-y-3">
      {box(
        "contactConsent",
        <>
          I agree that Studio1 can store the details I&apos;ve shared and email
          me about this {purpose} and next steps. See our{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener"
            className="font-medium underline decoration-[#f97316] underline-offset-4"
          >
            Privacy Policy
          </a>
          .
        </>,
      )}
      {box(
        "emailUpdates",
        <>
          I&apos;m subscribing to Studio1&apos;s email updates about new roles,
          cohorts and events. I can unsubscribe at any time, and that
          won&apos;t affect my {purpose}.
        </>,
      )}
    </div>
  );
}

/** Hidden field people never see; bots fill it in and get quietly dropped. */
export function Honeypot({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div aria-hidden className="sr-only">
      <label>
        Website
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}

/** Ink submit pill with the orange arrow dot; spins while sending. */
export function SubmitPill({
  submitting,
  children,
  busyLabel,
}: {
  submitting: boolean;
  children: ReactNode;
  busyLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="group inline-flex h-12 items-center justify-between gap-3 rounded-full py-1.5 pl-6 pr-1.5 text-[15px] font-medium transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-80 disabled:hover:translate-y-0 motion-reduce:transform-none"
      style={{ background: INK, color: PAPER }}
    >
      {submitting ? busyLabel : children}
      <span
        className="flex size-9 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45"
        style={{ background: PRINT }}
      >
        {submitting ? (
          <CircleNotch weight="bold" className="size-4 animate-spin" />
        ) : (
          <ArrowUpRight weight="bold" className="size-4" />
        )}
      </span>
    </button>
  );
}

/** Form-level error, announced to screen readers. */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-6 rounded-[6px] bg-[#c0341d]/[0.08] px-4 py-3 text-[14px] font-medium text-[#c0341d]"
    >
      {children}
    </p>
  );
}

/** Focuses the first control (by `name`) that has an error. */
export function focusFirstError(
  form: HTMLFormElement | null,
  order: readonly string[],
  errors: Partial<Record<string, string>>,
) {
  const field = order.find((name) => errors[name]);
  if (!field || !form) return;
  form.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
}
