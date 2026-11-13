import type { Metadata } from "next";
import { Notice, PageHeader } from "@/components/internal/ui";
import { PeopleView } from "@/components/internal/team/people-view";
import { listMembers } from "@/lib/internal/members";
import { OWNERS, isOwner } from "@/lib/internal/roles";
import { requirePeople } from "@/lib/internal/session";
import { listDays } from "@/lib/internal/team/attendance";
import { listPeople } from "@/lib/internal/team/people";
import { daysInMonth, isMonthKey, istNow, monthOf } from "@/lib/internal/team/shared";

export const metadata: Metadata = { title: "People" };

/**
 * Attendance for the whole team (admins) or a reviewer's interns, and the
 * team list itself: employee IDs, interns' reviewers, who's active.
 */
export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requirePeople(), searchParams]);
  const now = istNow();
  const current = monthOf(now.date);
  const month = isMonthKey(params.month) && params.month <= current ? params.month : current;
  const tab = staff.admin && params.tab === "directory" ? "directory" : "attendance";

  // No salary lines here, for anyone: listPeople never reads them.
  const people = await listPeople(staff.admin ? {} : { emails: staff.interns });
  if (!people.ok) {
    return (
      <>
        <PageHeader title="People" />
        <Notice tone={people.missing ? "warning" : "error"}>{people.message}</Notice>
      </>
    );
  }

  const active = people.people.filter((person) => person.active);
  const last = `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
  const [days, members] = await Promise.all([
    // The whole month: leave planned for later days shows too.
    listDays({ from: `${month}-01`, to: last, emails: active.map((person) => person.email) }),
    staff.admin && tab === "directory" ? listMembers() : Promise.resolve(null),
  ]);
  // Reviewers to suggest for interns: dashboard members and the employees.
  const reviewers = [
    ...new Set([
      ...OWNERS,
      ...(members ?? []).filter((member) => member.status === "active").map((member) => member.email),
      ...active.filter((person) => person.kind === "employee").map((person) => person.email),
    ]),
  ].sort();

  return (
    <PeopleView
      admin={staff.admin}
      owner={isOwner(staff.email)}
      me={staff.email}
      tab={tab}
      month={month}
      current={current}
      today={now.date}
      people={people.people}
      days={days.ok ? days.days : []}
      daysError={days.ok ? null : days.message}
      reviewers={reviewers}
    />
  );
}
