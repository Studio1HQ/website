import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Paperclip, Receipt, Wallet, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Avatar, Card, CardTitle, Notice, PageHeader } from "@/components/internal/ui";
import { Chip } from "@/components/internal/team/chips";
import { requireStaff } from "@/lib/internal/session";
import { listPayments, paymentTotals } from "@/lib/internal/team/payments";
import { payrollMonth } from "@/lib/internal/team/payroll";
import { listReimbursements } from "@/lib/internal/team/reimbursements";
import {
  PAYEE_KINDS,
  displayName,
  formatMoney,
  invoiceUrl,
  istNow,
  monthLabel,
  monthOf,
  photoUrl,
  type Payment,
} from "@/lib/internal/team/shared";

export const metadata: Metadata = { title: "Money" };

function money(byCurrency: Record<string, number>) {
  const entries = Object.entries(byCurrency);
  return entries.length ? entries.map(([currency, amount]) => formatMoney(amount, currency)).join(" · ") : "₹0";
}

function Kpi({ label, value, note, href }: { label: string; value: string; note: string; href: string }) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full px-4 py-3.5 transition-colors group-hover:bg-[var(--i-hover)] sm:px-5 sm:py-4">
        <p className="truncate text-[12.5px] text-[var(--i-muted)]">{label}</p>
        <p className="mt-2 truncate text-[22px] font-medium leading-none tabular-nums tracking-[-0.015em] sm:text-[26px]">{value}</p>
        <p className="mt-2 truncate text-[12px] text-[var(--i-faint)]">{note}</p>
      </Card>
    </Link>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <li className="flex items-center gap-3 border-b border-[var(--i-line)] px-5 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">
          {payment.name || payment.email || "Unknown"}
          {payment.code ? <span className="ml-1.5 font-normal text-[var(--i-faint)]">{payment.code}</span> : null}
        </p>
        <p className="truncate text-[12px] text-[var(--i-muted)]">
          {[PAYEE_KINDS[payment.kind], monthLabel(payment.month, true), payment.description || null].filter(Boolean).join(" · ")}
        </p>
        {payment.flagged ? (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-amber-700 dark:text-amber-300">
            <WarningCircle size={12} className="shrink-0" /> {payment.flagged}
          </p>
        ) : null}
      </div>
      {invoiceUrl(payment) ? (
        <a
          href={invoiceUrl(payment)!}
          target="_blank"
          rel="noreferrer"
          aria-label="Invoice"
          title={payment.invoice_name ?? "Invoice"}
          className="text-[var(--i-faint)] hover:text-[var(--i-ink)]"
        >
          <Paperclip size={15} />
        </a>
      ) : null}
      <span className="text-[13px] tabular-nums">{formatMoney(payment.amount, payment.currency)}</span>
    </li>
  );
}

/**
 * The Money section's front page: what's left to pay, sponsor money to come
 * in, this month's payroll and the expense claims waiting. Admins only.
 */
export default async function MoneyPage() {
  await requireStaff("admin");
  const month = monthOf(istNow().date);
  const [totals, due, payroll, claims] = await Promise.all([
    paymentTotals(),
    listPayments({ status: "due" }),
    payrollMonth(month),
    listReimbursements({ status: ["submitted"] }),
  ]);

  if (!totals.ok && totals.missing) {
    return (
      <>
        <PageHeader title="Money" />
        <Notice tone="warning">
          Run the team migration (supabase/migrations/20261113130000_team_and_payments.sql) in Supabase first.
        </Notice>
      </>
    );
  }

  const toPay = due.ok ? due.payments.filter((payment) => payment.direction === "out") : [];
  const toReceive = due.ok ? due.payments.filter((payment) => payment.direction === "in") : [];
  const needsLook = toPay.filter((payment) => payment.flagged || payment.amount === null);
  const rows = payroll.ok ? payroll.rows.filter((row) => !row.noSalary) : [];
  const sent = rows.filter((row) => row.slip?.status === "sent").length;
  const payrollNet = rows.reduce((sum, row) => sum + row.figures.net, 0);
  const waitingClaims = claims.ok ? claims.items : [];

  return (
    <>
      <PageHeader
        title="Money"
        description="Payroll for the team, payments to writers and partners, and sponsor money still to come in."
      />
      {!totals.ok || !due.ok || !payroll.ok ? (
        <div className="mb-5">
          <Notice tone="error">Some numbers couldn&apos;t be loaded. The server log has the details.</Notice>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <Kpi
          label="To pay"
          value={totals.ok ? money(totals.toPayByCurrency) : "—"}
          note={totals.ok ? `${totals.toPay} ${totals.toPay === 1 ? "payment" : "payments"}${totals.flagged ? ` · ${totals.flagged} need a look` : ""}` : ""}
          href="/internal/money/payments"
        />
        <Kpi
          label="To receive"
          value={totals.ok ? money(totals.toReceiveByCurrency) : "—"}
          note={totals.ok ? `${totals.toReceive} from sponsors` : ""}
          href="/internal/money/payments"
        />
        <Kpi
          label={`Payroll · ${monthLabel(month, true)}`}
          value={formatMoney(payrollNet)}
          note={`${sent} of ${rows.length} payslips sent`}
          href="/internal/money/payroll"
        />
        <Kpi
          label="Expense claims"
          value={String(waitingClaims.length)}
          note={waitingClaims.length ? "Waiting for you" : "Nothing waiting"}
          href="/internal/money/payroll"
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle
            action={
              <Link href="/internal/money/payments" className="inline-flex items-center gap-1 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]">
                All payments <ArrowRight size={12} />
              </Link>
            }
          >
            <span className="inline-flex items-center gap-2">
              <Wallet size={15} className="text-[var(--i-muted)]" /> To pay
              {needsLook.length ? <Chip tone="amber">{needsLook.length} need a look</Chip> : null}
            </span>
          </CardTitle>
          {toPay.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-[var(--i-faint)]">Nothing to pay right now.</p>
          ) : (
            <ul>
              {[...needsLook, ...toPay.filter((payment) => !needsLook.includes(payment))].slice(0, 8).map((payment) => (
                <PaymentRow key={payment.id} payment={payment} />
              ))}
            </ul>
          )}
          {toReceive.length ? (
            <p className="border-t border-[var(--i-line)] px-5 py-2.5 text-[12.5px] text-[var(--i-muted)]">
              Also {toReceive.length} sponsor {toReceive.length === 1 ? "payment" : "payments"} to receive.
            </p>
          ) : null}
        </Card>

        <Card>
          <CardTitle
            action={
              <Link href="/internal/money/payroll" className="inline-flex items-center gap-1 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]">
                Open payroll <ArrowRight size={12} />
              </Link>
            }
          >
            <span className="inline-flex items-center gap-2">
              <Receipt size={15} className="text-[var(--i-muted)]" /> Payroll · {monthLabel(month)}
            </span>
          </CardTitle>
          {rows.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-[var(--i-faint)]">
              No one has a salary set yet. Add salary lines on Payroll.
            </p>
          ) : (
            <ul>
              {rows.slice(0, 8).map((row) => (
                <li key={row.person.email} className="flex items-center gap-3 border-b border-[var(--i-line)] px-5 py-2.5 last:border-b-0">
                  <Avatar name={displayName(row.person)} email={row.person.email} size={24} src={photoUrl(row.person)} />
                  <span className="min-w-0 flex-1 truncate text-[13px]">{displayName(row.person)}</span>
                  <span className="text-[13px] tabular-nums">{formatMoney(row.figures.net)}</span>
                  <Chip tone={row.slip?.status === "sent" ? "emerald" : "stone"}>
                    {row.slip?.status === "sent" ? "Sent" : "Draft"}
                  </Chip>
                </li>
              ))}
            </ul>
          )}
          {waitingClaims.length ? (
            <Link
              href="/internal/money/payroll"
              className="flex items-center justify-between border-t border-[var(--i-line)] px-5 py-2.5 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
            >
              <span>
                <span className="font-medium tabular-nums text-[var(--i-accent-text)]">{waitingClaims.length}</span> expense{" "}
                {waitingClaims.length === 1 ? "claim" : "claims"} to approve
              </span>
              <ArrowRight size={12} />
            </Link>
          ) : null}
        </Card>
      </div>
    </>
  );
}
