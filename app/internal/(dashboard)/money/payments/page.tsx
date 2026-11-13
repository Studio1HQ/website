import type { Metadata } from "next";
import { PaymentsView } from "@/components/internal/team/payments-view";
import { Card, CardTitle, Notice, PageHeader, relativeDate } from "@/components/internal/ui";
import { requireStaff } from "@/lib/internal/session";
import { listAudit, type AuditRow } from "@/lib/internal/team/audit";
import { listPayees, listPayments } from "@/lib/internal/team/payments";
import { istNow, isMonthKey, monthOf } from "@/lib/internal/team/shared";
import { isMailerConfigured } from "@/lib/mailer";

export const metadata: Metadata = { title: "Payments" };

/**
 * What Studio1 owes writers, hackathon partners and others, and what
 * sponsors owe Studio1. Invoices arrive by email or get added here; marking
 * one paid can email the payee. Admins only.
 */
/**
 * Invoice and claim emails the intake turned away, newest first: a claim
 * whose sender couldn't be verified, a flood from one address. Listed so
 * nothing sent to the intake address disappears without a trace. Empty (and
 * hidden) until the audit table exists and something has been turned away.
 */
function TurnedAway({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Card className="mt-5">
      <CardTitle>
        Emails not taken in
        <span className="ml-2 font-normal text-[var(--i-muted)]">the latest {rows.length}</span>
      </CardTitle>
      <ul>
        {rows.map((row) => (
          <li key={row.id} className="border-b border-[var(--i-line)] px-5 py-2.5 text-[13px] last:border-b-0">
            <p className="truncate">
              <span className="font-medium">{row.actor}</span>
              <span className="text-[var(--i-muted)]"> · {row.subject}</span>
            </p>
            <p className="truncate text-[12px] text-[var(--i-muted)]">
              {typeof row.detail?.reason === "string" ? row.detail.reason : "Turned away"} · {relativeDate(row.created_at)}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff("admin");
  const [payments, payees, params, turnedAway] = await Promise.all([
    listPayments(),
    listPayees(),
    searchParams,
    listAudit("intake", { action: "skipped", limit: 15 }),
  ]);
  const status = params.status === "paid" || params.status === "all" ? params.status : "due";
  const month = typeof params.month === "string" && isMonthKey(params.month) ? params.month : "";
  const today = istNow().date;

  return (
    <>
      <PageHeader
        title="Payments"
        description="Invoices from writers, hackathon partners and others, and what sponsors owe. Mark one paid and they get an email."
      />
      {!payments.ok || !payees.ok ? (
        <Notice tone={(!payments.ok && payments.missing) || (!payees.ok && payees.missing) ? "warning" : "error"}>
          {!payments.ok ? payments.message : !payees.ok ? payees.message : ""}
        </Notice>
      ) : (
        <PaymentsView
          payments={payments.payments}
          payees={payees.payees}
          initialStatus={status}
          initialMonth={month}
          today={today}
          thisMonth={monthOf(today)}
          inboundAddress={process.env.INBOUND_EMAIL_ADDRESS?.trim() || null}
          mailerReady={isMailerConfigured()}
        />
      )}
      <TurnedAway rows={turnedAway} />
    </>
  );
}
