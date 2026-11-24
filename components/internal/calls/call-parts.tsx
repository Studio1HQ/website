"use client";

import { useState, type ReactNode } from "react";
import { ArrowSquareOut, CalendarPlus, Crown, PencilSimple, VideoCamera } from "@/components/internal/icons";
import { cn } from "@/lib/utils";
import { buttonClass, inputClass } from "@/components/internal/ui";
import { DateField } from "@/components/internal/pickers";
import { TeamAvatar } from "@/components/internal/team-photos";
import { Pill } from "@/components/internal/community/ui";
import { Label, TeamDialog, useTeamAction } from "@/components/internal/team/kit";
import { TimeField } from "@/components/internal/team/time-field";
import { changeOne, restoreOne } from "@/app/internal/(dashboard)/calls/actions";
import {
  attendees,
  callState,
  clock,
  googleCalendarLink,
  isIn,
  lengthLabel,
  repeatLabel,
  shortDay,
  timeRange,
  type Occurrence,
} from "@/lib/internal/calls/shared";
import { CallForm } from "@/components/internal/calls/call-form";
import { Context, nameOf, useCalls, useNow, type CallsData, type Tone } from "@/components/internal/calls/context";

/* The calls a page shows, one dialog for whichever call is opened, the
   card a call gets in lists, and each series' colour. Planners edit a
   call, or move or cancel one day of it, from the dialog. */

/* Each series keeps one colour wherever it shows, so the 3 PM sync is the
   same blue all month. Colours go round in the order calls were added, so
   two calls only share one after eight. No orange: that's today's colour.
   Full class names, so Tailwind keeps them. */
const TONES: readonly Tone[] = [
  { block: "border-sky-500 bg-sky-50 text-sky-950 hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-50 dark:hover:bg-sky-500/25", dot: "bg-sky-500" },
  { block: "border-violet-500 bg-violet-50 text-violet-950 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-50 dark:hover:bg-violet-500/25", dot: "bg-violet-500" },
  { block: "border-emerald-500 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-50 dark:hover:bg-emerald-500/25", dot: "bg-emerald-500" },
  { block: "border-rose-500 bg-rose-50 text-rose-950 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-50 dark:hover:bg-rose-500/25", dot: "bg-rose-500" },
  { block: "border-amber-500 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-50 dark:hover:bg-amber-500/25", dot: "bg-amber-500" },
  { block: "border-teal-500 bg-teal-50 text-teal-950 hover:bg-teal-100 dark:bg-teal-500/15 dark:text-teal-50 dark:hover:bg-teal-500/25", dot: "bg-teal-500" },
  { block: "border-indigo-500 bg-indigo-50 text-indigo-950 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-50 dark:hover:bg-indigo-500/25", dot: "bg-indigo-500" },
  { block: "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-950 hover:bg-fuchsia-100 dark:bg-fuchsia-500/15 dark:text-fuchsia-50 dark:hover:bg-fuchsia-500/25", dot: "bg-fuchsia-500" },
];

/**
 * Holds the page's calls and the one call dialog: any view opens a call
 * with useCalls().open(item), and colours it with useCalls().tone(id).
 */
export function CallsProvider({ value, children }: { value: CallsData; children: ReactNode }) {
  const [selected, setSelected] = useState<Occurrence | null>(null);
  const [open, setOpen] = useState(false);
  const order = Object.values(value.calls).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const index = new Map(order.map((call, at) => [call.id, at]));
  const context = {
    ...value,
    open: (item: Occurrence) => {
      setSelected(item);
      setOpen(true);
    },
    tone: (callId: string) => TONES[(index.get(callId) ?? 0) % TONES.length],
  };
  return (
    <Context.Provider value={context}>
      {children}
      {selected ? <CallDetails key={selected.key} item={selected} open={open} onOpenChange={setOpen} /> : null}
    </Context.Provider>
  );
}

/** A few faces and "+3", for a card. */
export function PeopleStack({ emails, max = 4, size = 20 }: { emails: readonly string[]; max?: number; size?: 20 | 24 }) {
  const { names } = useCalls();
  const shown = emails.slice(0, max);
  const rest = emails.length - shown.length;
  return (
    <span className="flex items-center" title={emails.map((email) => nameOf(names, email)).join(", ")}>
      {shown.map((email, index) => (
        <TeamAvatar
          key={email}
          name={nameOf(names, email)}
          email={email}
          size={size}
          className={cn("ring-2 ring-[var(--i-panel)]", index > 0 && "-ml-1.5")}
        />
      ))}
      {rest > 0 ? <span className="ml-1 text-[11px] tabular-nums text-[var(--i-muted)]">+{rest}</span> : null}
    </span>
  );
}

function StateBadge({ state }: { state: ReturnType<typeof callState> }) {
  if (state === "live") return <Pill tone="emerald">Live now</Pill>;
  if (state === "soon") return <Pill tone="amber">Soon</Pill>;
  return null;
}

/** A call on a day: its time, name and people; opens the details. */
export function CallCard({
  item,
  now,
  showDay = false,
}: {
  item: Occurrence;
  now: { date: string; time: string };
  showDay?: boolean;
}) {
  const { calls, team, me, open, tone } = useCalls();
  const call = calls[item.call_id];
  if (!call) return null;
  const state = callState(item, now);
  const past = state === "past";
  const people = attendees(call, team);
  const mine = isIn(call, me);

  return (
    <article
      className={cn(
        "group relative rounded-lg border border-[var(--i-line)] bg-[var(--i-panel)] transition-colors",
        (past || item.cancelled) && "opacity-70",
      )}
    >
      <button
        type="button"
        onClick={() => open(item)}
        className="block w-full rounded-lg p-2 text-left hover:bg-[var(--i-hover)]"
        aria-label={`${call.title}, ${showDay ? `${shortDay(item.day)}, ` : ""}${timeRange(item.start, item.minutes)}${item.cancelled ? ", cancelled" : ""}`}
      >
        {/* The badge drops under the time when the column is narrow. */}
        <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] tabular-nums text-[var(--i-muted)]", item.cancelled && "line-through")}>
            <span aria-hidden className={cn("size-2 shrink-0 rounded-full", tone(call.id).dot)} />
            {showDay ? `${shortDay(item.day)} · ` : ""}
            {timeRange(item.start, item.minutes)}
          </span>
          {item.cancelled ? <Pill tone="rose">Off</Pill> : <StateBadge state={state} />}
        </span>
        <span
          className={cn(
            "mt-0.5 line-clamp-2 block break-words text-[13px] font-medium leading-snug",
            item.cancelled && "line-through decoration-[var(--i-faint)]",
          )}
        >
          {call.title}
        </span>
        {item.moved_from ? (
          <span className="mt-0.5 block text-[11px] text-amber-700 dark:text-amber-300">
            Moved from {item.moved_from.day === item.day ? clock(item.moved_from.start) : `${shortDay(item.moved_from.day)}, ${clock(item.moved_from.start)}`}
          </span>
        ) : null}
        <span className="mt-1.5 flex items-center justify-between gap-2">
          {call.whole_team ? (
            <span className="text-[11.5px] text-[var(--i-muted)]">Whole team</span>
          ) : (
            <PeopleStack emails={people} />
          )}
          {!mine ? <span className="text-[11px] text-[var(--i-faint)]">Not in it</span> : null}
        </span>
      </button>
      {/* Join sits outside the card's button: a link can't go inside one. */}
      {call.link && !item.cancelled && (state === "live" || state === "soon") ? (
        <a
          href={call.link}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonClass("accent", "sm"), "mx-2 mb-2 flex")}
        >
          <VideoCamera size={13} weight="fill" /> Join
        </a>
      ) : null}
    </article>
  );
}

/** The call's page, in a dialog: when, who, the link, what it's for; planners fix it here. */
function CallDetails({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Occurrence;
}) {
  const { calls, names, team, canPlan, today, now: serverNow } = useCalls();
  const now = useNow(serverNow);
  const { pending, run } = useTeamAction();
  const [mode, setMode] = useState<"view" | "move" | "cancel">("view");
  const [editing, setEditing] = useState(false);
  const [move, setMove] = useState({ day: item.day, time: item.start, note: item.note });
  const [note, setNote] = useState("");
  const call = calls[item.call_id];
  // Deleted, or gone after a reload: nothing to show.
  if (!call) return null;
  const state = callState(item, now);
  const people = attendees(call, team);
  const repeating = call.repeat === "weekly";
  const changed = item.cancelled || item.moved_from !== null;

  const close = () => {
    setMode("view");
    onOpenChange(false);
  };

  const footer =
    mode === "move" ? (
      <>
        <button type="button" className={buttonClass("ghost")} onClick={() => setMode("view")}>
          Back
        </button>
        <button
          type="button"
          className={buttonClass("primary")}
          disabled={pending || !move.day || !move.time}
          onClick={() => run(() => changeOne(call.id, item.on_day, { day: move.day, time: move.time, note: move.note }), close)}
        >
          Move it
        </button>
      </>
    ) : mode === "cancel" ? (
      <>
        <button type="button" className={buttonClass("ghost")} onClick={() => setMode("view")}>
          Back
        </button>
        <button
          type="button"
          className={buttonClass("danger")}
          disabled={pending}
          onClick={() => run(() => changeOne(call.id, item.on_day, { cancel: true, note }), close)}
        >
          Cancel {repeating ? "this day" : "the call"}
        </button>
      </>
    ) : (
      <>
        {canPlan ? (
          <>
            <button type="button" className={buttonClass("ghost")} onClick={() => setEditing(true)}>
              <PencilSimple size={14} /> Edit call
            </button>
            {changed ? (
              <button type="button" className={buttonClass("ghost")} disabled={pending} onClick={() => run(() => restoreOne(call.id, item.on_day), close)}>
                {item.cancelled ? "Put it back on" : "Back to usual time"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={buttonClass("ghost")}
                  onClick={() => {
                    setMove({ day: item.day, time: item.start, note: item.note });
                    setMode("move");
                  }}
                >
                  Move{repeating ? " this day" : ""}
                </button>
                <button
                  type="button"
                  className={buttonClass("ghost")}
                  onClick={() => {
                    setNote("");
                    setMode("cancel");
                  }}
                >
                  Cancel{repeating ? " this day" : ""}…
                </button>
              </>
            )}
          </>
        ) : null}
        <span className="flex-1" />
        {call.link && !item.cancelled && state !== "past" ? (
          <a href={call.link} target="_blank" rel="noreferrer" className={buttonClass("accent")}>
            <VideoCamera size={14} weight="fill" /> Join
          </a>
        ) : (
          <button type="button" className={buttonClass("secondary")} onClick={close}>
            Close
          </button>
        )}
      </>
    );

  return (
    <>
      <TeamDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setMode("view");
          onOpenChange(next);
        }}
        title={call.title}
        description={`${shortDay(item.day)} · ${timeRange(item.start, item.minutes)} IST`}
        footer={footer}
      >
        {mode === "move" ? (
          <>
            <p className="text-[12.5px] text-[var(--i-muted)]">
              Moves {repeating ? `only ${shortDay(item.on_day)}'s call` : "the call"}. {repeating ? "The rest of the series stays as it is." : ""}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Label label="Day" group>
                <DateField value={move.day} onChange={(day) => setMove({ ...move, day })} min={today} required aria-label="Day" />
              </Label>
              <Label label="Time (IST)" group>
                <TimeField value={move.time} onChange={(time) => setMove({ ...move, time })} aria-label="Time" />
              </Label>
            </div>
            <Label label="Why" hint="optional">
              <input
                value={move.note}
                onChange={(event) => setMove({ ...move, note: event.target.value })}
                maxLength={300}
                placeholder="Client call clashes"
                className={inputClass()}
              />
            </Label>
          </>
        ) : mode === "cancel" ? (
          <>
            <p className="text-[13px]">
              {repeating
                ? `Cancel only ${shortDay(item.on_day)}'s ${call.title}? The rest of the series stays on.`
                : `Cancel ${call.title}?`}{" "}
              It stays on the calendar, marked off, so nobody waits in the room.
            </p>
            <Label label="Why" hint="optional">
              <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="Founders travelling" className={inputClass()} />
            </Label>
          </>
        ) : (
          <>
            {item.cancelled ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
                Off this time.{item.note ? ` ${item.note}` : ""}
              </p>
            ) : item.moved_from ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                Moved from {shortDay(item.moved_from.day)}, {clock(item.moved_from.start)}.{item.note ? ` ${item.note}` : ""}
              </p>
            ) : null}
            <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-2.5 text-[13px]">
              <dt className="text-[var(--i-muted)]">When</dt>
              <dd>
                {repeatLabel(call, false)}, {timeRange(call.start_time, call.minutes)}
                <span className="text-[var(--i-faint)]"> · {lengthLabel(call.minutes)}</span>
                {repeating && call.ends_on ? <span className="block text-[12px] text-[var(--i-muted)]">Until {shortDay(call.ends_on)}</span> : null}
              </dd>
              <dt className="text-[var(--i-muted)]">Who</dt>
              <dd>
                {call.whole_team ? <p className="mb-1.5">The whole team{call.people.length ? ", and:" : ""}</p> : null}
                <ul className="space-y-1.5">
                  {(call.whole_team ? [call.host, ...call.people].filter((email): email is string => Boolean(email)) : people).map((email) => (
                    <li key={email} className="flex min-w-0 items-center gap-2">
                      <TeamAvatar name={nameOf(names, email)} email={email} size={20} />
                      <span className="truncate">{nameOf(names, email)}</span>
                      {email === call.host ? (
                        <span className="inline-flex items-center gap-0.5 text-[11.5px] text-[var(--i-muted)]">
                          <Crown size={11} /> host
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </dd>
              {call.link ? (
                <>
                  <dt className="text-[var(--i-muted)]">Link</dt>
                  <dd className="min-w-0">
                    <a href={call.link} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-[var(--i-accent-text)] hover:underline">
                      <span className="truncate">{call.link.replace(/^https?:\/\//, "")}</span>
                      <ArrowSquareOut size={12} className="shrink-0" />
                    </a>
                  </dd>
                </>
              ) : null}
              {call.about ? (
                <>
                  <dt className="text-[var(--i-muted)]">What it&apos;s for</dt>
                  <dd className="whitespace-pre-line break-words">{call.about}</dd>
                </>
              ) : null}
            </dl>
            {canPlan ? (
              <a
                href={googleCalendarLink(call, people)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
                title="Opens Google Calendar with this call filled in. Saving there sends the invites."
              >
                <CalendarPlus size={14} /> Send invites from Google Calendar
              </a>
            ) : null}
          </>
        )}
      </TeamDialog>
      {canPlan ? <CallForm open={editing} onOpenChange={setEditing} call={call} onDeleted={close} /> : null}
    </>
  );
}
