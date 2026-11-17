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
} from "@phosphor-icons/react";
import {
  addMyLeave,
  claimExpense,
  startReceipt,
  deleteMyDay,
  endDay,
  removeMyPhoto,
  updateMyEmployeeId,
  saveMyDay,
  startDay,
  updateMyName,
  uploadMyPhoto,
  withdrawClaim,
} from "@/app/internal/(dashboard)/me/actions";
import { cn } from "@/lib/utils";
import { Select } from "@/components/internal/select";
import { useToast } from "@/components/internal/toast";
import { Avatar, Card, CardTitle, buttonClass, inputClass } from "@/components/internal/ui";
import { ClaimChip, DayChip, IdChip, dayText } from "@/components/internal/team/chips";
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
  type AttendanceDay,
  type Payslip,
  type Reimbursement,
  type TeamPerson,
} from "@/lib/internal/team/shared";

const MAX_UPLOAD = MAX_UPLOAD_BYTES;

/** One of the page's three parts: a heading, a line on what it holds, its actions. */
function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-9 first:mt-0">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-medium leading-tight tracking-[-0.01em]">{title}</h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--i-muted)]">{hint}</p>
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[12px] text-[var(--i-muted)]">{label}</p>
      <p className="mt-1 text-[20px] font-medium leading-none tabular-nums tracking-[-0.01em]">{value}</p>
      {note ? <p className="mt-1 truncate text-[11.5px] text-[var(--i-faint)]">{note}</p> : null}
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
  soFar,
  days,
  payslips,
  claims,
  inboundAddress,
  admin,
  tasks,
  calls,
}: {
  /** Today's task cards, under the clock (left out before Tasks is set up). */
  tasks?: ReactNode;
  /** Today's calls, beside the tasks (left out when the person has none). */
  calls?: ReactNode;
  person: TeamPerson;
  /** Admins can set their own employee ID. */
  admin: boolean;
  greeting: string;
  now: { date: string; time: string };
  month: string;
  current: string;
  today: AttendanceDay | null;
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

  // Today's slots: one running (no end yet), or all ended and room for another.
  const slots = today?.slots ?? [];
  const running = openSlot(slots);

  const worked = days.filter((day) => day.kind !== "leave");
  const workedDays = worked.reduce((sum, day) => sum + (day.kind === "half_day" ? 0.5 : 1), 0);
  const activeMinutes = worked.reduce((sum, day) => sum + (day.active_minutes ?? 0), 0);
  const leaveDays = days.reduce((sum, day) => sum + leaveFor(day), 0);
  const unpaid = days.reduce((sum, day) => sum + lopFor(day), 0);
  const name = displayName(person);

  // The clock card: where the day stands, in one line, a figure and a detail.
  const idle = "bg-[var(--i-line-strong)]";
  const clock = !today
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
    : today.kind === "leave"
      ? { dot: "bg-sky-500", status: "On leave today", headline: dayText(today), detail: today.note || "Enjoy the day off." }
      : running
        ? {
            dot: "bg-emerald-500",
            status: "Working now",
            headline: formatMinutes(soFar),
            detail: `Active so far · started ${today.start_time ?? running.start}`,
          }
        : {
            dot: idle,
            status: today.kind === "half_day" ? "Half day logged" : "Day ended",
            headline: formatMinutes(today.active_minutes),
            detail: today.start_time
              ? `Active · ${today.start_time}–${today.end_time ?? "…"}`
              : "No times logged for today.",
          };

  return (
    <>
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label="Edit your profile"
            className="group relative shrink-0 rounded-full"
          >
            <Avatar name={name} email={person.email} size={48} src={photoUrl(person)} />
            <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-muted)] shadow-[var(--i-shadow-sm)] group-hover:text-[var(--i-ink)]">
              <Camera size={11} />
            </span>
          </button>
          <div className="min-w-0">
            <p className="text-[12.5px] text-[var(--i-muted)]">{dayLabel(now.date, true)}</p>
            <h1 className="truncate text-[22px] font-medium leading-tight tracking-[-0.01em]">{greeting}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px] text-[var(--i-muted)]">
              {person.employee_code ? <IdChip>{person.employee_code}</IdChip> : <span>No employee ID yet ·</span>}
              <span>
                {[person.designation, PERSON_KINDS[person.kind]].filter(Boolean).join(" · ")}
              </span>
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setProfileOpen(true)} className={buttonClass("secondary")}>
          Edit profile
        </button>
      </header>

      {/* 1. Today: the clock, then today's tasks and calls */}
      <Section title="Today" hint="Your hours, tasks and calls for the day.">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[12.5px] text-[var(--i-muted)]">
                <span aria-hidden className={cn("size-2 shrink-0 rounded-full", clock.dot)} />
                {clock.status}
              </p>
              <p className="mt-2 text-[26px] font-medium leading-none tabular-nums tracking-[-0.02em]">
                {clock.headline}
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--i-muted)]">{clock.detail}</p>
            </div>
            {intern ? null : (
              <div className="flex flex-wrap items-center gap-2">
                {!today ? (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => startDay())}
                      className={cn(buttonClass("accent"), "h-9 px-4")}
                    >
                      <Play size={14} weight="fill" /> Start my day
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing({ date: now.date, existing: null })}
                      className={cn(buttonClass("secondary"), "h-9")}
                    >
                      Add times by hand
                    </button>
                  </>
                ) : today.kind === "leave" ? null : running ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => endDay())}
                    className={cn(buttonClass("primary"), "h-9 px-4")}
                  >
                    <Stop size={14} weight="fill" /> {slots.length > 1 ? "End this slot" : "End my day"}
                  </button>
                ) : slots.length < MAX_SLOTS ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => startDay())}
                    title={slots.length ? "Back at work? This adds a new slot from now." : undefined}
                    className={cn(buttonClass("secondary"), "h-9 px-4")}
                  >
                    <Play size={14} weight="fill" /> {slots.length ? "Start another slot" : "Start my day"}
                  </button>
                ) : null}
                {today && canEdit(now.date) ? (
                  <button
                    type="button"
                    onClick={() => setEditing({ date: now.date, existing: today })}
                    className={cn(buttonClass("ghost"), "h-9")}
                  >
                    <PencilSimple size={14} /> {today.kind === "leave" ? "Change" : "Edit times"}
                  </button>
                ) : null}
              </div>
            )}
          </div>
          {slots.length > 1 ? (
            <ol
              aria-label="Today's slots"
              className="mt-4 flex flex-wrap gap-1.5 border-t border-[var(--i-line)] pt-4"
            >
              {slots.map((slot, index) => (
                <li
                  key={`${index}-${slot.start}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--i-sunken)] px-2.5 py-1 text-[12px] tabular-nums ring-1 ring-inset ring-[var(--i-line)]"
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

        {tasks || calls ? (
          <div
            className={cn(
              "mt-4 grid items-start gap-4",
              tasks && calls ? "lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]" : null,
            )}
          >
            {tasks}
            {calls}
          </div>
        ) : null}
      </Section>

      {/* 2. The month: totals, then every logged day */}
      <Section
        title={month === current ? "This month" : monthLabel(month)}
        hint="The days you've logged, your leave and your hours."
        action={
          <>
            <MonthSwitcher month={month} current={current} hrefFor={(value) => `/internal/me?month=${value}`} />
            {!intern ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditing({ date: month === current ? now.date : `${month}-01`, existing: null })}
                  className={buttonClass("secondary")}
                >
                  <Plus size={14} /> Log a day
                </button>
                <button type="button" onClick={() => setLeaveOpen(true)} className={buttonClass("secondary")}>
                  <AirplaneTilt size={15} /> Take leave
                </button>
              </>
            ) : null}
          </>
        }
      >
        <Card>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 px-5 py-4 sm:grid-cols-4">
            <Stat label="Days worked" value={String(workedDays)} />
            <Stat label="Active hours" value={formatMinutes(activeMinutes)} />
            <Stat label="Leave days" value={String(leaveDays)} />
            <Stat label="Unpaid days" value={String(unpaid)} note={unpaid ? "Loss of pay" : undefined} />
          </div>
          {days.length === 0 ? (
            <p className="border-t border-[var(--i-line)] px-5 py-8 text-center text-[13px] text-[var(--i-faint)]">
              Nothing logged in {monthLabel(month)}.
            </p>
          ) : (
            <>
              <div
                aria-hidden
                className="hidden items-center gap-3 border-y border-[var(--i-line)] bg-[var(--i-sunken)] px-5 py-2 text-[11.5px] text-[var(--i-muted)] sm:flex"
              >
                <span className="w-[5.5rem] shrink-0">Day</span>
                <span className="w-[7.5rem] shrink-0">Logged as</span>
                <span className="w-[10rem] shrink-0">Times</span>
                <span className="w-[4.5rem] shrink-0 text-right">Active</span>
                <span className="min-w-0 flex-1 pl-3">Note</span>
              </div>
              <ul className="border-t border-[var(--i-line)] sm:border-t-0">
                {[...days].reverse().map((day) => {
                  const editable = canEdit(day.day);
                  const row = (
                    <>
                      <span className="w-[5.5rem] shrink-0 text-[13px] tabular-nums">
                        {dayLabel(day.day)}
                      </span>
                      <span className="w-[7.5rem] shrink-0">
                        <DayChip day={day} />
                      </span>
                      <span
                        title={day.slots.length > 1 ? slotsLabel(day.slots) : undefined}
                        className="hidden w-[10rem] shrink-0 truncate text-[12.5px] tabular-nums text-[var(--i-muted)] sm:block"
                      >
                        {day.start_time ? `${day.start_time}–${day.end_time ?? "now"}` : ""}
                        {day.slots.length > 1 ? (
                          <span className="text-[var(--i-faint)]"> · {day.slots.length} slots</span>
                        ) : null}
                      </span>
                      <span className="ml-auto w-[4.5rem] shrink-0 text-right text-[12.5px] tabular-nums sm:ml-0">
                        {day.kind === "leave"
                          ? ""
                          : formatMinutes(day.day === now.date && running ? soFar : day.active_minutes)}
                      </span>
                      <span className="hidden min-w-0 flex-1 truncate pl-3 text-[12.5px] text-[var(--i-faint)] sm:block">
                        {day.note}
                      </span>
                      {editable ? (
                        <span className="flex shrink-0 items-center gap-1 text-[12px] text-[var(--i-muted)]">
                          <PencilSimple size={13} /> <span className="hidden sm:inline">Edit</span>
                        </span>
                      ) : null}
                    </>
                  );
                  return (
                    <li
                      key={day.id}
                      className={cn(
                        "border-b border-[var(--i-line)] last:border-b-0",
                        day.day === now.date ? "bg-[var(--i-hover)]" : null,
                      )}
                    >
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => setEditing({ date: day.day, existing: day })}
                          className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-[var(--i-hover)]"
                        >
                          {row}
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 px-5 py-2.5">{row}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>
      </Section>

      {/* 3. Money: payslips and expense claims */}
      <Section title="Pay and expenses" hint="Your payslips, and money you spent on work.">
        <div className="grid items-start gap-4 md:grid-cols-2">
          <Card>
            <CardTitle action={<span aria-hidden className="h-8" />}>Payslips</CardTitle>
            {payslips.length === 0 ? (
              <p className="px-5 py-5 text-[13px] leading-relaxed text-[var(--i-faint)]">
                Your payslips show up here, and in your inbox, once they&apos;re sent.
              </p>
            ) : (
              <ul>
                {payslips.slice(0, 12).map((slip) => (
                  <li key={slip.id} className="border-b border-[var(--i-line)] last:border-b-0">
                    <a
                      href={payslipPdfUrl(slip)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--i-hover)]"
                    >
                      <FilePdf size={18} className="shrink-0 text-[var(--i-accent)]" />
                      <span className="min-w-0 flex-1 text-[13px] font-medium">{monthLabel(slip.month)}</span>
                      <span className="text-[13px] tabular-nums">{formatMoney(slip.net)}</span>
                      <ArrowSquareOut size={14} className="text-[var(--i-faint)]" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle
              action={
                <button type="button" onClick={() => setClaimOpen(true)} className={buttonClass("secondary", "sm")}>
                  <Receipt size={14} /> Claim an expense
                </button>
              }
            >
              Expenses
            </CardTitle>
            {claims.length === 0 ? (
              <p className="px-5 py-5 text-[13px] leading-relaxed text-[var(--i-faint)]">
                Spent your own money on work? Claim it here; approved claims are paid with your next payslip.
              </p>
            ) : (
              <ul>
                {claims.slice(0, 20).map((claim) => (
                  <li
                    key={claim.id}
                    className="flex items-center gap-3 border-b border-[var(--i-line)] px-5 py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{claim.description || "Expense"}</p>
                      <p className="truncate text-[12px] text-[var(--i-muted)]">
                        {[
                          claim.spent_on ? dayLabel(claim.spent_on) : null,
                          claim.source === "email" ? "By email" : null,
                          claim.month && claim.status !== "rejected" ? `Paid with ${monthLabel(claim.month, true)}` : null,
                          claim.note || null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {receiptUrl(claim) ? (
                      <a
                        href={receiptUrl(claim)!}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Receipt"
                        title={claim.receipt_name ?? "Receipt"}
                        className="text-[var(--i-faint)] hover:text-[var(--i-ink)]"
                      >
                        <Paperclip size={15} />
                      </a>
                    ) : null}
                    <span className="text-[13px] tabular-nums">{formatMoney(claim.amount, claim.currency)}</span>
                    <ClaimChip status={claim.status} />
                    {claim.status === "submitted" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => withdrawClaim(claim.id))}
                        className={buttonClass("ghost", "sm")}
                      >
                        Withdraw
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {inboundAddress ? (
              <div className="border-t border-[var(--i-line)]">
                <EmailHint address={inboundAddress} />
              </div>
            ) : null}
          </Card>
        </div>
      </Section>

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
    </>
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
