"use client";

import { useActionState, useState } from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "@/components/internal/ui";
import {
  checkSignInCode,
  requestSignInCode,
  type CheckCodeState,
  type RequestCodeState,
} from "./actions";

const buttonClass =
  "w-full rounded-lg bg-[#141414] px-4 py-2.5 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-[#141414]";
const linkButtonClass =
  "font-medium text-[var(--i-accent-ink)] underline-offset-4 hover:underline disabled:opacity-60";

/**
 * Sign-in in two steps: email, then the code from the email. `pendingEmail`
 * is the address this browser last asked a code for, so a reload stays on
 * the code step.
 */
export function LoginForm({ next, pendingEmail }: { next: string; pendingEmail: string | null }) {
  const [state, request, requesting] = useActionState<RequestCodeState, FormData>(
    requestSignInCode,
    { status: "idle" },
  );
  const [editing, setEditing] = useState(false);
  const codeFor = editing
    ? null
    : state.status === "sent"
      ? state.email
      : state.status === "error"
        ? null
        : pendingEmail;

  if (codeFor) {
    return (
      <div className="space-y-4">
        <div role="status" className="space-y-1.5">
          <p className="text-[15px] font-medium">Check your inbox</p>
          <p className="text-sm leading-relaxed text-[var(--i-muted)]">
            We emailed a sign-in code to{" "}
            <span className="font-medium text-[var(--i-ink)]">{codeFor}</span>. Enter it here.
            It can take a couple of minutes to arrive.
          </p>
          {state.status === "sent" && state.note ? (
            <p className="text-sm text-[var(--i-ink)]">{state.note}</p>
          ) : null}
        </div>
        {/* A new code starts the code step afresh, without the old error. */}
        <CodeStep key={state.status === "sent" ? state.sentAt : "pending"} next={next} />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <form action={request}>
            <input type="hidden" name="email" value={codeFor} />
            <input type="hidden" name="resend" value="1" />
            <button type="submit" disabled={requesting} className={linkButtonClass}>
              {requesting ? "Sending…" : "Send a new code"}
            </button>
          </form>
          <button type="button" onClick={() => setEditing(true)} className={linkButtonClass}>
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        setEditing(false);
        return request(formData);
      }}
      className="space-y-4"
    >
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Work email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          autoFocus
          defaultValue={pendingEmail ?? undefined}
          placeholder="you@studio1hq.com"
          className={cn(fieldClass, "h-11 text-[15px]")}
        />
      </label>
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {state.message}
        </p>
      ) : null}
      <button type="submit" disabled={requesting} className={buttonClass}>
        {requesting ? "Sending…" : "Email me a sign-in code"}
      </button>
    </form>
  );
}

function CodeStep({ next }: { next: string }) {
  const [state, check, checking] = useActionState<CheckCodeState, FormData>(checkSignInCode, {
    status: "idle",
  });
  return (
    <form action={check} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Sign-in code</span>
        <input
          type="text"
          name="code"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={14}
          placeholder="12345678"
          aria-invalid={state.status === "error" || undefined}
          className={cn(fieldClass, "h-11 font-mono text-[18px] tracking-[0.25em]")}
        />
      </label>
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {state.message}
        </p>
      ) : null}
      <button type="submit" disabled={checking} className={buttonClass}>
        {checking ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
