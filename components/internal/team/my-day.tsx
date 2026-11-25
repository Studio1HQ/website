"use client";

import { useRef, useState, type ReactNode } from "react";
import { DateField } from "@/components/internal/pickers";
import {
  AirplaneTilt,
  ArrowSquareOut,
  Camera,
  Copy,
  FilePdf,
  Paperclip,
  PencilSimple,
  Play,
  Plus,
  Receipt,
  Stop,
} from "@/components/internal/icons";
import {
  addMyLeave as addMyLeaveAction,
  claimExpense as claimExpenseAction,
  startReceipt as startReceiptAction,
  deleteMyDay as deleteMyDayAction,
  endDay as endDayAction,
  removeMyPhoto as removeMyPhotoAction,
  updateMyEmployeeId as updateMyEmployeeIdAction,
  saveMyDay as saveMyDayAction,
  startDay as startDayAction,
  updateMyName as updateMyNameAction,
  uploadMyPhoto as uploadMyPhotoAction,
  withdrawClaim as withdrawClaimAction,
} from "@/app/internal/(dashboard)/me/actions";
import { cn } from "@/lib/utils";
import { Select } from "@/components/internal/select";
import { useToast } from "@/components/internal/toast";
import { Avatar, Card, CardTitle, buttonClass, inputClass } from "@/components/internal/ui";
import { ClaimChip, IdChip, dayText, dayTone, type Tone } from "@/components/internal/team/chips";
import { DayDialog, LeaveDialog } from "@/components/internal/team/day-dialogs";
import { Label, MonthSwitcher, TeamDialog, shrinkImage, useTeamAction } from "@/components/internal/team/kit";
import {
  CURRENCIES,
  MAX_SLOTS,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  PERSON_KINDS,
  MAX_RECEIPT_PDF_BYTES,
  MAX_RECEIPT_PDF_LABEL,
  REIMBURSEMENT_SUBJECT_EXAMPLE,
  datesOfMonth,
  dayLabel,
  displayName,
  formatMinutes,
  formatMoney,
  isWeekend,
  leaveFor,
  lopFor,
  minutesBetween,
  monthLabel,
  openSlot,
  photoUrl,
  payslipPdfUrl,
  receiptUrl,
  shiftMonth,
  slotsLabel,
  weekday,
  type AttendanceDay,
  type Payslip,
  type Reimbursement,
  type TeamPerson,
} from "@/lib/internal/team/shared";
import { guarded } from "@/components/internal/guarded";

// A save that never reached the server answers { ok: false } here, so the open form stays (guarded).
const addMyLeave = guarded(addMyLeaveAction);
const claimExpense = guarded(claimExpenseAction);
const startReceipt = guarded(startReceiptAction);
const deleteMyDay = guarded(deleteMyDayAction);
const endDay = guarded(endDayAction);
const removeMyPhoto = guarded(removeMyPhotoAction);
const updateMyEmployeeId = guarded(updateMyEmployeeIdAction);
const saveMyDay = guarded(saveMyDayAction);
const startDay = guarded(startDayAction);
const updateMyName = guarded(updateMyNameAction);
const uploadMyPhoto = guarded(uploadMyPhotoAction);
const withdrawClaim = guarded(withdrawClaimAction);

const MAX_UPLOAD = MAX_UPLOAD_BYTES;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** A logged day's cell in the month: a soft fill in the day's colour. */
const CELL_TONES: Record<Tone, string> = {
  emerald: "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-100 dark:ring-emerald-500/25",
  amber: "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/25",
  sky: "bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-100 dark:ring-sky-500/25",
  violet: "bg-violet-50 text-violet-900 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-100 dark:ring-violet-500/25",
  rose: "bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-100 dark:ring-rose-500/25",
  stone: "bg-stone-100 text-stone-800 ring-stone-200 dark:bg-stone-500/10 dark:text-stone-200 dark:ring-stone-500/25",
};

const LEGEND: { label: string; dot: string }[] = [
  { label: "Worked", dot: "bg-emerald-500" },
  { label: "Half day", dot: "bg-amber-500" },
  { label: "Leave", dot: "bg-sky-500" },
  { label: "Sick", dot: "bg-violet-500" },
  { label: "Unpaid", dot: "bg-rose-500" },
];

/** Under the date in a cell: the hours, or what kind of day off. */
function cellText(day: AttendanceDay, minutes: number | null) {
  if (day.kind === "leave") return day.leave_type === "sick" ? "Sick" : day.leave_type === "unpaid" ? "Unpaid" : "Leave";
  if (minutes) return formatMinutes(minutes);
  return day.kind === "half_day" ? "½ day" : "Worked";
}

/** A logged day in one line, for the cell's tooltip and screen readers. */
function describeDay(day: AttendanceDay) {
  return [
    dayLabel(day.day),
    dayText(day),
    day.slots.length ? slotsLabel(day.slots) : null,
    day.kind !== "leave" && day.active_minutes !== null ? `${formatMinutes(day.active_minutes)} active` : null,
    day.note || null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11.5px] text-[var(--i-muted)]">{label}</p>
      <p className="mt-0.5 truncate text-[15px] font-medium tabular-nums tracking-[-0.01em]">
        {value}
        {note ? <span className="ml-1 text-[11px] font-normal text-[var(--i-faint)]">{note}</span> : null}
      </p>
    </div>
  );
}

/** A small heading inside the pay card. */
function SubHead({ children }: { children: ReactNode }) {
  return <p className="px-4 pb-1 pt-3 text-[11.5px] font-medium text-[var(--i-muted)]">{children}</p>;
}

/**
 * The month as a calendar, Monday first: each logged day in its colour with
 * its hours. A day you can change opens its times on click.
 */
function MonthGrid({
  month,
  today,
  days,
  liveDate,
  liveMinutes,
  canEdit,
  onPick,
}: {
  month: string;
  today: string;
  days: AttendanceDay[];
  /** The day with a slot running: today, or yesterday past midnight. */
  liveDate: string;
  /** That day's minutes so far while a slot is running, else null. */
  liveMinutes: number | null;
  canEdit: (date: string) => boolean;
  onPick: (date: string, day: AttendanceDay | null) => void;
}) {
  const byDate = new Map(days.map((day) => [day.day, day]));
  const dates = datesOfMonth(month);
  const lead = (weekday(dates[0]) + 6) % 7;
  return (
    <div className="flex flex-1 flex-col px-3 pb-3 pt-2">
      <div aria-hidden className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] text-[var(--i-faint)]">
        {WEEKDAYS.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
      {/* Rows share whatever height the card has (wide screens), 40px at least. */}
      <ol className="grid flex-1 auto-rows-fr grid-cols-7 gap-1">
        {dates.map((date, index) => {
          const day = byDate.get(date) ?? null;
          const ahead = date > today;
          const missing = !day && !ahead && date < today && !isWeekend(date);
          const label = day
            ? describeDay(day)
            : `${dayLabel(date)} · ${ahead ? "Ahead" : missing ? "Not logged" : "Nothing logged"}`;
          const editable = canEdit(date);
          const body = (
            <>
              <span aria-hidden className={cn("text-[11.5px] leading-none tabular-nums", date === today && "font-semibold")}>
                {Number(date.slice(8))}
              </span>
              {day ? (
                <span aria-hidden className="truncate text-[10.5px] font-medium leading-none tabular-nums">
                  {cellText(day, date === liveDate && liveMinutes !== null ? liveMinutes : day.active_minutes)}
                </span>
              ) : missing ? (
                <span aria-hidden className="size-1 rounded-full bg-[var(--i-line-strong)]" />
              ) : null}
            </>
          );
          const cell = cn(
            "flex h-full min-h-10 w-full flex-col justify-between rounded-md p-1.5 text-left ring-1 ring-inset",
            day
              ? CELL_TONES[dayTone(day)]
              : isWeekend(date)
                ? "bg-[var(--i-sunken)] text-[var(--i-muted)] ring-transparent"
                : "text-[var(--i-ink-2)] ring-[var(--i-line)]",
            ahead && "opacity-40",
            date === today && "ring-2 ring-[var(--i-accent)]",
          );
          return (
            <li key={date} style={index === 0 && lead ? { gridColumnStart: lead + 1 } : undefined}>
              {editable ? (
                <button
                  type="button"
                  title={`${label} · click to change`}
                  aria-label={label}
                  onClick={() => onPick(date, day)}
                  className={cn(cell, "transition-[filter,box-shadow] hover:shadow-[var(--i-shadow-sm)] hover:brightness-[0.97]")}
                >
                  {body}
                </button>
              ) : (
                <div title={label} className={cell}>
                  <span className="sr-only">{label}</span>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function MyDay({
  person,
  greeting,
  now,
  month,
  current,
  today,
  carried = null,
  soFar,
  days,
  payslips,
  claims,
  inboundAddress,
  admin,
  tasks,
  calls,
}: {
  /** Today's tasks card, under the clock (left out before Tasks is set up). */
  tasks?: ReactNode;
  /** Today's calls card, under the tasks (left out when the person has none). */
  calls?: ReactNode;
  person: TeamPerson;
  /** Admins can set their own employee ID. */
  admin: boolean;
  greeting: string;
  now: { date: string; time: string };
  month: string;
  current: string;
  today: AttendanceDay | null;
  /** Yesterday's row, while a slot started then is still running past midnight. */
  carried?: AttendanceDay | null;
  /** Minutes so far on the day with a slot running, else null. */
  soFar: number | null;
  days: AttendanceDay[];
  payslips: Payslip[];
  claims: Reimbursement[];
  inboundAddress: string | null;
}) {
  const { pending, run } = useTeamAction();
  const [profileOpen, setProfileOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [editing, setEditing] = useState<{ date: string; existing: AttendanceDay | null } | null>(null);

  const intern = person.kind === "intern";
  const editableFrom = `${shiftMonth(current, -1)}-01`;
  const canEdit = (date: string) => !intern && date >= editableFrom && date <= now.date;

  // The day on the clock: today, or yesterday while its last slot is still
  // running past midnight. Its slots: one running (no end yet), or all ended
  // and room for another.
  const onClock = carried ?? today;
  const clockDate = onClock?.day ?? now.date;
  const slots = onClock?.slots ?? [];
  const running = openSlot(slots);

  const worked = days.filter((day) => day.kind !== "leave");
  const workedDays = worked.reduce((sum, day) => sum + (day.kind === "half_day" ? 0.5 : 1), 0);
  const activeMinutes = worked.reduce(
    (sum, day) => sum + ((day.day === clockDate && running ? soFar : day.active_minutes) ?? 0),
    0,
  );
  const leaveDays = days.reduce((sum, day) => sum + leaveFor(day), 0);
  const unpaid = days.reduce((sum, day) => sum + lopFor(day), 0);
  const name = displayName(person);

  // The clock: where the day stands, in a status line and a figure.
  const idle = "bg-[var(--i-line-strong)]";
  const clock = !onClock
    ? {
        dot: idle,
        status: "Not started",
        headline: intern ? "Nothing logged today" : "You haven't started yet",
        detail: intern
          ? `Your reviewer${person.reviewer ? ` (${person.reviewer})` : ""} logs your days.`
          : isWeekend(now.date)
            ? "It's the weekend. Log it only if you worked."
            : "Start your day when you sit down to work.",
      }
    : onClock.kind === "leave"
      ? { dot: "bg-sky-500", status: "On leave today", headline: dayText(onClock), detail: onClock.note || "Enjoy the day off." }
      : running
        ? {
            dot: "bg-emerald-500",
            status: "Working now",
            headline: formatMinutes(soFar),
            detail: `active so far · started ${onClock.start_time ?? running.start}${carried ? " yesterday" : ""}`,
          }
        : {
            dot: idle,
            status: onClock.kind === "half_day" ? "Half day logged" : "Day ended",
            headline: formatMinutes(onClock.active_minutes),
            detail: onClock.start_time ? `active · ${onClock.start_time}–${onClock.end_time ?? "…"}` : "No times logged for today.",
          };

  return (
    // Wide screens: one screen, no page scroll. The board takes the height
    // that's left (the main area's bottom padding is pulled back up), and
    // long lists scroll inside their own cards. Phones stack it all.
    <div className="xl:-mb-16">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 md:pr-24">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label="Edit your profile"
            className="group relative shrink-0 rounded-full"
          >
            <Avatar name={name} email={person.email} size={40} src={photoUrl(person)} />
            <span className="absolute -bottom-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-muted)] shadow-[var(--i-shadow-sm)] group-hover:text-[var(--i-ink)]">
              <Camera size={10} />
            </span>
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-medium leading-tight tracking-[-0.01em]">{greeting}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] text-[var(--i-muted)]">
              <span>{dayLabel(now.date, true)}</span>
              <span aria-hidden>·</span>
              {person.employee_code ? <IdChip>{person.employee_code}</IdChip> : <span>No employee ID yet</span>}
              <span>{[person.designation, PERSON_KINDS[person.kind]].filter(Boolean).join(" · ")}</span>
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setProfileOpen(true)} className={buttonClass("ghost", "sm")}>
          <PencilSimple size={13} /> Edit profile
        </button>
      </header>

      <div className="grid gap-3 xl:h-[clamp(34rem,calc(100dvh-8.5rem),50rem)] xl:grid-cols-[minmax(0,1fr)_27rem] 2xl:grid-cols-[minmax(0,1fr)_29rem]">
        {/* Today: the clock, then today's tasks and calls */}
        <div className="flex min-h-0 flex-col gap-3">
          <Card className="shrink-0 px-5 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 text-[12.5px] text-[var(--i-muted)]">
                  <span className="flex items-center gap-2 font-medium text-[var(--i-ink-2)]">
                    <span aria-hidden className={cn("size-2 shrink-0 rounded-full", clock.dot)} />
                    {clock.status}
                  </span>
                </p>
                <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-[24px] font-medium leading-none tabular-nums tracking-[-0.02em]">{clock.headline}</span>
                  <span className="text-[12.5px] text-[var(--i-muted)]">{clock.detail}</span>
                </p>
              </div>
              {intern ? null : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {!onClock ? (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => startDay())}
                        className={cn(buttonClass("accent"), "px-4")}
                      >
                        <Play size={14} weight="fill" /> Start my day
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing({ date: now.date, existing: null })}
                        className={buttonClass("secondary")}
                      >
                        Add times by hand
                      </button>
                    </>
                  ) : onClock.kind === "leave" ? null : running ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => endDay())}
                      className={cn(buttonClass("primary"), "px-4")}
                    >
                      <Stop size={14} weight="fill" /> {slots.length > 1 ? "End this slot" : "End my day"}
                    </button>
                  ) : slots.length < MAX_SLOTS ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => startDay())}
                      title={slots.length ? "Back at work? This adds a new slot from now." : undefined}
                      className={cn(buttonClass("secondary"), "px-4")}
                    >
                      <Play size={14} weight="fill" /> {slots.length ? "Start another slot" : "Start my day"}
                    </button>
                  ) : null}
                  {onClock && canEdit(clockDate) ? (
                    <button
                      type="button"
                      onClick={() => setEditing({ date: clockDate, existing: onClock })}
                      className={buttonClass("ghost")}
                    >
                      <PencilSimple size={14} /> {onClock.kind === "leave" ? "Change" : "Edit times"}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
            {slots.length > 1 ? (
              <ol aria-label={carried ? "Yesterday's slots" : "Today's slots"} className="mt-2.5 flex flex-wrap gap-1.5">
                {slots.map((slot, index) => (
                  <li
                    key={`${index}-${slot.start}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--i-sunken)] px-2 py-0.5 text-[11.5px] tabular-nums ring-1 ring-inset ring-[var(--i-line)]"
                  >
                    {slot.end ? null : <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />}
                    {slot.start}–{slot.end ?? "now"}
                    {slot.end ? (
                      <span className="text-[var(--i-faint)]">{formatMinutes(minutesBetween(slot.start, slot.end))}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}
          </Card>
          {tasks}
          {calls}
        </div>

        {/* The month and the money */}
        <div className="flex min-h-0 flex-col gap-3">
          <Card className="flex flex-col xl:flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--i-line)] px-4 py-2.5">
              <MonthSwitcher month={month} current={current} hrefFor={(value) => `/me?month=${value}`} />
              {!intern ? (
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setEditing({ date: month === current ? now.date : `${month}-01`, existing: null })}
                    className={buttonClass("ghost", "sm")}
                  >
                    <Plus size={13} /> Log a day
                  </button>
                  <button type="button" onClick={() => setLeaveOpen(true)} className={buttonClass("ghost", "sm")}>
                    <AirplaneTilt size={14} /> Leave
                  </button>
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-4 gap-3 border-b border-[var(--i-line)] px-4 py-2.5">
              <Stat label="Days worked" value={String(workedDays)} />
              <Stat label="Active" value={formatMinutes(activeMinutes)} />
              <Stat label="Leave" value={String(leaveDays)} />
              <Stat label="Unpaid" value={String(unpaid)} note={unpaid ? "LOP" : undefined} />
            </div>
            <MonthGrid
              month={month}
              today={now.date}
              days={days}
              liveDate={clockDate}
              liveMinutes={running ? soFar : null}
              canEdit={canEdit}
              onPick={(date, existing) => setEditing({ date, existing })}
            />
            <ul
              aria-label="Colours"
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--i-line)] px-4 py-2 text-[11px] text-[var(--i-muted)]"
            >
              {LEGEND.map((item) => (
                <li key={item.label} className="flex items-center gap-1.5">
                  <span aria-hidden className={cn("size-2 rounded-full", item.dot)} />
                  {item.label}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex min-h-0 shrink flex-col xl:max-h-[40%]">
            <CardTitle
              action={
                <button type="button" onClick={() => setClaimOpen(true)} className={buttonClass("secondary", "sm")}>
                  <Receipt size={14} /> Claim an expense
                </button>
              }
            >
              Pay and expenses
            </CardTitle>
            <div className="min-h-0 flex-1 overflow-y-auto pb-2">
              <SubHead>Payslips</SubHead>
              {payslips.length === 0 ? (
                <p className="px-4 pb-1 text-[12.5px] text-[var(--i-faint)]">They show up here, and in your inbox, once sent.</p>
              ) : (
                <ul>
                  {payslips.slice(0, 12).map((slip) => (
                    <li key={slip.id}>
                      <a
                        href={payslipPdfUrl(slip)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-[var(--i-hover)]"
                      >
                        <FilePdf size={16} className="shrink-0 text-[var(--i-accent)]" />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{monthLabel(slip.month)}</span>
                        <span className="text-[13px] tabular-nums">{formatMoney(slip.net)}</span>
                        <ArrowSquareOut size={13} className="shrink-0 text-[var(--i-faint)]" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <SubHead>Expenses</SubHead>
              {claims.length === 0 ? (
                <p className="px-4 pb-1 text-[12.5px] leading-relaxed text-[var(--i-faint)]">
                  Spent your own money on work? Claim it; approved claims are paid with your next payslip.
                </p>
              ) : (
                <ul>
                  {claims.slice(0, 20).map((claim) => (
                    <li key={claim.id} className="flex items-start gap-3 px-4 py-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{claim.description || "Expense"}</p>
                        <p className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-[var(--i-muted)]">
                          <span className="truncate">
                            {[
                              claim.spent_on ? dayLabel(claim.spent_on) : null,
                              claim.source === "email" ? "By email" : null,
                              claim.month && claim.status !== "rejected" ? `Paid with ${monthLabel(claim.month, true)}` : null,
                              claim.note || null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                          {receiptUrl(claim) ? (
                            <a
                              href={receiptUrl(claim)!}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Receipt"
                              title={claim.receipt_name ?? "Receipt"}
                              className="shrink-0 text-[var(--i-faint)] hover:text-[var(--i-ink)]"
                            >
                              <Paperclip size={13} />
                            </a>
                          ) : null}
                          {claim.status === "submitted" ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => run(() => withdrawClaim(claim.id))}
                              className="shrink-0 underline decoration-[var(--i-line-strong)] underline-offset-2 hover:text-[var(--i-ink)]"
                            >
                              Withdraw
                            </button>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[13px] tabular-nums">{formatMoney(claim.amount, claim.currency)}</span>
                        <ClaimChip status={claim.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {inboundAddress ? (
                <div className="mt-2 border-t border-[var(--i-line)]">
                  <EmailHint address={inboundAddress} />
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} person={person} admin={admin} />
      <LeaveDialog open={leaveOpen} onOpenChange={setLeaveOpen} today={now.date} onSave={addMyLeave} />
      <ClaimDialog open={claimOpen} onOpenChange={setClaimOpen} today={now.date} />
      <DayDialog
        open={editing !== null}
        onOpenChange={(open) => (open ? null : setEditing(null))}
        date={editing?.date ?? now.date}
        existing={editing?.existing ?? null}
        pickDate
        minDate={editableFrom}
        maxDate={now.date}
        onSave={saveMyDay}
        onDelete={deleteMyDay}
      />
    </div>
  );
}

function EmailHint({ address }: { address: string }) {
  const toast = useToast();
  return (
    <div className="px-5 py-4 text-[12.5px] leading-relaxed text-[var(--i-muted)]">
      Or email <span className="font-medium text-[var(--i-ink)]">{address}</span> with the receipt attached and the
      subject:
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(REIMBURSEMENT_SUBJECT_EXAMPLE).then(
            () => toast("success", "Subject copied"),
            () => toast("error", "Couldn't copy"),
          );
        }}
        className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-md bg-[var(--i-sunken)] px-2.5 py-1.5 text-left font-medium text-[var(--i-ink-2)] ring-1 ring-inset ring-[var(--i-line)] hover:text-[var(--i-ink)]"
      >
        <span className="truncate">{REIMBURSEMENT_SUBJECT_EXAMPLE}</span>
        <Copy size={13} className="shrink-0" />
      </button>
      <span className="mt-1 block text-[var(--i-faint)]">Put &ldquo;Amount: ₹…&rdquo; in the email if you can.</span>
    </div>
  );
}

function ProfileDialog({
  open,
  onOpenChange,
  person,
  admin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: TeamPerson;
  admin: boolean;
}) {
  return open ? <ProfileDialogBody onOpenChange={onOpenChange} person={person} admin={admin} /> : null;
}

function ProfileDialogBody({
  onOpenChange,
  person,
  admin,
}: {
  onOpenChange: (open: boolean) => void;
  person: TeamPerson;
  /** Admins set employee IDs, their own included. */
  admin: boolean;
}) {
  const toast = useToast();
  const { pending, run } = useTeamAction();
  const [name, setName] = useState(person.name);
  const [code, setCode] = useState(person.employee_code ?? "");
  const nameChanged = name.trim() !== person.name;
  const codeChanged = admin && code.trim() !== (person.employee_code ?? "");
  const save = () =>
    run(async () => {
      if (nameChanged) {
        const named = await updateMyName(name);
        if (!named.ok || !codeChanged) return named;
      }
      return codeChanged ? updateMyEmployeeId(code) : { ok: true };
    });
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const small = await shrinkImage(file, 800);
    if (small.size > MAX_UPLOAD) {
      toast("error", `That photo is too big. Try one under ${MAX_UPLOAD_LABEL}.`);
      return;
    }
    const form = new FormData();
    form.set("photo", new File([small], file.name, { type: small.type || file.type }));
    run(() => uploadMyPhoto(form));
  };

  return (
    <TeamDialog
      open
      onOpenChange={onOpenChange}
      title="Your profile"
      description="Your name and photo show across the dashboard and on your payslips."
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className={buttonClass("ghost")}>
            Close
          </button>
          <button
            type="button"
            disabled={pending || (!nameChanged && !codeChanged)}
            onClick={save}
            className={buttonClass("primary")}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <Avatar name={displayName({ ...person, name })} email={person.email} size={64} src={photoUrl(person)} />
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Profile photo"
            tabIndex={-1}
            className="sr-only"
            onChange={(event) => {
              void upload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
            className={buttonClass("secondary", "sm")}
          >
            <Camera size={14} /> {person.photo_path ? "Change photo" : "Add a photo"}
          </button>
          {person.photo_path ? (
            <button type="button" disabled={pending} onClick={() => run(() => removeMyPhoto())} className={buttonClass("ghost", "sm")}>
              Remove
            </button>
          ) : null}
        </div>
      </div>
      <Label label="Name">
        <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} className={inputClass()} />
      </Label>
      <div className="grid grid-cols-2 gap-3">
        {admin ? (
          <Label label="Employee ID">
            <input
              value={code}
              maxLength={24}
              placeholder="e.g. S1-001"
              autoComplete="off"
              onChange={(event) => setCode(event.target.value)}
              className={inputClass()}
            />
          </Label>
        ) : (
          <Label label="Employee ID" hint="set by an admin">
            <input value={person.employee_code ?? "Not set yet"} disabled className={inputClass()} />
          </Label>
        )}
        <Label label="Email">
          <input value={person.email} disabled className={inputClass()} />
        </Label>
      </div>
    </TeamDialog>
  );
}

function ClaimDialog({
  open,
  onOpenChange,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: string;
}) {
  return open ? <ClaimDialogBody onOpenChange={onOpenChange} today={today} /> : null;
}

function ClaimDialogBody({ onOpenChange, today }: { onOpenChange: (open: boolean) => void; today: string }) {
  const toast = useToast();
  const { pending, run } = useTeamAction();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>("INR");
  const [spentOn, setSpentOn] = useState(today);
  const [receipt, setReceipt] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);

  const submit = async () => {
    const form = new FormData();
    form.set("description", description);
    form.set("amount", amount);
    form.set("currency", currency);
    form.set("spent_on", spentOn);
    if (receipt) {
      // Some phones and mail apps hand over a PDF with no type at all.
      const pdf = receipt.type === "application/pdf" || /\.pdf$/i.test(receipt.name);
      const body = pdf ? receipt : await shrinkImage(receipt, 2000);
      if (body.size <= MAX_UPLOAD) {
        form.set("receipt", new File([body], receipt.name, { type: pdf ? "application/pdf" : body.type || receipt.type }));
      } else if (pdf && body.size <= MAX_RECEIPT_PDF_BYTES) {
        // Too big to send with the form: it goes straight to storage first.
        if (description.trim().length < 3 || !amount.trim()) {
          toast("error", description.trim().length < 3 ? "Say what the expense was for." : "Add the amount.");
          return;
        }
        setUploading(true);
        try {
          const start = await startReceipt();
          if (!start.ok) {
            toast("error", start.message);
            return;
          }
          const sent = await fetch(start.url, {
            method: "PUT",
            headers: { "content-type": "application/pdf" },
            body,
          });
          if (!sent.ok) {
            toast("error", "The receipt didn't upload. Try again.");
            return;
          }
          form.set("receipt_id", start.id);
          form.set("receipt_name", receipt.name);
        } catch {
          toast("error", "The receipt didn't upload. Check your connection and try again.");
          return;
        } finally {
          setUploading(false);
        }
      } else {
        toast(
          "error",
          pdf
            ? `The receipt is too big. Keep PDFs under ${MAX_RECEIPT_PDF_LABEL}.`
            : `The receipt is too big. Keep it under ${MAX_UPLOAD_LABEL}.`,
        );
        return;
      }
    }
    run(() => claimExpense(form), () => onOpenChange(false));
  };

  return (
    <TeamDialog
      open
      onOpenChange={onOpenChange}
      title="Claim an expense"
      description="An admin approves it, and it's paid with your next payslip."
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className={buttonClass("ghost")}>
            Cancel
          </button>
          <button type="button" disabled={pending || uploading} onClick={() => void submit()} className={buttonClass("primary")}>
            {uploading ? "Uploading the receipt…" : pending ? "Sending…" : "Send for approval"}
          </button>
        </>
      }
    >
      <Label label="What was it for?">
        <input
          value={description}
          maxLength={200}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Cab to the client office, domain renewal…"
          className={inputClass()}
        />
      </Label>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)] gap-3">
        <Label label="Amount">
          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="1250"
            className={inputClass()}
          />
        </Label>
        <Label label="Currency">
          <Select
            value={currency}
            onChange={setCurrency}
            options={CURRENCIES.map((code) => ({ value: code, label: code }))}
          />
        </Label>
        <Label label="Date">
          <DateField value={spentOn} max={today} onChange={setSpentOn} />
        </Label>
      </div>
      <Label label="Receipt" hint={`PDF (up to ${MAX_RECEIPT_PDF_LABEL}) or photo, optional`}>
        <input
          type="file"
          accept="application/pdf,.pdf,image/png,image/jpeg,image/webp"
          onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
          className="block w-full text-[12.5px] text-[var(--i-muted)] file:mr-3 file:h-8 file:rounded-lg file:border file:border-[var(--i-line)] file:bg-[var(--i-panel)] file:px-3 file:text-[12.5px] file:font-medium file:text-[var(--i-ink)] hover:file:bg-[var(--i-hover)]"
        />
      </Label>
    </TeamDialog>
  );
}
