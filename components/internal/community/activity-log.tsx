"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ChatText,
  EnvelopeSimple,
  Handshake,
  Phone,
  Presentation,
  Trash,
  type Icon,
} from "@phosphor-icons/react";
import {
  clearFollowUp,
  logActivity,
  removeRecord,
} from "@/app/internal/(dashboard)/community/actions";
import {
  ACTIVITY_KINDS,
  addDays,
  formatDay,
  labelOf,
  ownerName,
  todayKey,
  type Activity,
} from "@/lib/internal/community/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import {
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/internal/ui";
import { DueDate } from "@/components/internal/community/ui";

/**
 * The outreach log on a sponsor, partner or event: notes, emails, calls,
 * meetings and proposals, newest first. On sponsors and partners it also
 * sets the next follow-up date.
 */

const ICONS: Record<string, Icon> = {
  note: ChatText,
  email: EnvelopeSimple,
  call: Phone,
  meeting: Handshake,
  proposal: Presentation,
};

export function ActivityLog({
  parent,
  items,
  canEdit,
  followUp,
}: {
  parent:
    { sponsor_id: string } | { partner_id: string } | { event_id: string };
  items: Activity[];
  canEdit: boolean;
  /** Sponsors and partners: the current follow-up date. */
  followUp?: { entity: "sponsor" | "partner"; id: string; on: string | null };
}) {
  const router = useRouter();
  const toast = useToast();
  const today = todayKey();
  const [kind, setKind] = useState(followUp ? "email" : "note");
  const [body, setBody] = useState("");
  const [day, setDay] = useState(today);
  const [next, setNext] = useState("");
  const [busy, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      const result = await logActivity(
        { ...parent, kind, body, happened_on: day },
        next || null,
      );
      if (result.ok) {
        // Saved either way; a warning means the follow-up dates didn't.
        if (result.warning) toast("error", result.warning);
        else toast("success", result.message ?? "Logged");
        setBody("");
        setNext("");
        setDay(todayKey());
        router.refresh();
      } else toast("error", result.message);
    });
  };

  const remove = (item: Activity) => {
    if (deleting !== item.id) {
      setDeleting(item.id);
      setTimeout(
        () => setDeleting((current) => (current === item.id ? null : current)),
        4000,
      );
      return;
    }
    startTransition(async () => {
      const result = await removeRecord("activity", item.id);
      setDeleting(null);
      if (result.ok) router.refresh();
      else toast("error", result.message);
    });
  };

  const clear = () =>
    followUp &&
    startTransition(async () => {
      const result = await clearFollowUp(followUp.entity, followUp.id);
      if (result.ok) {
        toast("success", result.message ?? "Cleared");
        router.refresh();
      } else toast("error", result.message);
    });

  return (
    <section className="rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] shadow-[var(--i-shadow-sm)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3">
        <h2 className="text-[13px] font-medium">
          {followUp ? "Outreach" : "Notes"}
        </h2>
        {followUp ? (
          <span className="flex items-center gap-2 text-[12.5px] text-[var(--i-muted)]">
            Follow up <DueDate day={followUp.on} today={today} />
            {followUp.on && canEdit ? (
              <button
                type="button"
                onClick={clear}
                disabled={busy}
                className="text-[12px] underline-offset-2 hover:text-[var(--i-ink)] hover:underline"
              >
                Clear
              </button>
            ) : null}
          </span>
        ) : null}
      </div>

      {canEdit ? (
        <form
          onSubmit={submit}
          className="space-y-2 border-b border-[var(--i-line)] px-5 py-3.5"
        >
          <div
            className="flex flex-wrap gap-1"
            role="radiogroup"
            aria-label="What kind"
          >
            {ACTIVITY_KINDS.map((option) => {
              const KindIcon = ICONS[option.value] ?? ChatText;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={kind === option.value}
                  onClick={() => setKind(option.value)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px]",
                    kind === option.value
                      ? "border-[var(--i-accent)] bg-[var(--i-accent-soft)] text-[var(--i-accent-text)]"
                      : "border-[var(--i-line)] text-[var(--i-ink-2)] hover:bg-[var(--i-hover)]",
                  )}
                >
                  <KindIcon size={13} /> {option.label}
                </button>
              );
            })}
          </div>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            maxLength={5000}
            aria-label="What happened"
            placeholder={
              followUp
                ? "Sent the deck to their DevRel lead. They'll reply after budget review."
                : "What happened, what was decided"
            }
            className={textareaClass}
          />
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[12px] text-[var(--i-muted)]">
              When
              <input
                type="date"
                value={day}
                max={today}
                onChange={(event) => setDay(event.target.value)}
                className={cn(inputClass(), "mt-1 w-[9.5rem]")}
              />
            </label>
            {followUp ? (
              <label className="text-[12px] text-[var(--i-muted)]">
                Next follow-up
                <input
                  type="date"
                  value={next}
                  min={today}
                  onChange={(event) => setNext(event.target.value)}
                  className={cn(inputClass(), "mt-1 w-[9.5rem]")}
                />
              </label>
            ) : null}
            {followUp ? (
              <span className="flex gap-1 pb-1">
                {[3, 7, 14].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setNext(addDays(today, days))}
                    className="rounded-md px-1.5 py-0.5 text-[12px] text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                  >
                    +{days}d
                  </button>
                ))}
              </span>
            ) : null}
            <button
              type="submit"
              disabled={busy || !body.trim()}
              className={cn(buttonClass("accent"), "ml-auto")}
            >
              Log it
            </button>
          </div>
        </form>
      ) : null}

      {items.length ? (
        <ol className="divide-y divide-[var(--i-line)]">
          {items.map((item) => {
            const KindIcon = ICONS[item.kind] ?? ChatText;
            return (
              <li key={item.id} className="group flex gap-3 px-5 py-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--i-sunken)] text-[var(--i-muted)] ring-1 ring-[var(--i-line)]">
                  <KindIcon size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-[var(--i-muted)]">
                    {labelOf(ACTIVITY_KINDS, item.kind)} ·{" "}
                    {formatDay(item.happened_on, today)}
                    {item.created_by ? ` · ${ownerName(item.created_by)}` : ""}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--i-ink-2)]">
                    {item.body}
                  </p>
                </div>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    aria-label="Delete this entry"
                    className={cn(
                      "h-7 shrink-0 rounded-md px-1.5 text-[12px] text-[var(--i-faint)] hover:text-rose-600",
                      deleting === item.id
                        ? "text-rose-600"
                        : "opacity-0 focus:opacity-100 group-hover:opacity-100",
                    )}
                  >
                    {deleting === item.id ? "Delete?" : <Trash size={14} />}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
          {followUp
            ? "No outreach logged yet. Log each email, call and meeting so anyone can pick it up."
            : "No notes yet."}
        </p>
      )}
    </section>
  );
}
