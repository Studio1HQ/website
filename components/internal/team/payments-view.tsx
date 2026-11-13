"use client";

import { useMemo, useState, useTransition } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import {
  ArrowCounterClockwise,
  Check,
  Copy,
  DotsThree,
  EnvelopeSimple,
  FilePdf,
  PencilSimple,
  Plus,
  Prohibit,
  Trash,
  WarningCircle,
  Wallet,
} from "@phosphor-icons/react";
import { setPaymentStatusAction } from "@/app/internal/(dashboard)/money/payments/actions";
import {
  INVOICE_SUBJECT,
  INVOICE_SUBJECT_EXAMPLE,
  PAYEE_KINDS,
  REIMBURSEMENT_SUBJECT_EXAMPLE,
  dayLabel,
  formatMoney,
  invoiceUrl,
  monthLabel,
  paymentStatusLabel,
  type Payee,
  type Payment,
} from "@/lib/internal/team/shared";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import {
  Avatar,
  Card,
  CardTitle,
  EmptyState,
  buttonClass,
  menuContentClass,
  menuItemClass,
} from "@/components/internal/ui";
import { Select } from "@/components/internal/select";
import {
  DeletePaymentDialog,
  MarkPaidDialog,
  PayeeDialog,
  PaymentDialog,
} from "@/components/internal/team/payments-dialogs";

type StatusTab = "due" | "paid" | "all";

type Open =
  | { type: "add" }
  | { type: "edit"; payment: Payment }
  | { type: "paid"; payment: Payment }
  | { type: "delete"; payment: Payment }
  | { type: "payee"; payee: Payee | null }
  | null;

const CHIP =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset";

function statusChip(payment: Payment) {
  if (payment.status === "paid") {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/25";
  }
  if (payment.status === "cancelled") {
    return "bg-stone-100 text-stone-700 ring-stone-200 dark:bg-stone-500/10 dark:text-stone-300 dark:ring-stone-500/25";
  }
  return payment.direction === "in"
    ? "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/25"
    : "bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-200 dark:ring-orange-500/25";
}

/** "₹45,000 + $1,200", or "—". */
function totalsText(byCurrency: Record<string, number>) {
  const parts = Object.entries(byCurrency)
    .filter(([, amount]) => amount > 0)
    .sort(([a], [b]) =>
      a === "INR" ? -1 : b === "INR" ? 1 : a.localeCompare(b),
    )
    .map(([currency, amount]) => formatMoney(amount, currency));
  return parts.length ? parts.join(" + ") : formatMoney(0);
}

function sumByCurrency(payments: Payment[]) {
  const totals: Record<string, number> = {};
  for (const payment of payments) {
    if (payment.amount)
      totals[payment.currency] =
        (totals[payment.currency] ?? 0) + payment.amount;
  }
  return totals;
}

function Summary({
  label,
  value,
  note,
  tone = "plain",
  active = false,
  onClick,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "plain" | "accent" | "warning";
  active?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <p className="truncate text-[12px] text-[var(--i-muted)] sm:text-[12.5px]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 truncate text-[20px] font-medium leading-tight tabular-nums tracking-[-0.015em] sm:text-[22px]",
          tone === "accent" && "text-[var(--i-accent-text)]",
          tone === "warning" &&
            value !== "0" &&
            "text-amber-700 dark:text-amber-300",
        )}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-[12px] text-[var(--i-faint)]">{note}</p>
    </>
  );
  const className = cn(
    "min-w-0 rounded-xl border bg-[var(--i-panel)] px-4 py-3 text-left shadow-[var(--i-shadow-sm)] sm:px-5",
    active
      ? "border-[var(--i-accent)] ring-1 ring-[var(--i-accent)]"
      : "border-[var(--i-line)]",
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(className, "hover:bg-[var(--i-hover)]")}
    >
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(
          () => toast("success", "Copied."),
          () => toast("error", "Couldn't copy. Select the text instead."),
        );
      }}
      aria-label={label}
      title={label}
      className="flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
    >
      <Copy size={14} />
    </button>
  );
}

export function PaymentsView({
  payments,
  payees,
  initialStatus,
  initialMonth,
  today,
  thisMonth,
  inboundAddress,
  mailerReady,
}: {
  payments: Payment[];
  payees: Payee[];
  initialStatus: StatusTab;
  initialMonth: string;
  today: string;
  thisMonth: string;
  inboundAddress: string | null;
  mailerReady: boolean;
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState<StatusTab>(initialStatus);
  const [month, setMonth] = useState(initialMonth);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [open, setOpen] = useState<Open>(null);

  // Keep the filters in the URL without a round trip, so a link reopens them.
  const remember = (next: { status?: StatusTab; month?: string }) => {
    const params = new URLSearchParams(window.location.search);
    const nextStatus = next.status ?? status;
    const nextMonth = next.month ?? month;
    if (nextStatus === "due") params.delete("status");
    else params.set("status", nextStatus);
    if (nextMonth) params.set("month", nextMonth);
    else params.delete("month");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  };

  const due = payments.filter((payment) => payment.status === "due");
  const toPay = due.filter((payment) => payment.direction === "out");
  const toReceive = due.filter((payment) => payment.direction === "in");
  const flagged = due.filter((payment) => payment.flagged);
  // Only emailed invoices get flagged, so the box stays hidden until the
  // email intake is set up (INBOUND_EMAIL_ADDRESS), unless something is.
  const showFlagged = Boolean(inboundAddress) || flagged.length > 0;

  const months = useMemo(
    () =>
      [
        ...new Set([
          thisMonth,
          ...payments.map((payment) => payment.month).filter(Boolean),
        ]),
      ]
        .sort()
        .reverse(),
    [payments, thisMonth],
  );
  const inMonth = month
    ? payments.filter((payment) => payment.month === month)
    : payments;
  const counts: Record<StatusTab, number> = {
    due: inMonth.filter((payment) => payment.status === "due").length,
    paid: inMonth.filter((payment) => payment.status === "paid").length,
    all: inMonth.length,
  };
  const shown = inMonth
    .filter((payment) => status === "all" || payment.status === status)
    .filter(
      (payment) =>
        !flaggedOnly || (payment.flagged && payment.status === "due"),
    );

  const changeStatus = (payment: Payment, next: "due" | "cancelled") =>
    startTransition(async () => {
      const result = await setPaymentStatusAction(payment.id, next);
      if (result.ok)
        toast(
          "success",
          next === "cancelled" ? "Cancelled." : "Moved back to To pay.",
        );
      else toast("error", result.message);
    });

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <div
          className={cn(
            "grid gap-2.5 sm:gap-4",
            showFlagged ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          <Summary
            label="To pay"
            value={totalsText(sumByCurrency(toPay))}
            note={`${toPay.length} ${toPay.length === 1 ? "payment" : "payments"}${
              toPay.some((payment) => payment.amount === null)
                ? " · some without an amount"
                : ""
            }`}
            tone="accent"
          />
          <Summary
            label="To receive"
            value={totalsText(sumByCurrency(toReceive))}
            note={`${toReceive.length} from sponsors`}
          />
          {showFlagged ? (
            <Summary
              label="Needs a look"
              value={String(flagged.length)}
              note={
                flaggedOnly
                  ? "Showing only these"
                  : "Unknown sender, no amount…"
              }
              tone="warning"
              active={flaggedOnly}
              onClick={
                flagged.length || flaggedOnly
                  ? () => {
                      const next = !flaggedOnly;
                      setFlaggedOnly(next);
                      if (next) {
                        setStatus("due");
                        setMonth("");
                        remember({ status: "due", month: "" });
                      }
                    }
                  : undefined
              }
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Status"
            className="inline-flex rounded-lg bg-[var(--i-sunken)] p-0.5 ring-1 ring-inset ring-[var(--i-line)]"
          >
            {(
              [
                ["due", "To pay"],
                ["paid", "Paid"],
                ["all", "All"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={status === key}
                onClick={() => {
                  setStatus(key);
                  remember({ status: key });
                }}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[12.5px] transition-colors",
                  status === key
                    ? "bg-[var(--i-panel)] font-medium text-[var(--i-ink)] shadow-[var(--i-shadow-sm)] ring-1 ring-[var(--i-line)]"
                    : "text-[var(--i-muted)] hover:text-[var(--i-ink)]",
                )}
              >
                {label}
                <span className="tabular-nums text-[var(--i-faint)]">
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>
          <Select
            aria-label="Month"
            size="sm"
            className="w-auto min-w-[9.5rem]"
            value={month}
            onChange={(next) => {
              setMonth(next);
              remember({ month: next });
            }}
            options={[
              { value: "", label: "All months" },
              ...months.map((key) => ({ value: key, label: monthLabel(key) })),
            ]}
          />
          <button
            type="button"
            onClick={() => setOpen({ type: "add" })}
            className={cn(buttonClass("primary"), "ml-auto")}
          >
            <Plus size={15} /> Add payment
          </button>
        </div>

        <Card>
          {shown.length === 0 ? (
            <EmptyState
              icon={<Wallet size={20} />}
              title={
                status === "due"
                  ? "Nothing to pay"
                  : status === "paid"
                    ? "Nothing paid yet"
                    : "No payments yet"
              }
            >
              {status === "due"
                ? inboundAddress
                  ? "Invoices emailed to the intake address show up here, or add one by hand."
                  : "Add one with Add payment when an invoice comes in."
                : month
                  ? `Nothing for ${monthLabel(month)}. Try All months.`
                  : "Payments show up here once they're added."}
            </EmptyState>
          ) : (
            <ul>
              {shown.map((payment) => {
                const invoice = invoiceUrl(payment);
                return (
                  <li
                    key={payment.id}
                    className={cn(
                      "flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-[var(--i-line)] px-4 py-3.5 last:border-b-0 sm:px-5",
                      payment.status === "cancelled" && "opacity-60",
                    )}
                  >
                    <Avatar
                      name={payment.name}
                      email={payment.email ?? payment.name}
                      size={32}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-medium">
                        <span className="truncate">
                          {payment.name || payment.email || "Unknown"}
                        </span>
                        {payment.code ? (
                          <span className="rounded-md bg-[var(--i-sunken)] px-1.5 py-px text-[11.5px] font-medium tracking-wide text-[var(--i-ink-2)] ring-1 ring-inset ring-[var(--i-line)]">
                            {payment.code}
                          </span>
                        ) : null}
                        <span className="text-[12px] font-normal text-[var(--i-muted)]">
                          {PAYEE_KINDS[payment.kind]}
                        </span>
                        {payment.source === "email" ? (
                          <span
                            className="inline-flex items-center gap-1 text-[12px] font-normal text-[var(--i-muted)]"
                            title={
                              payment.email_subject
                                ? `Subject: ${payment.email_subject}`
                                : "Came in by email"
                            }
                          >
                            <EnvelopeSimple size={12} /> By email
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-[12.5px] text-[var(--i-muted)]">
                        {payment.month ? monthLabel(payment.month) : "No month"}
                        {payment.description ? ` · ${payment.description}` : ""}
                      </p>
                      {payment.flagged && payment.status === "due" ? (
                        <p className="mt-1 flex items-start gap-1.5 text-[12px] leading-snug text-amber-800 dark:text-amber-300">
                          <WarningCircle
                            size={14}
                            weight="fill"
                            className="mt-px shrink-0"
                          />
                          {payment.flagged}
                        </p>
                      ) : null}
                      {payment.status === "paid" ? (
                        <p className="mt-1 text-[12px] text-[var(--i-faint)]">
                          {payment.direction === "in" ? "Received" : "Paid"}{" "}
                          {payment.paid_on ? dayLabel(payment.paid_on) : ""}
                          {payment.paid_by
                            ? ` by ${payment.paid_by.split("@")[0]}`
                            : ""}
                          {payment.paid_reference
                            ? ` · Ref ${payment.paid_reference}`
                            : ""}
                        </p>
                      ) : null}
                      {payment.note ? (
                        <p className="mt-1 text-[12px] text-[var(--i-muted)]">
                          {payment.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={cn(
                          "text-[14px] font-medium tabular-nums",
                          payment.amount === null && "text-[var(--i-faint)]",
                        )}
                      >
                        {payment.amount === null
                          ? "No amount"
                          : formatMoney(payment.amount, payment.currency)}
                      </span>
                      <span className={cn(CHIP, statusChip(payment))}>
                        {paymentStatusLabel(payment)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:ml-1">
                      {invoice ? (
                        <a
                          href={invoice}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={
                            payment.invoice_name
                              ? `Open ${payment.invoice_name}`
                              : "Open the invoice"
                          }
                          aria-label="Open the invoice"
                          className="flex size-8 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                        >
                          <FilePdf size={17} />
                        </a>
                      ) : null}
                      {payment.status === "due" ? (
                        <button
                          type="button"
                          onClick={() => setOpen({ type: "paid", payment })}
                          className={buttonClass("secondary", "sm")}
                        >
                          <Check size={14} />{" "}
                          {payment.direction === "in"
                            ? "Received"
                            : "Mark paid"}
                        </button>
                      ) : null}
                      <Menu.Root>
                        <Menu.Trigger asChild>
                          <button
                            type="button"
                            aria-label={`More for ${payment.name}`}
                            className="flex size-8 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                          >
                            <DotsThree size={18} weight="bold" />
                          </button>
                        </Menu.Trigger>
                        <Menu.Portal>
                          <Menu.Content
                            align="end"
                            sideOffset={6}
                            className={menuContentClass}
                          >
                            {/* A paid one stays as it was paid: move it back first. */}
                            {payment.status !== "paid" ? (
                              <Menu.Item
                                className={menuItemClass}
                                onSelect={() =>
                                  setOpen({ type: "edit", payment })
                                }
                              >
                                <PencilSimple size={15} /> Edit
                              </Menu.Item>
                            ) : null}
                            {payment.status === "due" ? (
                              <Menu.Item
                                className={menuItemClass}
                                onSelect={() =>
                                  changeStatus(payment, "cancelled")
                                }
                              >
                                <Prohibit size={15} /> Cancel it
                              </Menu.Item>
                            ) : (
                              <Menu.Item
                                className={menuItemClass}
                                onSelect={() => changeStatus(payment, "due")}
                              >
                                <ArrowCounterClockwise size={15} /> Move back to{" "}
                                {payment.direction === "in"
                                  ? "To receive"
                                  : "To pay"}
                              </Menu.Item>
                            )}
                            {/* Paid ones stay on the record; anything else, emailed junk included, can go. */}
                            {payment.status !== "paid" ? (
                              <Menu.Item
                                className={cn(
                                  menuItemClass,
                                  "text-rose-700 dark:text-rose-300",
                                )}
                                onSelect={() =>
                                  setOpen({ type: "delete", payment })
                                }
                              >
                                <Trash size={15} /> Delete…
                              </Menu.Item>
                            ) : null}
                          </Menu.Content>
                        </Menu.Portal>
                      </Menu.Root>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="min-w-0 space-y-4">
        <Card>
          <CardTitle
            action={
              <button
                type="button"
                onClick={() => setOpen({ type: "payee", payee: null })}
                className={buttonClass("ghost", "sm")}
              >
                <Plus size={14} /> Add
              </button>
            }
          >
            Payees
          </CardTitle>
          {payees.length === 0 ? (
            <p className="px-5 py-4 text-[12.5px] leading-relaxed text-[var(--i-muted)]">
              Add writers, hackathon partners and sponsors with a short code
              (like WR-07), so payments are quick to add and easy to tell apart.
            </p>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto py-1">
              {payees.map((payee) => (
                <li key={payee.id}>
                  <button
                    type="button"
                    onClick={() => setOpen({ type: "payee", payee })}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-5 py-2 text-left hover:bg-[var(--i-hover)]",
                      !payee.active && "opacity-55",
                    )}
                  >
                    <span className="w-[4.5rem] shrink-0 truncate text-[11.5px] font-medium tracking-wide text-[var(--i-ink-2)]">
                      {payee.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px]">
                        {payee.name}
                      </span>
                      <span className="block truncate text-[12px] text-[var(--i-muted)]">
                        {PAYEE_KINDS[payee.kind]}
                        {payee.email ? ` · ${payee.email}` : ""}
                        {payee.active ? "" : " · inactive"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* The email intake (lib/internal/team/inbound.ts) is off until
            INBOUND_EMAIL_ADDRESS is set: payments are added by hand. */}
        {inboundAddress ? (
          <Card>
            <CardTitle>How invoices arrive</CardTitle>
            <div className="space-y-3.5 px-5 py-4 text-[12.5px] leading-relaxed text-[var(--i-ink-2)]">
              <div>
                <p className="mb-1 text-[var(--i-muted)]">
                  They email the invoice to
                </p>
                <div className="flex items-center gap-1 rounded-lg bg-[var(--i-sunken)] py-1 pl-3 pr-1 ring-1 ring-inset ring-[var(--i-line)]">
                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--i-ink)]">
                    {inboundAddress}
                  </span>
                  <CopyButton value={inboundAddress} label="Copy the address" />
                </div>
              </div>
              <div>
                <p className="mb-1 text-[var(--i-muted)]">With this subject</p>
                <div className="flex items-center gap-1 rounded-lg bg-[var(--i-sunken)] py-1 pl-3 pr-1 ring-1 ring-inset ring-[var(--i-line)]">
                  <code
                    className="min-w-0 flex-1 truncate font-sans text-[var(--i-ink)]"
                    title={INVOICE_SUBJECT}
                  >
                    {INVOICE_SUBJECT_EXAMPLE}
                  </code>
                  <CopyButton
                    value={INVOICE_SUBJECT_EXAMPLE}
                    label="Copy the subject"
                  />
                </div>
              </div>
              <ul className="space-y-1.5">
                <li>Attach the invoice as a PDF.</li>
                <li>
                  Put the total in the email if you can, like{" "}
                  <span className="font-medium">Amount: ₹12,500</span>.
                </li>
                <li>
                  It lands on the payee by their code or email. Anything else is
                  flagged for a check.
                </li>
                <li className="text-[var(--i-muted)]">
                  Employees claim expenses the same way (
                  <span className="whitespace-nowrap">
                    {REIMBURSEMENT_SUBJECT_EXAMPLE}
                  </span>
                  ); those go to Payroll.
                </li>
              </ul>
            </div>
          </Card>
        ) : null}
      </div>

      {open?.type === "add" ? (
        <PaymentDialog
          open
          onOpenChange={(next) => !next && setOpen(null)}
          payment={null}
          payees={payees}
          thisMonth={month || thisMonth}
        />
      ) : null}
      {open?.type === "edit" ? (
        <PaymentDialog
          key={open.payment.id}
          open
          onOpenChange={(next) => !next && setOpen(null)}
          payment={open.payment}
          payees={payees}
          thisMonth={thisMonth}
        />
      ) : null}
      {open?.type === "paid" ? (
        <MarkPaidDialog
          key={open.payment.id}
          open
          onOpenChange={(next) => !next && setOpen(null)}
          payment={open.payment}
          today={today}
          mailerReady={mailerReady}
        />
      ) : null}
      {open?.type === "delete" ? (
        <DeletePaymentDialog
          key={open.payment.id}
          open
          onOpenChange={(next) => !next && setOpen(null)}
          payment={open.payment}
        />
      ) : null}
      {open?.type === "payee" ? (
        <PayeeDialog
          key={open.payee?.id ?? "new"}
          open
          onOpenChange={(next) => !next && setOpen(null)}
          payee={open.payee}
        />
      ) : null}
    </div>
  );
}
