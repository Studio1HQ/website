"use client";

import { useState, useTransition } from "react";
import { buttonClass, inputClass } from "@/components/internal/ui";
import { saveWaitingName } from "./actions";

/** The one profile step before approval: who is asking. */
export function WaitingNameForm({ saved }: { saved: string }) {
  const [name, setName] = useState(saved);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-5 border-t border-[var(--i-line)] pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await saveWaitingName(name);
          setNote({ ok: result.ok, text: result.message ?? "Saved" });
        });
      }}
    >
      <label htmlFor="waiting-name" className="block text-[12.5px] text-[var(--i-muted)]">
        Your name, so they know who&apos;s asking
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="waiting-name"
          value={name}
          maxLength={80}
          autoComplete="name"
          placeholder="First and last name"
          onChange={(event) => setName(event.target.value)}
          className={inputClass("sm")}
        />
        <button type="submit" disabled={pending || name.trim().length < 2 || name.trim() === saved} className={buttonClass("secondary", "sm")}>
          {pending ? "Saving…" : saved ? "Update" : "Save"}
        </button>
      </div>
      {note ? (
        <p role="status" className={`mt-2 text-[12.5px] ${note.ok ? "text-[var(--i-muted)]" : "text-rose-700 dark:text-rose-300"}`}>
          {note.text}
        </p>
      ) : null}
    </form>
  );
}
