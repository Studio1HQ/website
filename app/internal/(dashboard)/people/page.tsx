import type { Metadata } from "next";
import { Notice, PageHeader } from "@/components/internal/ui";
import { PeopleView } from "@/components/internal/team/people-view";
import { loadClients } from "@/lib/internal/clients/data";
import { listMembers } from "@/lib/internal/members";
import { OWNERS, isOwner } from "@/lib/internal/roles";
import { requirePeople } from "@/lib/internal/session";
import { listDays } from "@/lib/internal/team/attendance";
import { addMissingMembers, listPeople } from "@/lib/internal/team/people";
import { mergeTeam } from "@/lib/internal/team/teammates";
import { daysInMonth, isMonthKey, istNow, monthOf } from "@/lib/internal/team/shared";

export const metadata: Metadata = { title: "People" };

/**
 * The one team list (admins): everyone on the roster and everyone with
 * dashboard access as one row, with their details and what they can open.
 * And attendance, for the whole team (admins) or a reviewer's interns.
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
  // Admins land on the team; ?tab=directory is the old name, from saved links.
  const tab = staff.admin && params.tab !== "attendance" && !params.month ? "team" : "attendance";

  // No salary lines here, for anyone: listPeople never reads them.
  const [listed, members, clientList] = await Promise.all([
    listPeople(staff.admin ? {} : { emails: staff.interns }),
    staff.admin ? listMembers() : Promise.resolve(null),
    // To give a Client team member only some clients (the team list's dialog).
    staff.admin ? loadClients() : Promise.resolve(null),
  ]);
  let people = listed;
  // Everyone with dashboard access at Studio1 belongs on the roster too:
  // anyone who isn't yet (approved before that was automatic) is added now,
  // then the list re-read.
  if (people.ok && members && (await addMissingMembers(members, people.people, staff.email)).length) {
    people = await listPeople();
  }
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
  // The whole month: leave planned for later days shows too.
  const days = await listDays({ from: `${month}-01`, to: last, emails: active.map((person) => person.email) });
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
      teammates={staff.admin ? mergeTeam(people.people, members ?? []) : []}
      clients={clientList?.ok ? clientList.rows.map((client) => ({ id: client.id, name: client.name })) : []}
      days={days.ok ? days.days : []}
      daysError={days.ok ? null : days.message}
      reviewers={reviewers}
    />
  );
}
