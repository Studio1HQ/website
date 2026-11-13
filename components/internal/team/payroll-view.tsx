"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CaretLeft,
  CaretRight,
  Check,
  FilePdf,
  PaperPlaneTilt,
  Plus,
  Receipt,
  X,
} from "@phosphor-icons/react";
import { decideClaim, emailSlip, saveSlip } from "@/app/internal/(dashboard)/money/payroll/actions";
import type { PayrollRow } from "@/lib/internal/team/payroll";
import { LOP_PREFIX, isLopLine, lopAmount, lopLabel } from "@/lib/internal/team/payroll-math";
import {
  daysInMonth,
  displayName,
  formatMoney,
  monthLabel,
  parseAmount,
  payslipPdfUrl,
  photoUrl,
  receiptUrl,
  shiftMonth,
  sumLines,
  type PayLine,
  type Reimbursement,
  type TeamPerson,
} from "@/lib/internal/team/shared";
import { cn } from "@/lib/utils";
import { Select } from "@/components/internal/select";
import { useToast } from "@/components/internal/toast";
import {
  Avatar,
  Card,
  CardTitle,
  EmptyState,
  Notice,
  PageHeader,
  buttonClass,
  formatDate,
  inputClass,
  relativeDate,
} from "@/components/internal/ui";

const TONES = {
  emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/25",
  amber: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/25",
  sky: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/25",
  stone: "bg-[var(--i-sunken)] text-[var(--i-muted)] ring-[var(--i-line)]",
} as const;

function Pill({ tone, children, title }: { tone: keyof typeof TONES; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

function days(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** A button that asks once more before it acts ("Email 6" → "Click again to email 6"). */
function useConfirm(timeout = 5000) {
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(null), timeout);
    return () => clearTimeout(timer);
  }, [armed, timeout]);
  return { armed, arm: setArmed, reset: () => setArmed(null) };
}

function rowStatus(row: PayrollRow) {
  if (row.slip?.status === "sent") {
    return (
      <Pill tone="emerald" title={`Emailed ${formatDate(row.slip.sent_at)}`}>
        Sent {relativeDate(row.slip.sent_at)}
      </Pill>
    );
  }
  if (row.noSalary) return <Pill tone="stone">No salary set</Pill>;
  if (row.slip) return <Pill tone="amber">Draft</Pill>;
  if (row.check) {
    return (
      <Pill tone="amber" title={row.check}>
        Check first
      </Pill>
    );
  }
  return (
    <Pill tone="sky" title="Worked out from their salary lines; not saved yet">
      Ready
    </Pill>
  );
}

function pdfHref(row: PayrollRow, month: string) {
  return row.slip
    ? payslipPdfUrl(row.slip)
    : `/internal/money/payroll/draft/pdf?email=${encodeURIComponent(row.person.email)}&month=${month}`;
}

/* ------------------------------------------------------------------ page */

export function PayrollView({
  month,
  current,
  rows,
  waiting,
  people,
  mailer,
}: {
  month: string;
  current: string;
  rows: PayrollRow[];
  waiting: Reimbursement[];
  people: TeamPerson[];
  mailer: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<PayrollRow | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const confirm = useConfirm();

  // Rows that need a look first (someone who joined part-way through the
  // month) are left out of "email all" until their payslip is saved.
  const toSend = rows.filter((row) => !row.noSalary && !row.check && row.slip?.status !== "sent" && row.figures.net > 0);
  const toCheck = rows.filter((row) => !row.noSalary && row.check).length;
  const sent = rows.filter((row) => row.slip?.status === "sent").length;
  const totalNet = rows.filter((row) => !row.noSalary).reduce((sum, row) => sum + row.figures.net, 0);

  const sendAll = async () => {
    confirm.reset();
    const list = toSend.map((row) => row.person.email);
    let ok = 0;
    const failed: string[] = [];
    setProgress({ done: 0, total: list.length });
    for (const [index, email] of list.entries()) {
      try {
        const result = await emailSlip(email, month, false);
        if (result.ok && result.status === "sent") ok += 1;
        else if (!result.ok) failed.push(`${email}: ${result.message}`);
      } catch {
        failed.push(`${email}: the request failed`);
      }
      setProgress({ done: index + 1, total: list.length });
    }
    setProgress(null);
    router.refresh();
    if (failed.length === 0) toast("success", `Emailed ${ok} ${ok === 1 ? "payslip" : "payslips"}.`);
    else toast("error", `Emailed ${ok}; ${failed.length} failed. ${failed[0]}`);
  };

  const resend = async (row: PayrollRow) => {
    confirm.reset();
    setResending(row.person.email);
    const result = await emailSlip(row.person.email, month, true).catch(() => ({ ok: false as const, message: "The request failed." }));
    setResending(null);
    router.refresh();
    if (result.ok && result.status === "sent") toast("success", `Emailed ${displayName(row.person)}'s payslip again.`);
    else toast("error", "message" in result ? result.message : "Couldn't send it.");
  };

  const monthLink = (target: string) => `/internal/money/payroll?month=${target}`;

  return (
    <>
      <PageHeader
        title="Payroll"
        description="Payslips for everyone on the team list. Check the numbers, then email them all at once. Payslips carry no bank details."
        actions={
          <div className="flex items-center gap-1">
            <Link href={monthLink(shiftMonth(month, -1))} aria-label="Previous month" className={buttonClass("secondary", "sm")}>
              <CaretLeft size={13} />
            </Link>
            <span className="min-w-[8.5rem] text-center text-[13px] font-medium tabular-nums">{monthLabel(month)}</span>
            {month < current ? (
              <Link href={monthLink(shiftMonth(month, 1))} aria-label="Next month" className={buttonClass("secondary", "sm")}>
                <CaretRight size={13} />
              </Link>
            ) : (
              <span aria-hidden className={cn(buttonClass("secondary", "sm"), "pointer-events-none opacity-40")}>
                <CaretRight size={13} />
              </span>
            )}
            {month !== current ? (
              <Link href={monthLink(current)} className={cn(buttonClass("ghost", "sm"), "ml-1")}>
                This month
              </Link>
            ) : null}
          </div>
        }
      />

      {!mailer ? (
        <div className="mb-4">
          <Notice tone="warning">Email isn&apos;t set up here (RESEND_API_KEY), so payslips can be checked and previewed but not sent.</Notice>
        </div>
      ) : null}

      {toCheck ? (
        <div className="mb-4">
          <Notice tone="warning">
            {toCheck} {toCheck === 1 ? "person" : "people"} joined part-way through {monthLabel(month)}. Their payslips
            aren&apos;t emailed with the rest: open each one, put the pay right for the days worked, and save.
          </Notice>
        </div>
      ) : null}

      <Card className="mb-5">
        <CardTitle
          action={
            toSend.length ? (
              progress ? (
                <span className="text-[12.5px] text-[var(--i-muted)]">
                  Emailing {progress.done + 1 > progress.total ? progress.total : progress.done + 1} of {progress.total}…
                </span>
              ) : confirm.armed === "all" ? (
                <button type="button" onClick={sendAll} className={buttonClass("primary", "sm")}>
                  <PaperPlaneTilt size={13} /> Click again to email {toSend.length}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => confirm.arm("all")}
                  disabled={!mailer}
                  title={mailer ? undefined : "Email isn't set up"}
                  className={buttonClass("accent", "sm")}
                >
                  <PaperPlaneTilt size={13} /> Done — email {toSend.length} {toSend.length === 1 ? "payslip" : "payslips"}
                </button>
              )
            ) : rows.length && sent ? (
              <span className="inline-flex items-center gap-1 text-[12.5px] text-emerald-700 dark:text-emerald-300">
                <Check size={13} /> All emailed
              </span>
            ) : null
          }
        >
          Payslips
          <span className="ml-2 font-normal text-[var(--i-muted)]">
            {rows.length} {rows.length === 1 ? "person" : "people"} · {formatMoney(totalNet)} net · {sent} of {rows.length} emailed
          </span>
        </CardTitle>

        {rows.length === 0 ? (
          <EmptyState icon={<Receipt size={20} />} title="Nobody on the team list yet">
            Add employees and interns on People. Their payslips show up here.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--i-line)] text-[12px] text-[var(--i-muted)]">
                  <th className="px-5 py-2.5 font-normal">Person</th>
                  <th className="px-3 py-2.5 text-right font-normal">Paid days</th>
                  <th className="px-3 py-2.5 text-right font-normal">LOP</th>
                  <th className="px-3 py-2.5 text-right font-normal">Gross</th>
                  <th className="px-3 py-2.5 text-right font-normal">Deductions</th>
                  <th className="px-3 py-2.5 text-right font-normal">Claims</th>
                  <th className="px-3 py-2.5 text-right font-normal">Net</th>
                  <th className="px-3 py-2.5 font-normal">Status</th>
                  <th className="px-5 py-2.5" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const name = displayName(row.person);
                  return (
                    <tr
                      key={row.person.email}
                      onClick={() => setEditing(row)}
                      className="cursor-pointer border-b border-[var(--i-line)] last:border-b-0 hover:bg-[var(--i-hover)]"
                    >
                      <td className="px-5 py-2.5">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditing(row);
                          }}
                          className="flex items-center gap-2.5 text-left"
                        >
                          <Avatar name={name} email={row.person.email} size={28} src={photoUrl(row.person)} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{name}</span>
                            <span className="block truncate text-[12px] text-[var(--i-muted)]">
                              {[row.person.employee_code, row.person.kind === "intern" ? "Intern" : row.person.designation]
                                .filter(Boolean)
                                .join(" · ") || row.person.email}
                              {!row.person.active ? " · Left" : ""}
                            </span>
                          </span>
                        </button>
                      </td>
                      {row.noSalary ? (
                        <td colSpan={6} className="px-3 py-2.5 text-[12.5px] text-[var(--i-muted)]">
                          Add their salary lines to make a payslip.
                        </td>
                      ) : (
                        <>
                          <td className="px-3 py-2.5 text-right tabular-nums">{days(row.figures.paid_days)}</td>
                          <td
                            className={cn(
                              "px-3 py-2.5 text-right tabular-nums",
                              row.figures.lop_days ? "text-[var(--i-accent-text)]" : "text-[var(--i-faint)]",
                            )}
                          >
                            {days(row.figures.lop_days)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(sumLines(row.figures.earnings))}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(sumLines(row.figures.deductions))}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {row.figures.reimbursement ? formatMoney(row.figures.reimbursement) : <span className="text-[var(--i-faint)]">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatMoney(row.figures.net)}</td>
                        </>
                      )}
                      <td className="px-3 py-2.5">{rowStatus(row)}</td>
                      <td className="px-5 py-2.5" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {row.slip?.status === "sent" && mailer ? (
                            confirm.armed === row.person.email ? (
                              <button
                                type="button"
                                onClick={() => resend(row)}
                                disabled={resending !== null}
                                className={buttonClass("primary", "sm")}
                              >
                                Confirm
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => confirm.arm(row.person.email)}
                                disabled={resending !== null}
                                className={buttonClass("ghost", "sm")}
                              >
                                {resending === row.person.email ? "Sending…" : "Resend"}
                              </button>
                            )
                          ) : null}
                          {!row.noSalary ? (
                            <a
                              href={pdfHref(row, month)}
                              target="_blank"
                              rel="noopener"
                              title="Open the PDF"
                              aria-label={`Open ${name}'s payslip PDF`}
                              className={buttonClass("ghost", "sm")}
                            >
                              <FilePdf size={15} />
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ClaimsCard month={month} waiting={waiting} rows={rows} people={people} />

      {editing ? (
        <PayslipEditor
          key={`${editing.person.email}-${month}`}
          row={editing}
          month={month}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------------- editor */

type EditLine = { key: number; label: string; amount: string };

let lineKey = 0;
const toEdit = (lines: readonly PayLine[]): EditLine[] =>
  lines.map((line) => ({ key: ++lineKey, label: line.label, amount: String(line.amount) }));

function toLines(lines: readonly EditLine[]): PayLine[] {
  return lines
    .map((line) => ({ label: line.label.trim(), amount: parseAmount(line.amount) }))
    .filter((line): line is PayLine => Boolean(line.label) && line.amount !== null && !Number.isNaN(line.amount));
}

/** Adds, updates or removes the loss-of-pay line to match the days. */
function syncLop(earnings: readonly EditLine[], deductions: readonly EditLine[], month: string, lopDays: number) {
  const amount = lopAmount(sumLines(toLines(earnings)), month, lopDays);
  const others = deductions.filter((line) => !isLopLine({ label: line.label, amount: 0 }));
  const existing = deductions.find((line) => isLopLine({ label: line.label, amount: 0 }));
  return amount > 0
    ? [...others, { key: existing?.key ?? ++lineKey, label: lopLabel(lopDays), amount: String(amount) }]
    : others;
}

function LinesEditor({
  title,
  lines,
  onChange,
  placeholder,
}: {
  title: string;
  lines: EditLine[];
  onChange: (lines: EditLine[]) => void;
  placeholder: string;
}) {
  const update = (key: number, patch: Partial<EditLine>) =>
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)]">{title}</p>
      <div className="space-y-1.5">
        {lines.map((line) => {
          const bad = line.amount.trim() !== "" && Number.isNaN(parseAmount(line.amount) ?? 0);
          return (
            <div key={line.key} className="flex items-center gap-1.5">
              <input
                value={line.label}
                onChange={(event) => update(line.key, { label: event.target.value })}
                placeholder={placeholder}
                aria-label={`${title} name`}
                maxLength={60}
                className={cn(inputClass("sm"), "min-w-0 flex-1")}
              />
              <input
                value={line.amount}
                onChange={(event) => update(line.key, { amount: event.target.value })}
                inputMode="decimal"
                placeholder="0"
                aria-label={`${line.label || title} amount`}
                aria-invalid={bad || undefined}
                className={cn(inputClass("sm"), "w-28 text-right tabular-nums", bad && "border-rose-300 dark:border-rose-500/50")}
              />
              <button
                type="button"
                onClick={() => onChange(lines.filter((item) => item.key !== line.key))}
                aria-label={`Remove ${line.label || "line"}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--i-faint)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onChange([...lines, { key: ++lineKey, label: "", amount: "" }])}
        className={cn(buttonClass("ghost", "sm"), "mt-1.5 -ml-1")}
      >
        <Plus size={13} /> Add line
      </button>
    </div>
  );
}

function PayslipEditor({
  row,
  month,
  onClose,
  onSaved,
}: {
  row: PayrollRow;
  month: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [saving, startSaving] = useTransition();
  const name = displayName(row.person);
  const [earnings, setEarnings] = useState<EditLine[]>(() =>
    row.figures.earnings.length ? toEdit(row.figures.earnings) : [{ key: ++lineKey, label: "Basic", amount: "" }],
  );
  const [deductions, setDeductions] = useState<EditLine[]>(() => toEdit(row.figures.deductions));
  const [lop, setLop] = useState(String(row.figures.lop_days));
  const [saveDefaults, setSaveDefaults] = useState(row.person.earnings.length === 0);

  const lopDays = Number(lop);
  const lopValid = lop.trim() !== "" && Number.isFinite(lopDays) && lopDays >= 0 && lopDays <= daysInMonth(month);
  const gross = sumLines(toLines(earnings));
  const deducted = sumLines(toLines(deductions));
  const net = Math.max(0, Math.round((gross - deducted + row.figures.reimbursement) * 100) / 100);
  const otherCurrency = row.claims.filter((claim) => claim.status === "approved" && claim.currency !== "INR");

  const changeLop = (value: string) => {
    setLop(value);
    const daysValue = Number(value);
    if (value.trim() !== "" && Number.isFinite(daysValue) && daysValue >= 0 && daysValue <= daysInMonth(month)) {
      setDeductions((current) => syncLop(earnings, current, month, daysValue));
    }
  };
  const changeEarnings = (lines: EditLine[]) => {
    setEarnings(lines);
    if (lopValid && deductions.some((line) => line.label.startsWith(LOP_PREFIX))) {
      setDeductions((current) => syncLop(lines, current, month, lopDays));
    }
  };

  const save = () => {
    if (!lopValid) {
      toast("error", `Loss-of-pay days should be between 0 and ${daysInMonth(month)}.`);
      return;
    }
    startSaving(async () => {
      const result = await saveSlip({
        email: row.person.email,
        month,
        earnings: toLines(earnings),
        deductions: toLines(deductions),
        lopDays,
        saveDefaults,
      }).catch(() => ({ ok: false as const, message: "The request failed. Try again." }));
      if (result.ok) {
        toast("success", `Saved ${name}'s payslip.`);
        onSaved();
      } else {
        toast("error", result.message);
      }
    });
  };

  return (
    <Dialog.Root open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(760px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={name} email={row.person.email} size={32} src={photoUrl(row.person)} />
              <div className="min-w-0">
                <Dialog.Title className="truncate text-[15px] font-medium">{name}</Dialog.Title>
                <Dialog.Description className="truncate text-[12.5px] text-[var(--i-muted)]">
                  Payslip for {monthLabel(month)}
                  {row.person.employee_code ? ` · ${row.person.employee_code}` : " · No employee ID yet"}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            {row.slip?.status === "sent" ? (
              <Notice tone="warning">
                Emailed {formatDate(row.slip.sent_at)}. Saving changes marks it unsent, so you can email the new version.
              </Notice>
            ) : null}
            {row.check ? <Notice tone="warning">{row.check}</Notice> : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <LinesEditor title="Earnings" lines={earnings} onChange={changeEarnings} placeholder="Basic, HRA…" />
              <LinesEditor title="Deductions" lines={deductions} onChange={setDeductions} placeholder="Professional tax, TDS…" />
            </div>

            <div className="grid gap-4 rounded-xl border border-[var(--i-line)] p-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-[12px] text-[var(--i-muted)]">Loss-of-pay days</span>
                <input
                  value={lop}
                  onChange={(event) => changeLop(event.target.value)}
                  inputMode="decimal"
                  aria-invalid={!lopValid || undefined}
                  className={cn(inputClass("sm"), "w-28 tabular-nums")}
                />
                <span className="block text-[12px] text-[var(--i-faint)]">
                  Paid days: {lopValid ? days(daysInMonth(month) - lopDays) : "—"} of {daysInMonth(month)}.
                  {row.attendanceLop !== lopDays ? (
                    <>
                      {" "}Attendance shows {days(row.attendanceLop)} unpaid.{" "}
                      <button
                        type="button"
                        onClick={() => changeLop(String(row.attendanceLop))}
                        className="text-[var(--i-accent-text)] underline underline-offset-2"
                      >
                        Use that
                      </button>
                    </>
                  ) : null}
                </span>
              </label>
              <div className="space-y-1.5">
                <p className="text-[12px] text-[var(--i-muted)]">Expense claims</p>
                <p className="text-[13px] font-medium tabular-nums">{formatMoney(row.figures.reimbursement)}</p>
                {row.claims.length ? (
                  <ul className="space-y-0.5 text-[12px] text-[var(--i-muted)]">
                    {row.claims.map((claim) => (
                      <li key={claim.id} className="truncate">
                        {claim.description || "Expense"} · {formatMoney(claim.amount, claim.currency)}
                        {claim.status === "paid" ? " · paid" : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12px] text-[var(--i-faint)]">Approved claims for {monthLabel(month)} are added automatically.</p>
                )}
                {otherCurrency.length ? (
                  <p className="text-[12px] text-amber-700 dark:text-amber-300">
                    {otherCurrency.length} claim{otherCurrency.length === 1 ? " isn't" : "s aren't"} in rupees, so{" "}
                    {otherCurrency.length === 1 ? "it isn't" : "they aren't"} added. Convert and add an earning line if it&apos;s paid now.
                  </p>
                ) : null}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-xl bg-[var(--i-sunken)] p-4 text-[13px] sm:grid-cols-4">
              <div>
                <dt className="text-[12px] text-[var(--i-muted)]">Gross</dt>
                <dd className="tabular-nums">{formatMoney(gross)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--i-muted)]">Deductions</dt>
                <dd className="tabular-nums">{formatMoney(deducted)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--i-muted)]">Claims</dt>
                <dd className="tabular-nums">{formatMoney(row.figures.reimbursement)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--i-muted)]">Net pay</dt>
                <dd className="text-[16px] font-medium tabular-nums text-[var(--i-accent-text)]">{formatMoney(net)}</dd>
              </div>
            </dl>

            <label className="flex cursor-pointer items-start gap-2.5 text-[13px]">
              <input
                type="checkbox"
                checked={saveDefaults}
                onChange={(event) => setSaveDefaults(event.target.checked)}
                className="mt-0.5 size-4 accent-[var(--i-accent)]"
              />
              <span>
                Also use these lines for next months
                <span className="block text-[12px] text-[var(--i-muted)]">Loss of pay is left out; it&apos;s worked out each month.</span>
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--i-line)] px-5 py-3">
            <a
              href={pdfHref(row, month)}
              target="_blank"
              rel="noopener"
              className={cn(buttonClass("ghost"), "mr-auto")}
              title="Shows the saved version"
            >
              <FilePdf size={15} /> Preview PDF
            </a>
            <Dialog.Close asChild>
              <button type="button" className={buttonClass("ghost")}>
                Cancel
              </button>
            </Dialog.Close>
            <button type="button" onClick={save} disabled={saving} className={buttonClass("primary")}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ---------------------------------------------------------------- claims */

function ClaimRow({
  claim,
  person,
  month,
}: {
  claim: Reimbursement;
  person: TeamPerson | undefined;
  month: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(claim.amount === null ? "" : String(claim.amount));
  const [payMonth, setPayMonth] = useState(month);
  const name = person ? displayName(person) : claim.email;
  const receipt = receiptUrl(claim);
  const months = [shiftMonth(month, -1), month, shiftMonth(month, 1)];

  const decide = (decision: "approved" | "rejected") =>
    startTransition(async () => {
      const result = await decideClaim(claim.id, decision, payMonth, amount).catch(() => ({
        ok: false as const,
        message: "The request failed. Try again.",
      }));
      if (result.ok) {
        toast("success", decision === "approved" ? `Approved for the ${monthLabel(payMonth)} payslip.` : "Claim rejected.");
        router.refresh();
      } else {
        toast("error", result.message);
      }
    });

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-[var(--i-line)] px-5 py-3 last:border-b-0">
      <div className="flex min-w-[14rem] flex-1 items-center gap-3">
        <Avatar name={name} email={claim.email} size={32} src={photoUrl(person)} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">
            {name}
            <span className="font-normal text-[var(--i-muted)]"> · {claim.description || "No description"}</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-[var(--i-muted)]">
            <span>{claim.spent_on ? `Spent ${claim.spent_on}` : `Added ${relativeDate(claim.created_at)}`}</span>
            <Pill tone="stone">{claim.source === "email" ? "Email" : "Dashboard"}</Pill>
            {receipt ? (
              <a href={receipt} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-[var(--i-ink)]">
                Receipt
              </a>
            ) : (
              <span className="text-[var(--i-faint)]">No receipt</span>
            )}
            {claim.currency !== "INR" ? <span className="text-amber-700 dark:text-amber-300">{claim.currency}</span> : null}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          placeholder="Amount"
          aria-label={`Amount for ${name}'s claim`}
          className={cn(inputClass("xs"), "w-24 text-right tabular-nums")}
        />
        <Select
          value={payMonth}
          onChange={setPayMonth}
          aria-label="Payslip month"
          size="xs"
          className="w-auto"
          options={months.map((value) => ({ value, label: monthLabel(value, true) }))}
        />
        <button type="button" onClick={() => decide("approved")} disabled={pending} className={buttonClass("accent", "sm")}>
          <Check size={13} /> Approve
        </button>
        <button type="button" onClick={() => decide("rejected")} disabled={pending} className={buttonClass("ghost", "sm")}>
          Reject
        </button>
      </div>
    </li>
  );
}

function ClaimsCard({
  month,
  waiting,
  rows,
  people,
}: {
  month: string;
  waiting: Reimbursement[];
  rows: PayrollRow[];
  people: TeamPerson[];
}) {
  const byEmail = useMemo(() => new Map(people.map((person) => [person.email, person])), [people]);
  const approved = rows.flatMap((row) => row.claims);

  return (
    <Card>
      <CardTitle>
        Expense claims
        {waiting.length ? (
          <span className="ml-2 rounded-full bg-[var(--i-accent-soft)] px-1.5 text-[11px] font-medium leading-[18px] tabular-nums text-[var(--i-accent-text)]">
            {waiting.length} waiting
          </span>
        ) : null}
      </CardTitle>
      {waiting.length ? (
        <ul>
          {waiting.map((claim) => (
            <ClaimRow key={claim.id} claim={claim} person={byEmail.get(claim.email)} month={month} />
          ))}
        </ul>
      ) : (
        <p className="px-5 py-4 text-[13px] text-[var(--i-muted)]">
          No claims waiting. Employees add them on My day.
        </p>
      )}
      {approved.length ? (
        <div className="border-t border-[var(--i-line)] px-5 py-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)]">
            On the {monthLabel(month)} payslips
          </p>
          <ul className="space-y-1.5">
            {approved.map((claim) => {
              const person = byEmail.get(claim.email);
              return (
                <li key={claim.id} className="flex items-center gap-3 text-[13px]">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{person ? displayName(person) : claim.email}</span>
                    <span className="text-[var(--i-muted)]"> · {claim.description || "Expense"}</span>
                  </span>
                  <span className="tabular-nums">{formatMoney(claim.amount, claim.currency)}</span>
                  <Pill tone={claim.status === "paid" ? "emerald" : "amber"}>{claim.status === "paid" ? "Paid" : "Approved"}</Pill>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
