"use client";

import { useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { DateField } from "@/components/internal/pickers";
import { TimeField } from "@/components/internal/team/time-field";
import { cn } from "@/lib/utils";
import { buttonClass, inputClass } from "@/components/internal/ui";
import { Select } from "@/components/internal/select";
import { Label, Segmented, TeamDialog, useTeamAction } from "@/components/internal/team/kit";
import {
  ATTENDANCE_KINDS,
  LEAVE_TYPES,
  MAX_SLOTS,
  dayLabel,
  formatMinutes,
  minutesBetween,
  type AttendanceDay,
  type AttendanceKind,
  type LeaveType,
  type TeamResult,
} from "@/lib/internal/team/shared";

const KIND_OPTIONS = (Object.keys(ATTENDANCE_KINDS) as AttendanceKind[]).map((value) => ({
  value,
  label: ATTENDANCE_KINDS[value],
}));
const LEAVE_OPTIONS = (Object.keys(LEAVE_TYPES) as LeaveType[]).map((value) => ({ value, label: LEAVE_TYPES[value] }));

function hoursText(minutes: number | null) {
  if (minutes === null) return "";
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/0$/, "");
}

/**
 * Log or edit one day: worked (one or more slots, each a start and an end,
 * and active hours), a half day, or a leave. Used on My day for your own days and on People for interns.
 */
type DayDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  existing: AttendanceDay | null;
  /** Whose day it is, when it isn't your own. */
  who?: string;
  /** Show a date field (for logging a past day). */
  pickDate?: boolean;
  maxDate?: string;
  onSave: (input: Record<string, unknown>) => Promise<TeamResult>;
  onDelete?: (date: string) => Promise<TeamResult>;
};

export function DayDialog(props: DayDialogProps) {
  // Mounted only while open, so each opening starts from the saved values.
  return props.open ? <DayDialogBody key={`${props.date}-${props.existing?.updated_at ?? ""}`} {...props} /> : null;
}

function DayDialogBody({
  open,
  onOpenChange,
  date,
  existing,
  who,
  pickDate = false,
  maxDate,
  onSave,
  onDelete,
}: DayDialogProps) {
  const { pending, run } = useTeamAction();
  const [day, setDay] = useState(date);
  const [kind, setKind] = useState<AttendanceKind>(existing?.kind ?? "work");
  const [leaveType, setLeaveType] = useState<LeaveType>(existing?.leave_type ?? "paid");
  // The stretches worked, one row each; `id` keeps a row's boxes its own
  // when another row is removed.
  const [slots, setSlots] = useState(() => {
    const saved = existing?.slots.length ? existing.slots : [{ start: "", end: null }];
    return saved.map((slot, index) => ({ id: index, start: slot.start, end: slot.end ?? "" }));
  });
  const [nextId, setNextId] = useState(slots.length);
  const setTime = (id: number, part: "start" | "end", value: string) =>
    setSlots((rows) => rows.map((row) => (row.id === id ? { ...row, [part]: value } : row)));
  // Times typed in a way that can't be read ("<row>-start"): Save waits
  // until they're fixed.
  const [bad, setBad] = useState<string[]>([]);
  const flag = (key: string, invalid: boolean) =>
    setBad((keys) => (invalid ? (keys.includes(key) ? keys : [...keys, key]) : keys.filter((item) => item !== key)));
  const timesBad = kind !== "leave" && bad.length > 0;
  // A third, narrow column for the remove buttons once there's more than one row.
  const slotGrid = slots.length > 1 ? "grid-cols-[1fr_1fr_2rem]" : "grid-cols-2";
  const [active, setActive] = useState(hoursText(existing?.active_minutes ?? null));
  const [note, setNote] = useState(existing?.note ?? "");

  // The time in the slots, once every one that's filled in has both ends.
  const filled = slots.filter((slot) => slot.start || slot.end);
  const span =
    filled.length && filled.every((slot) => slot.start && slot.end)
      ? filled.reduce((sum, slot) => sum + (minutesBetween(slot.start, slot.end) ?? 0), 0)
      : null;
  const save = () =>
    run(
      () =>
        onSave({
          day,
          kind,
          leave_type: kind === "work" ? null : leaveType,
          slots: kind === "leave" ? [] : slots.map((slot) => ({ start: slot.start, end: slot.end })),
          active_hours: kind === "leave" ? "" : active,
          note,
        }),
      () => onOpenChange(false),
    );

  return (
    <TeamDialog
      open={open}
      onOpenChange={onOpenChange}
      title={existing ? "Edit day" : "Log a day"}
      description={`${who ? `${who} · ` : ""}${dayLabel(day, true)}`}
      footer={
        <>
          {existing && onDelete ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => onDelete(existing.day), () => onOpenChange(false))}
              className={cn(buttonClass("danger"), "mr-auto")}
            >
              Remove
            </button>
          ) : null}
          <button type="button" onClick={() => onOpenChange(false)} className={buttonClass("ghost")}>
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || timesBad}
            title={timesBad ? "Fix the time marked in red first" : undefined}
            className={buttonClass("primary")}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      {pickDate ? (
        <Label label="Date">
          <DateField value={day} max={maxDate} required onChange={setDay} />
        </Label>
      ) : null}
      <Segmented
        label="Day"
        value={kind}
        options={KIND_OPTIONS}
        onChange={(next) => {
          setKind(next);
          // The time boxes go with Leave and come back clean. Between Worked
          // and Half day they stay, unreadable text and all, so their flags
          // stay too and Save keeps waiting.
          if (next === "leave") setBad([]);
        }}
      />
      {kind !== "leave" ? (
        <div role="group" aria-label="Slots" className="space-y-2">
          <div className={cn("grid gap-x-3 text-[12px] text-[var(--i-muted)]", slotGrid)}>
            <span>Start</span>
            <span>End</span>
          </div>
          {slots.map((slot, index) => {
            const before = slots[index - 1];
            const nth = slots.length > 1 ? `Slot ${index + 1} ` : "";
            return (
              <div key={slot.id} className={cn("grid items-center gap-x-3", slotGrid)}>
                <TimeField
                  aria-label={`${nth}start`}
                  value={slot.start}
                  onChange={(value) => setTime(slot.id, "start", value)}
                  around={before?.end || "09:00"}
                  onInvalidChange={(invalid) => flag(`${slot.id}-start`, invalid)}
                />
                <TimeField
                  aria-label={`${nth}end`}
                  value={slot.end}
                  onChange={(value) => setTime(slot.id, "end", value)}
                  placeholder={index === 0 ? "6:00 pm" : ""}
                  around={slot.start || "18:00"}
                  onInvalidChange={(invalid) => flag(`${slot.id}-end`, invalid)}
                />
                {slots.length > 1 ? (
                  <button
                    type="button"
                    aria-label={`Remove slot ${index + 1}`}
                    title="Remove this slot"
                    onClick={() => {
                      setSlots((rows) => rows.filter((row) => row.id !== slot.id));
                      setBad((keys) => keys.filter((key) => !key.startsWith(`${slot.id}-`)));
                    }}
                    className={cn(buttonClass("ghost"), "size-8 px-0")}
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            );
          })}
          {slots.length < MAX_SLOTS ? (
            <button
              type="button"
              onClick={() => {
                setSlots((rows) => [...rows, { id: nextId, start: "", end: "" }]);
                setNextId(nextId + 1);
              }}
              title="For a day worked in parts, like a morning and an evening"
              className={cn(buttonClass("ghost", "sm"), "-ml-2")}
            >
              <Plus size={13} /> Add another slot
            </button>
          ) : (
            <p className="text-[12px] text-[var(--i-faint)]">That&apos;s the most slots a day takes.</p>
          )}
        </div>
      ) : null}
      {kind !== "leave" ? (
        <Label
          label="Active hours"
          hint={
            span !== null
              ? `${formatMinutes(span)} ${filled.length > 1 ? `across ${filled.length} slots` : "from start to end"}`
              : "the time you actually worked"
          }
        >
          <input
            inputMode="decimal"
            value={active}
            placeholder={span !== null ? hoursText(span) : "7.5"}
            onChange={(event) => setActive(event.target.value)}
            className={inputClass()}
          />
        </Label>
      ) : null}
      {kind !== "leave" ? (
        <p className="-mt-2 text-[12px] text-[var(--i-faint)]">
          {span !== null
            ? "Leave it blank to use that, or put less for breaks inside a slot."
            : "Like 7.5 or 7:30. Leave it blank to use the time in your slots."}
        </p>
      ) : null}
      {kind !== "work" ? (
        <Label group label={kind === "half_day" ? "The other half is" : "Leave type"}>
          <Segmented label="Leave type" value={leaveType} options={LEAVE_OPTIONS} onChange={setLeaveType} />
        </Label>
      ) : null}
      <Label label="Note" hint="optional">
        <input
          value={note}
          maxLength={300}
          onChange={(event) => setNote(event.target.value)}
          placeholder={kind === "work" ? "What you worked on, or where from" : "Reason"}
          className={inputClass()}
        />
      </Label>
    </TeamDialog>
  );
}

/** Leave over one or more days; weekends in a range are skipped. */
type LeaveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: string;
  who?: string;
  /** Whom to pick from, when logging leave for someone else. */
  people?: { email: string; name: string }[];
  onSave: (input: Record<string, unknown>) => Promise<TeamResult>;
};

export function LeaveDialog(props: LeaveDialogProps) {
  return props.open ? <LeaveDialogBody {...props} /> : null;
}

function LeaveDialogBody({ open, onOpenChange, today, who, people, onSave }: LeaveDialogProps) {
  const { pending, run } = useTeamAction();
  const [email, setEmail] = useState(people?.[0]?.email ?? "");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [leaveType, setLeaveType] = useState<LeaveType>("paid");
  const [note, setNote] = useState("");

  return (
    <TeamDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Take leave"
      description={who ? `For ${who}` : "Weekends inside the dates are skipped."}
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className={buttonClass("ghost")}>
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () => onSave({ email, from, to: to < from ? from : to, leave_type: leaveType, note }),
                () => onOpenChange(false),
              )
            }
            className={buttonClass("primary")}
          >
            {pending ? "Saving…" : "Add leave"}
          </button>
        </>
      }
    >
      {people ? (
        <Label label="Who">
          <Select
            value={email}
            onChange={setEmail}
            options={people.map((person) => ({ value: person.email, label: person.name }))}
          />
        </Label>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Label label="From">
          <DateField
            value={from}
            required
            onChange={(next) => {
              setFrom(next);
              if (to < next) setTo(next);
            }}
          />
        </Label>
        <Label label="To">
          <DateField value={to} min={from} required onChange={setTo} />
        </Label>
      </div>
      <Label group label="Leave type">
        <Segmented label="Leave type" value={leaveType} options={LEAVE_OPTIONS} onChange={setLeaveType} />
      </Label>
      <Label label="Note" hint="optional">
        <input
          value={note}
          maxLength={300}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Reason, or who covers for you"
          className={inputClass()}
        />
      </Label>
    </TeamDialog>
  );
}
