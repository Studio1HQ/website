import type { Metadata } from "next";
import { PayrollView } from "@/components/internal/team/payroll-view";
import { Notice, PageHeader } from "@/components/internal/ui";
import { isMailerConfigured } from "@/lib/mailer";
import { requireOwner } from "@/lib/internal/session";
import { payrollMonth } from "@/lib/internal/team/payroll";
import { listReimbursements } from "@/lib/internal/team/reimbursements";
import { istNow, isMonthKey, monthOf } from "@/lib/internal/team/shared";

export const metadata: Metadata = { title: "Payroll" };

/** Monthly payslips and expense claims. Founders only. */
export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOwner();
  const params = await searchParams;
  const current = monthOf(istNow().date);
  // Payroll never runs ahead of this month.
  const month = isMonthKey(params.month) && params.month <= current ? params.month : current;
  // Every claim, for the breakdown of who claimed what; the ones still
  // waiting are picked out of it.
  const [data, claims] = await Promise.all([payrollMonth(month), listReimbursements()]);
  const all = claims.ok ? claims.items : [];

  if (!data.ok) {
    return (
      <>
        <PageHeader title="Payroll" description="Monthly payslips for the team, and expense claims." />
        <Notice tone={data.missing ? "warning" : "error"}>{data.message}</Notice>
      </>
    );
  }

  return (
    <PayrollView
      month={month}
      current={current}
      rows={data.rows}
      waiting={all.filter((claim) => claim.status === "submitted")}
      claims={all}
      people={data.people}
      mailer={isMailerConfigured()}
    />
  );
}
