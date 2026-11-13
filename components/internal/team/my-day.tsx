"use client";

import { useRef, useState } from "react";
import {
  AirplaneTilt,
  ArrowSquareOut,
  Camera,
  Copy,
  FilePdf,
  Paperclip,
  Play,
  Plus,
  Receipt,
  Stop,
} from "@phosphor-icons/react";
import {
  addMyLeave,
  claimExpense,
  deleteMyDay,
  endDay,
  removeMyPhoto,
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
import { ClaimChip, DayChip, IdChip } from "@/components/internal/team/chips";
import { DayDialog, LeaveDialog } from "@/components/internal/team/day-dialogs";
import { Label, MonthSwitcher, TeamDialog, shrinkImage, useTeamAction } from "@/components/internal/team/kit";
import {
  CURRENCIES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  PERSON_KINDS,
  REIMBURSEMENT_SUBJECT_EXAMPLE,
  dayLabel,
  displayName,
  formatMinutes,
  formatMoney,
  isWeekend,
  leaveFor,
  lopFor,
  monthLabel,
  photoUrl,
  payslipPdfUrl,
  receiptUrl,
  shiftMonth,
  type AttendanceDay,
  type Payslip,
  type Reimbursement,
  type TeamPerson,
} from "@/lib/internal/team/shared";

const MAX_UPLOAD = MAX_UPLOAD_BYTES;

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
}: {
  person: TeamPerson;
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
  const [editing, setEditing] = useState<{ date: string; existing: AttendanceDay | null; pick?: boolean } | null>(null);

  const intern = person.kind === "intern";
  const editableFrom = `${shiftMonth(current, -1)}-01`;
  const canEdit = (date: string) => !intern && date >= editableFrom && date <= now.date;

  const worked = days.filter((day) => day.kind !== "leave");
  const workedDays = worked.reduce((sum, day) => sum + (day.kind === "half_day" ? 0.5 : 1), 0);
  const activeMinutes = worked.reduce((sum, day) => sum + (day.active_minutes ?? 0), 0);
  const leaveDays = days.reduce((sum, day) => sum + leaveFor(day), 0);
  const unpaid = days.reduce((sum, day) => sum + lopFor(day), 0);
  const name = displayName(person);

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
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
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setProfileOpen(true)} className={buttonClass("secondary")}>
            Edit profile
          </button>
          {!intern ? (
            <button type="button" onClick={() => setLeaveOpen(true)} className={buttonClass("secondary")}>
              <AirplaneTilt size={15} /> Take leave
            </button>
          ) : null}
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* Today */}
          <Card>
            <CardTitle
              action={
                today && canEdit(now.date) ? (
                  <button
                    type="button"
                    onClick={() => setEditing({ date: now.date, existing: today })}
                    className={buttonClass("ghost", "sm")}
                  >
                    Edit
                  </button>
                ) : null
              }
            >
              Today
            </CardTitle>
            <div className="p-5">
              {intern && !today ? (
                <p className="text-[13.5px] leading-relaxed text-[var(--i-muted)]">
                  Your reviewer{person.reviewer ? ` (${person.reviewer})` : ""} logs your days. Nothing&apos;s logged for
                  today yet.
                </p>
              ) : !today ? (
                <>
                  <p className="text-[13.5px] text-[var(--i-muted)]">
                    {isWeekend(now.date)
                      ? "It's the weekend. Log it only if you worked."
                      : "You haven't started your day yet."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
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
                  </div>
                </>
              ) : today.kind === "leave" ? (
                <div className="flex items-center gap-3">
                  <DayChip day={today} />
                  <p className="text-[13.5px] text-[var(--i-muted)]">
                    You&apos;re on leave today{today.note ? `: ${today.note}` : "."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <Stat label="Started" value={today.start_time ?? "—"} />
                    <Stat label="Ended" value={today.end_time ?? "—"} note={today.end_time ? undefined : "Still working"} />
                    <Stat
                      label="Active"
                      value={today.end_time ? formatMinutes(today.active_minutes) : formatMinutes(soFar)}
                      note={today.end_time ? (today.kind === "half_day" ? "Half day" : undefined) : "So far"}
                    />
                  </div>
                  {!today.end_time && !intern ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => endDay())}
                      className={cn(buttonClass("primary"), "mt-5 h-9 px-4")}
                    >
                      <Stop size={14} weight="fill" /> End my day
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </Card>

          {/* The month */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3">
              <h2 className="text-[13px] font-medium">Your days</h2>
              <div className="flex items-center gap-2">
                <MonthSwitcher month={month} current={current} hrefFor={(value) => `/internal/me?month=${value}`} />
                {!intern ? (
                  <button
                    type="button"
                    aria-label="Log a day"
                    title="Log a day"
                    onClick={() =>
                      setEditing({ date: month === current ? now.date : `${month}-01`, existing: null, pick: true })
                    }
                    className={cn(buttonClass("secondary", "sm"), "h-8 w-8 px-0")}
                  >
                    <Plus size={14} />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-[var(--i-line)] px-5 py-4 sm:grid-cols-4">
              <Stat label="Days worked" value={String(workedDays)} />
              <Stat label="Active hours" value={formatMinutes(activeMinutes)} />
              <Stat label="Leave" value={String(leaveDays)} note={leaveDays === 1 ? "day" : "days"} />
              <Stat label="Unpaid" value={String(unpaid)} note="Loss of pay days" />
            </div>
            {days.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-[var(--i-faint)]">
                Nothing logged in {monthLabel(month)}.
              </p>
            ) : (
              <ul>
                {[...days].reverse().map((day) => {
                  const editable = canEdit(day.day);
                  const row = (
                    <>
                      <span className="w-[5.5rem] shrink-0 text-[13px] tabular-nums">{dayLabel(day.day)}</span>
                      <span className="w-[7.5rem] shrink-0">
                        <DayChip day={day} />
                      </span>
                      <span className="hidden w-[7rem] shrink-0 text-[12.5px] tabular-nums text-[var(--i-muted)] sm:block">
                        {day.start_time ? `${day.start_time}–${day.end_time ?? "…"}` : ""}
                      </span>
                      <span className="w-[4.5rem] shrink-0 text-right text-[12.5px] tabular-nums">
                        {day.kind === "leave" ? "" : formatMinutes(day.active_minutes)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--i-faint)]">{day.note}</span>
                    </>
                  );
                  return (
                    <li key={day.id} className="border-b border-[var(--i-line)] last:border-b-0">
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
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {/* Payslips */}
          <Card>
            <CardTitle>Payslips</CardTitle>
            {payslips.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-[var(--i-faint)]">
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

          {/* Expenses */}
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
              <p className="px-5 pt-5 text-[13px] text-[var(--i-faint)]">
                Spent your own money on work? Claim it here; approved claims are paid with your next payslip.
              </p>
            ) : (
              <ul>
                {claims.slice(0, 20).map((claim) => (
                  <li key={claim.id} className="flex items-center gap-3 border-b border-[var(--i-line)] px-5 py-3">
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
            {inboundAddress ? <EmailHint address={inboundAddress} /> : claims.length === 0 ? <div className="h-5" /> : null}
          </Card>
        </div>
      </div>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} person={person} />
      <LeaveDialog open={leaveOpen} onOpenChange={setLeaveOpen} today={now.date} onSave={addMyLeave} />
      <ClaimDialog open={claimOpen} onOpenChange={setClaimOpen} today={now.date} />
      <DayDialog
        open={editing !== null}
        onOpenChange={(open) => (open ? null : setEditing(null))}
        date={editing?.date ?? now.date}
        existing={editing?.existing ?? null}
        pickDate={editing?.pick}
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
    <div className="m-5 mt-4 rounded-lg border border-dashed border-[var(--i-line-strong)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--i-muted)]">
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: TeamPerson;
}) {
  return open ? <ProfileDialogBody onOpenChange={onOpenChange} person={person} /> : null;
}

function ProfileDialogBody({ onOpenChange, person }: { onOpenChange: (open: boolean) => void; person: TeamPerson }) {
  const toast = useToast();
  const { pending, run } = useTeamAction();
  const [name, setName] = useState(person.name);
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
            disabled={pending || name.trim() === person.name}
            onClick={() => run(() => updateMyName(name))}
            className={buttonClass("primary")}
          >
            Save name
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
        <Label label="Employee ID" hint="set by an admin">
          <input value={person.employee_code ?? "Not set yet"} disabled className={inputClass()} />
        </Label>
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

  const submit = async () => {
    const form = new FormData();
    form.set("description", description);
    form.set("amount", amount);
    form.set("currency", currency);
    form.set("spent_on", spentOn);
    if (receipt) {
      const body = receipt.type === "application/pdf" ? receipt : await shrinkImage(receipt, 2000);
      if (body.size > MAX_UPLOAD) {
        toast("error", `The receipt is too big. Keep it under ${MAX_UPLOAD_LABEL}.`);
        return;
      }
      form.set("receipt", new File([body], receipt.name, { type: body.type || receipt.type }));
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
          <button type="button" disabled={pending} onClick={() => void submit()} className={buttonClass("primary")}>
            {pending ? "Sending…" : "Send for approval"}
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
          <input
            type="date"
            value={spentOn}
            max={today}
            onChange={(event) => setSpentOn(event.target.value)}
            className={inputClass()}
          />
        </Label>
      </div>
      <Label label="Receipt" hint="PDF or photo, optional">
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
          className="block w-full text-[12.5px] text-[var(--i-muted)] file:mr-3 file:h-8 file:rounded-lg file:border file:border-[var(--i-line)] file:bg-[var(--i-panel)] file:px-3 file:text-[12.5px] file:font-medium file:text-[var(--i-ink)] hover:file:bg-[var(--i-hover)]"
        />
      </Label>
    </TeamDialog>
  );
}
