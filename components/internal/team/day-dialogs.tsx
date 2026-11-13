"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { buttonClass, inputClass } from "@/components/internal/ui";
import { Select } from "@/components/internal/select";
import { Label, Segmented, TeamDialog, useTeamAction } from "@/components/internal/team/kit";
import {
  ATTENDANCE_KINDS,
  LEAVE_TYPES,
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
 * Log or edit one day: worked (start, end, active hours), a half day, or a
 * leave. Used on My day for your own days and on People for interns.
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
  const [start, setStart] = useState(existing?.start_time ?? "");
  const [end, setEnd] = useState(existing?.end_time ?? "");
  const [active, setActive] = useState(hoursText(existing?.active_minutes ?? null));
  const [note, setNote] = useState(existing?.note ?? "");

  const span = minutesBetween(start || null, end || null);
  const save = () =>
    run(
      () =>
        onSave({
          day,
          kind,
          leave_type: kind === "work" ? null : leaveType,
          start_time: kind === "leave" ? null : start,
          end_time: kind === "leave" ? null : end,
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
          <button type="button" onClick={save} disabled={pending} className={buttonClass("primary")}>
            {pending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      {pickDate ? (
        <Label label="Date">
          <input
            type="date"
            value={day}
            max={maxDate}
            onChange={(event) => setDay(event.target.value)}
            className={inputClass()}
          />
        </Label>
      ) : null}
      <Segmented label="Day" value={kind} options={KIND_OPTIONS} onChange={setKind} />
      {kind !== "leave" ? (
        <div className="grid grid-cols-3 gap-3">
          <Label label="Start">
            <input type="time" value={start} onChange={(event) => setStart(event.target.value)} className={inputClass()} />
          </Label>
          <Label label="End">
            <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} className={inputClass()} />
          </Label>
          <Label label="Active hours">
            <input
              inputMode="decimal"
              value={active}
              placeholder={span !== null ? hoursText(span) : "7.5"}
              onChange={(event) => setActive(event.target.value)}
              className={inputClass()}
            />
          </Label>
        </div>
      ) : null}
      {kind !== "leave" ? (
        <p className="-mt-2 text-[12px] text-[var(--i-faint)]">
          {span !== null
            ? `${formatMinutes(span)} from start to end. Leave active hours blank to use that, or put less for breaks.`
            : "Active hours: the time you actually worked, like 7.5 or 7:30."}
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
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              if (to < event.target.value) setTo(event.target.value);
            }}
            className={inputClass()}
          />
        </Label>
        <Label label="To">
          <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className={inputClass()} />
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
