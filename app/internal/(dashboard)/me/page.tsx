import type { Metadata } from "next";
import Link from "next/link";
import { IdentificationCard } from "@phosphor-icons/react/dist/ssr";
import { Card, EmptyState, Notice, buttonClass } from "@/components/internal/ui";
import { MyDay } from "@/components/internal/team/my-day";
import { isAdmin, requireMember } from "@/lib/internal/session";
import { listDays } from "@/lib/internal/team/attendance";
import { listPayslips } from "@/lib/internal/team/payroll";
import { listReimbursements } from "@/lib/internal/team/reimbursements";
import {
  daysInMonth,
  displayName,
  isMonthKey,
  istNow,
  minutesBetween,
  monthOf,
} from "@/lib/internal/team/shared";

export const metadata: Metadata = { title: "My day" };

function greeting(time: string) {
  const hour = Number(time.slice(0, 2));
  return hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/**
 * Each person's own page: start and end the day, take leave, see the month,
 * download payslips and claim expenses. Interns see their days, which their
 * reviewer logs.
 */
export default async function MyDayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requireMember(), searchParams]);
  const now = istNow();
  const current = monthOf(now.date);
  const month = isMonthKey(params.month) && params.month <= current ? params.month : current;
  const person = staff.person;

  if (!person) {
    return (
      <Card>
        <EmptyState
          icon={<IdentificationCard size={20} />}
          title="You're not on the team list yet"
          action={
            isAdmin(staff) ? (
              <Link href="/internal/people?tab=directory" className={buttonClass("primary")}>
                Add yourself on People
              </Link>
            ) : undefined
          }
        >
          {isAdmin(staff)
            ? "My day is for people on the team list: log your hours and leave, and find your payslips."
            : "Ask Arindam or Amitesh to add you. Then you can log your hours and leave here, and find your payslips."}
        </EmptyState>
      </Card>
    );
  }

  const [monthDays, todayDays, payslips, claims] = await Promise.all([
    listDays({ from: `${month}-01`, to: `${month}-${String(daysInMonth(month)).padStart(2, "0")}`, emails: [person.email] }),
    listDays({ from: now.date, to: now.date, emails: [person.email] }),
    listPayslips({ email: person.email, status: "sent" }),
    listReimbursements({ email: person.email }),
  ]);

  const today = todayDays.ok ? (todayDays.days[0] ?? null) : null;
  const soFar = today?.start_time && !today.end_time ? minutesBetween(today.start_time, now.time) : null;
  const failed = [monthDays, payslips, claims].find((result) => !result.ok);

  return (
    <>
      {failed && !failed.ok ? (
        <div className="mb-5">
          <Notice tone={failed.missing ? "warning" : "error"}>{failed.message}</Notice>
        </div>
      ) : null}
      <MyDay
        person={person}
        greeting={`${greeting(now.time)}, ${displayName(person).split(" ")[0]}`}
        now={now}
        month={month}
        current={current}
        today={today}
        soFar={soFar}
        days={monthDays.ok ? monthDays.days : []}
        payslips={payslips.ok ? payslips.slips : []}
        claims={claims.ok ? claims.items : []}
        inboundAddress={process.env.INBOUND_EMAIL_ADDRESS?.trim() || null}
      />
    </>
  );
}
