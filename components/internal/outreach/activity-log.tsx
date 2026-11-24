"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ChatCircleDots,
  ChatText,
  EnvelopeSimple,
  Handshake,
  Phone,
  Presentation,
  Trash,
  type Icon,
} from "@/components/internal/icons";
import {
  clearFollowUp,
  logActivity,
  removeActivity,
} from "@/app/internal/(dashboard)/outreach/actions";
import {
  addDays,
  formatDay,
  labelOf,
  ownerName,
  todayKey,
} from "@/lib/internal/community/schema";
import {
  ACTIVITY_KINDS,
  DIRECTIONS,
  type ActivityKind,
  type Direction,
  type OrgActivity,
  type OrgContact,
} from "@/lib/internal/outreach/schema";
import { cn } from "@/lib/utils";
import { DateField } from "@/components/internal/pickers";
import { Select } from "@/components/internal/select";
import { useToast } from "@/components/internal/toast";
import {
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/internal/ui";
import { DueDate } from "@/components/internal/community/ui";

/**
 * An organisation's log: every email, DM, call, meeting and proposal, sent
 * or received, newest first, plus the team's own notes. Logging one also
 * sets the next follow-up, so nothing is left without a date to chase.
 */

const ICONS: Record<string, Icon> = {
  note: ChatText,
  email: EnvelopeSimple,
  dm: ChatCircleDots,
  call: Phone,
  meeting: Handshake,
  proposal: Presentation,
};

export function ActivityLog({
  orgId,
  items,
  contacts,
  followUpOn,
  open,
}: {
  orgId: string;
  items: OrgActivity[];
  contacts: Pick<OrgContact, "id" | "name">[];
  followUpOn: string | null;
  /** Still in play: closed ones show their date plainly, never as overdue. */
  open: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const today = todayKey();
  const [kind, setKind] = useState<ActivityKind>("email");
  const [direction, setDirection] = useState<Direction>("out");
  const [summary, setSummary] = useState("");
  const [day, setDay] = useState(today);
  const [contact, setContact] = useState("");
  const [next, setNext] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [busy, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<string | null>(null);
  const names = Object.fromEntries(contacts.map((item) => [item.id, item.name]));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!summary.trim()) return;
    startTransition(async () => {
      const result = await logActivity(orgId, {
        kind,
        direction,
        summary,
        happened_on: day,
        contact_id: contact,
        follow_up_on: next,
        next_step: nextStep,
      });
      if (result.ok) {
        // Saved either way; a warning means the follow-up dates didn't.
        if (result.warning) toast("error", result.warning);
        else toast("success", result.message ?? "Logged");
        setSummary("");
        setNext("");
        setNextStep("");
        setDay(todayKey());
        router.refresh();
      } else toast("error", result.message);
    });
  };

  const remove = (item: OrgActivity) => {
    if (deleting !== item.id) {
      setDeleting(item.id);
      setTimeout(() => setDeleting((current) => (current === item.id ? null : current)), 4000);
      return;
    }
    startTransition(async () => {
      const result = await removeActivity(item.id);
      setDeleting(null);
      if (result.ok) router.refresh();
      else toast("error", result.message);
    });
  };

  const clear = () =>
    startTransition(async () => {
      const result = await clearFollowUp(orgId);
      if (result.ok) {
        toast("success", result.message ?? "Cleared");
        router.refresh();
      } else toast("error", result.message);
    });

  return (
    <section className="rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] shadow-[var(--i-shadow-sm)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3">
        <h2 className="text-[13px] font-medium">Outreach</h2>
        <span className="flex items-center gap-2 text-[12.5px] text-[var(--i-muted)]">
          Follow up <DueDate day={followUpOn} today={today} done={!open} />
          {followUpOn ? (
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
      </div>

      <form onSubmit={submit} className="space-y-2.5 border-b border-[var(--i-line)] px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="What kind">
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
          {/* A note is the team's own, so it has no direction. */}
          {kind !== "note" ? (
            <div className="flex gap-1" role="radiogroup" aria-label="Who reached out">
              {DIRECTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={direction === option.value}
                  onClick={() => setDirection(option.value)}
                  className={cn(
                    "h-7 rounded-md px-2 text-[12.5px]",
                    direction === option.value
                      ? "bg-[var(--i-sunken)] font-medium text-[var(--i-ink)] ring-1 ring-[var(--i-line)]"
                      : "text-[var(--i-muted)] hover:bg-[var(--i-hover)]",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={3}
          maxLength={5000}
          aria-label="What happened"
          placeholder="Sent the intro and two case studies. They'll reply after their launch."
          className={textareaClass}
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[12px] text-[var(--i-muted)]">
            When
            <DateField value={day} max={today} required onChange={setDay} className="mt-1" />
          </label>
          {contacts.length ? (
            <label className="text-[12px] text-[var(--i-muted)]">
              With
              <Select
                value={contact}
                onChange={setContact}
                className="mt-1"
                aria-label="Who it was with"
                options={[{ value: "", label: "Nobody in particular" }, ...contacts.map((item) => ({ value: item.id, label: item.name }))]}
              />
            </label>
          ) : null}
          <label className="text-[12px] text-[var(--i-muted)]">
            Next follow-up
            <DateField value={next} min={today} onChange={setNext} className="mt-1" />
            <span className="mt-1 flex gap-1">
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
          </label>
          <label className={cn("text-[12px] text-[var(--i-muted)]", !contacts.length && "lg:col-span-2")}>
            Next step
            <input
              value={nextStep}
              onChange={(event) => setNextStep(event.target.value)}
              maxLength={200}
              placeholder="Leave blank to keep the current one"
              className={cn(inputClass(), "mt-1")}
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={busy || !summary.trim()} className={buttonClass("accent")}>
            Log it
          </button>
        </div>
      </form>

      {items.length ? (
        <ol className="divide-y divide-[var(--i-line)]">
          {items.map((item) => {
            const KindIcon = ICONS[item.kind] ?? ChatText;
            const who = item.contact_id ? names[item.contact_id] : "";
            return (
              <li key={item.id} className="group flex gap-3 px-5 py-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--i-sunken)] text-[var(--i-muted)] ring-1 ring-[var(--i-line)]">
                  <KindIcon size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-[var(--i-muted)]">
                    {labelOf(ACTIVITY_KINDS, item.kind)}
                    {item.kind === "note" ? "" : item.direction === "in" ? " from them" : " from us"}
                    {who ? ` · ${who}` : ""} · {formatDay(item.happened_on, today)}
                    {item.created_by ? ` · logged by ${ownerName(item.created_by)}` : ""}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--i-ink-2)]">
                    {item.summary}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  aria-label="Delete this entry"
                  className={cn(
                    "h-7 shrink-0 rounded-md px-1.5 text-[12px] text-[var(--i-faint)] hover:text-rose-600",
                    deleting === item.id ? "text-rose-600" : "opacity-0 focus:opacity-100 group-hover:opacity-100 max-lg:opacity-100",
                  )}
                >
                  {deleting === item.id ? "Delete?" : <Trash size={14} />}
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
          Nothing logged yet. Log each email, DM and call so anyone can pick it up, and set the next follow-up.
        </p>
      )}
    </section>
  );
}
