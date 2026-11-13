import { listDays } from "@/lib/internal/team/attendance";
import { paymentTotals, type PaymentTotals } from "@/lib/internal/team/payments";
import { payrollMonth } from "@/lib/internal/team/payroll";
import { listPeople } from "@/lib/internal/team/people";
import { listReimbursements } from "@/lib/internal/team/reimbursements";
import { isWeekend, istNow, monthOf, type TeamPerson } from "@/lib/internal/team/shared";

/**
 * The admin overview's team and money numbers: who's in today, what's left
 * to pay, and where this month's payroll stands. `ready` is false until the
 * team migration has run, and the overview leaves the section out.
 */
export async function teamOverview() {
  const now = istNow();
  const month = monthOf(now.date);
  const people = await listPeople({ activeOnly: true });
  if (!people.ok) return { ready: false as const };

  const [today, slips, claims, payments] = await Promise.all([
    listDays({ from: now.date, to: now.date, emails: people.people.map((person) => person.email) }),
    payrollMonth(month),
    listReimbursements({ status: ["submitted"] }),
    paymentTotals(),
  ]);

  const byEmail = new Map((today.ok ? today.days : []).map((day) => [day.email, day]));
  const group = (test: (person: TeamPerson) => boolean) => people.people.filter(test);
  const working = group((person) => {
    const day = byEmail.get(person.email);
    return Boolean(day && day.kind !== "leave");
  });
  const leave = group((person) => byEmail.get(person.email)?.kind === "leave");
  const notLogged = isWeekend(now.date) ? [] : group((person) => !byEmail.has(person.email));
  // The same rows as the Payroll page: anyone with a salary set or a saved slip.
  const rows = slips.ok ? slips.rows.filter((row) => !row.noSalary) : [];
  const sent = rows.filter((row) => row.slip?.status === "sent").length;
  const salaried = rows.length;

  return {
    ready: true as const,
    month,
    people: people.people.length,
    working,
    leave,
    notLogged,
    payroll: { sent, salaried, claimsWaiting: claims.ok ? claims.items.length : 0 },
    payments: payments as PaymentTotals,
  };
}
