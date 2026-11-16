"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { buttonClass, inputClass, textareaClass } from "@/components/internal/ui";
import { DateField, SuggestInput } from "@/components/internal/pickers";
import { Select } from "@/components/internal/select";
import { TeamAvatar } from "@/components/internal/team-photos";
import { Label, Segmented, TeamDialog, useTeamAction } from "@/components/internal/team/kit";
import { TimeField } from "@/components/internal/team/time-field";
import { removeCall, saveCall } from "@/app/internal/(dashboard)/calls/actions";
import { nameOf, useCalls } from "@/components/internal/calls/context";
import {
  DAY_PRESETS,
  LENGTHS,
  WEEKDAYS,
  isEmail,
  lengthLabel,
  repeatLabel,
  type Call,
  type CallRepeat,
} from "@/lib/internal/calls/shared";

/* Scheduling a call: its name, when (once, or weekly on some days), who's
   in, the link and what it's for. Founders and the founder's associate. */

type Form = {
  title: string;
  repeat: CallRepeat;
  days: number[];
  every_weeks: string;
  starts_on: string;
  ends_on: string;
  start_time: string;
  minutes: string;
  whole_team: boolean;
  people: string[];
  host: string;
  link: string;
  about: string;
};

function formOf(call: Call | null, today: string): Form {
  return call
    ? {
        title: call.title,
        repeat: call.repeat,
        days: call.days,
        every_weeks: String(call.every_weeks),
        starts_on: call.starts_on,
        ends_on: call.ends_on ?? "",
        start_time: call.start_time,
        minutes: String(call.minutes),
        whole_team: call.whole_team,
        people: call.host ? [call.host, ...call.people] : call.people,
        host: call.host ?? "",
        link: call.link,
        about: call.about,
      }
    : {
        title: "",
        repeat: "weekly",
        days: [1, 2, 3, 4, 5],
        every_weeks: "1",
        starts_on: today,
        ends_on: "",
        start_time: "",
        minutes: "30",
        whole_team: false,
        people: [],
        host: "",
        link: "",
        about: "",
      };
}

/** "+ New call", for the page header. */
export function NewCallButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={buttonClass("primary")} onClick={() => setOpen(true)}>
        <Plus size={14} /> New call
      </button>
      <CallForm open={open} onOpenChange={setOpen} call={null} />
    </>
  );
}

export function CallForm({
  open,
  onOpenChange,
  call,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null for a new call. */
  call: Call | null;
  onDeleted?: () => void;
}) {
  const { people, names, today } = useCalls();
  const { pending, run } = useTeamAction();
  const [form, setForm] = useState(() => formOf(call, today));
  const [adding, setAdding] = useState("");
  const [confirming, setConfirming] = useState(false);
  // Fresh each time it opens (the buttons open it from outside, so Radix's
  // onOpenChange never sees the opening): what was typed last time goes.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(formOf(call, today));
      setAdding("");
      setConfirming(false);
    }
  }
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));

  const suggestions = useMemo(
    () =>
      people
        .filter((person) => !form.people.includes(person.email))
        // A plain-text label, so typing a name finds the person too.
        .map((person) => ({ value: person.email, label: `${person.name} · ${person.email}` })),
    [people, form.people],
  );

  const addPerson = (value: string) => {
    const typed = value.trim().toLowerCase();
    if (!typed) return;
    // A name typed in full picks that person.
    const byName = people.find((person) => person.name.toLowerCase() === typed);
    const email = byName ? byName.email : typed;
    if (!isEmail(email)) return;
    setForm((current) => (current.people.includes(email) ? current : { ...current, people: [...current.people, email] }));
    setAdding("");
  };

  const toggleDay = (day: number) =>
    set("days", form.days.includes(day) ? form.days.filter((value) => value !== day) : [...form.days, day].sort((a, b) => a - b));

  const lengths = LENGTHS.includes(Number(form.minutes) as (typeof LENGTHS)[number]) ? [...LENGTHS] : [...LENGTHS, Number(form.minutes)].sort((a, b) => a - b);

  const close = () => {
    setConfirming(false);
    onOpenChange(false);
  };

  const save = () =>
    run(
      () =>
        saveCall(call?.id ?? null, {
          ...form,
          every_weeks: Number(form.every_weeks),
          minutes: Number(form.minutes),
          ends_on: form.repeat === "weekly" ? form.ends_on || null : null,
          host: form.host || null,
          // The host is kept apart from the rest.
          people: form.people.filter((email) => email !== form.host),
        }),
      close,
    );

  const preview =
    form.start_time && (form.repeat === "once" || form.days.length)
      ? repeatLabel({
          repeat: form.repeat,
          days: form.days,
          every_weeks: Number(form.every_weeks),
          starts_on: form.starts_on || today,
          start_time: form.start_time,
          minutes: Number(form.minutes),
        })
      : null;

  return (
    <TeamDialog
      open={open}
      onOpenChange={onOpenChange}
      title={call ? "Edit call" : "New call"}
      description={preview ? `${preview} IST` : "Internal calls only: prospect, hiring and client calls stay in Google Calendar."}
      wide
      footer={
        <>
          {call ? (
            confirming ? (
              <button
                type="button"
                className={buttonClass("danger")}
                disabled={pending}
                onClick={() =>
                  run(
                    () => removeCall(call.id),
                    () => {
                      close();
                      onDeleted?.();
                    },
                  )
                }
              >
                Delete every day of it
              </button>
            ) : (
              <button type="button" className={buttonClass("ghost")} onClick={() => setConfirming(true)}>
                Delete…
              </button>
            )
          ) : null}
          <span className="flex-1" />
          <button type="button" className={buttonClass("ghost")} onClick={close}>
            Cancel
          </button>
          <button type="button" className={buttonClass("primary")} disabled={pending || !form.title.trim()} onClick={save}>
            {call ? "Save" : "Add call"}
          </button>
        </>
      }
    >
      <Label label="Name">
        <input
          autoFocus={!call}
          value={form.title}
          onChange={(event) => set("title", event.target.value)}
          maxLength={120}
          placeholder="Studio1 Eng Sync"
          className={inputClass()}
        />
      </Label>

      <Label label="Repeats" group>
        <Segmented
          label="Repeats"
          value={form.repeat}
          onChange={(repeat) => set("repeat", repeat)}
          options={[
            { value: "weekly", label: "Every week" },
            { value: "once", label: "Just once" },
          ]}
        />
      </Label>

      {form.repeat === "weekly" ? (
        <>
          <Label label="On" group>
            <div className="flex flex-wrap items-center gap-1.5">
              {WEEKDAYS.map((day) => {
                const on = form.days.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    aria-pressed={on}
                    aria-label={day.short}
                    title={day.short}
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border text-[12.5px] font-medium transition-colors sm:size-8",
                      on
                        ? "border-[var(--i-accent)] bg-[var(--i-accent-soft)] text-[var(--i-accent-text)]"
                        : "border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink-2)] hover:bg-[var(--i-hover)]",
                    )}
                  >
                    {day.short.slice(0, 2)}
                  </button>
                );
              })}
              <span className="mx-1 hidden h-5 w-px bg-[var(--i-line)] sm:block" />
              {DAY_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => set("days", [...preset.days])}
                  className="rounded-md px-1.5 py-1 text-[12px] text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </Label>
          <div className="grid gap-3 sm:grid-cols-3">
            <Label label="How often" group>
              <Select
                aria-label="How often"
                value={form.every_weeks}
                onChange={(value) => set("every_weeks", value)}
                options={[
                  { value: "1", label: "Every week" },
                  { value: "2", label: "Every other week" },
                ]}
                className="w-full"
              />
            </Label>
            <Label label="Starts" group>
              <DateField value={form.starts_on} onChange={(value) => set("starts_on", value)} required aria-label="Starts" />
            </Label>
            <Label label="Ends" hint="optional" group>
              <DateField
                value={form.ends_on}
                onChange={(value) => set("ends_on", value)}
                min={form.starts_on || undefined}
                placeholder="Keeps going"
                aria-label="Ends"
              />
            </Label>
          </div>
        </>
      ) : (
        <Label label="Day" group>
          <DateField value={form.starts_on} onChange={(value) => set("starts_on", value)} required aria-label="Day" className="sm:max-w-[14rem]" />
        </Label>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Label label="Starts at (IST)" group>
          <TimeField value={form.start_time} onChange={(value) => set("start_time", value)} around="15:00" placeholder="3:00 pm" aria-label="Starts at" />
        </Label>
        <Label label="Length" group>
          <Select
            aria-label="Length"
            value={form.minutes}
            onChange={(value) => set("minutes", value)}
            options={lengths.map((minutes) => ({ value: String(minutes), label: lengthLabel(minutes) }))}
            className="w-full"
          />
        </Label>
      </div>

      <Label label="Who's in" group>
        <label className="flex cursor-pointer items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.whole_team}
            onChange={(event) => set("whole_team", event.target.checked)}
            className="size-4 accent-[var(--i-accent)]"
          />
          The whole team <span className="text-[12px] text-[var(--i-faint)]">(everyone on the team list, new joiners too)</span>
        </label>
        {form.people.length ? (
          <ul className="flex flex-wrap gap-1.5" aria-label={form.whole_team ? "Also in" : "People"}>
            {form.people.map((email) => (
              <li
                key={email}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--i-line)] bg-[var(--i-panel)] pl-1 pr-1 text-[12.5px]"
              >
                <TeamAvatar name={nameOf(names, email)} email={email} size={24} />
                <span className="max-w-[12rem] truncate">{nameOf(names, email)}</span>
                {form.host === email ? <span className="text-[11px] text-[var(--i-muted)]">host</span> : null}
                <button
                  type="button"
                  aria-label={`Remove ${nameOf(names, email)}`}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      people: current.people.filter((value) => value !== email),
                      host: current.host === email ? "" : current.host,
                    }))
                  }
                  className="flex size-6 items-center justify-center rounded-full text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <SuggestInput
          value={adding}
          onChange={(value) => {
            // Picking a suggestion hands over a whole address: add it straight away.
            if (people.some((person) => person.email === value)) addPerson(value);
            else setAdding(value);
          }}
          options={suggestions}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if ((event.key === "Enter" || event.key === ",") && adding.trim()) {
              event.preventDefault();
              addPerson(adding);
            }
          }}
          onBlur={() => {
            if (isEmail(adding.trim())) addPerson(adding);
          }}
          placeholder={form.whole_team ? "Anyone else? Name or email" : "Add people: a name or an email"}
          aria-label="Add a person"
          className={inputClass()}
        />
      </Label>

      <div className="grid gap-3 sm:grid-cols-2">
        <Label label="Host" hint="optional" group>
          <Select
            aria-label="Host"
            value={form.host}
            onChange={(value) => set("host", value)}
            options={[{ value: "", label: "No host" }, ...form.people.map((email) => ({ value: email, label: nameOf(names, email) }))]}
            className="w-full"
          />
        </Label>
        <Label label="Meet or Zoom link" hint="optional">
          <input
            value={form.link}
            onChange={(event) => set("link", event.target.value)}
            inputMode="url"
            placeholder="https://meet.google.com/…"
            className={inputClass()}
          />
        </Label>
      </div>

      <Label label="What it's for" hint="optional">
        <textarea
          value={form.about}
          onChange={(event) => set("about", event.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="What we cover, what to bring."
          className={textareaClass}
        />
      </Label>
    </TeamDialog>
  );
}
