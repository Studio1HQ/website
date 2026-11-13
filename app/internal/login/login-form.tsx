"use client";

import { useActionState, useState } from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "@/components/internal/ui";
import { requestSignInLink, type LoginState } from "./actions";

const initial: LoginState = { status: "idle" };

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(requestSignInLink, initial);
  const [retry, setRetry] = useState(0);
  const sent = state.status === "sent" && retry === 0 && !pending;

  if (sent) {
    return (
      <div role="status" className="space-y-3">
        <p className="text-[15px] font-medium">Check your inbox</p>
        <p className="text-sm leading-relaxed text-[var(--i-muted)]">
          We sent a sign-in link to{" "}
          <span className="font-medium text-[var(--i-ink)]">{state.email}</span>.
          Open it in this browser within the hour.
        </p>
        <button
          type="button"
          onClick={() => setRetry(1)}
          className="text-sm font-medium text-[var(--i-accent-ink)] underline-offset-4 hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        setRetry(0);
        return action(formData);
      }}
      className="space-y-4"
    >
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Work email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="you@studio1hq.com"
          className={cn(fieldClass, "h-11 text-[15px]")}
        />
      </label>
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#141414] px-4 py-2.5 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-[#141414]"
      >
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
