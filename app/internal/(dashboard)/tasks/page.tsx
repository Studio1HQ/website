import type { Metadata } from "next";
import Link from "next/link";
import { CheckSquare } from "@phosphor-icons/react/dist/ssr";
import { requireMember } from "@/lib/internal/session";
import { istNow } from "@/lib/internal/team/shared";
import { canGiveTask, canSeeOthers } from "@/lib/internal/tasks/access";
import { taskViewer, visiblePeople } from "@/lib/internal/tasks/load";
import { tasksHref } from "@/lib/internal/tasks/shared";
import { Card, EmptyState, Notice, PageHeader, buttonClass } from "@/components/internal/ui";
import { LinkTabs } from "@/components/internal/community/ui";
import { PersonPicker } from "@/components/internal/tasks/person-picker";
import { BoardView } from "./_views/board-view";
import { WeekView } from "./_views/week-view";
import { MonthView } from "./_views/month-view";
import { TeamView } from "./_views/team-view";
import { VIEWS, isViewKey, type ViewKey, type ViewProps } from "./_views/types";

export const metadata: Metadata = { title: "Tasks" };

function flat(params: Record<string, string | string[] | undefined>) {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const one = Array.isArray(value) ? value[0] : value;
    if (typeof one === "string" && one.trim()) out[key] = one.trim();
  }
  return out;
}

/**
 * Tasks: everyone's work in one place. Week (the default) is a calendar
 * with a column per day and a card per task, the way the old tracker
 * looked; the board shows the same tasks by status; Month adds them up;
 * Team (founders, the associate, intern reviewers) shows everyone's week
 * at once. Client deliverables and community tasks are read where they
 * live, never copied. Reports live at /internal/tasks/reports.
 */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, raw] = await Promise.all([requireMember(), searchParams]);
  const params = flat(raw);
  const viewer = taskViewer(staff);
  const others = canSeeOthers(viewer);
  const { people, failed } = await visiblePeople(staff);
  const today = istNow().date;

  if (!people.length) {
    return (
      <Card>
        <EmptyState icon={<CheckSquare size={20} />} title="You're not on the team list yet">
          Tasks is for people on the team list: your board, what you did each day, and your weekly and monthly reports.
          Ask Arindam or Amitesh to add you.
        </EmptyState>
      </Card>
    );
  }

  // "day" was the old Today view: its links open the week.
  const requested: ViewKey = isViewKey(params.view) ? params.view : "week";
  const view: ViewKey = requested === "team" && !others ? "week" : requested;
  const person =
    people.find((item) => item.email === params.person?.toLowerCase()) ??
    people.find((item) => item.email === staff.email) ??
    people[0];
  const own = person.email === staff.email;

  const props: ViewProps = { staff, viewer, person, own, people, params, today };
  const keep = (extra: Record<string, string | null>) =>
    tasksHref({ person: own ? null : person.email, ...extra });

  const tabs = [
    ...VIEWS.map((item) => ({ key: item.key, label: item.label, href: keep({ view: item.key === "week" ? null : item.key }) })),
    ...(others ? [{ key: "team", label: "Team", href: tasksHref({ view: "team" }) }] : []),
  ];

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Tasks"
        description={
          view === "team"
            ? "Everyone's week: time logged, what got done, and whose report is in."
            : own
              ? "Your week, day by day: add what you did or plan to, and tag the client it's for. Your reports build from it."
              : canGiveTask(viewer, person.email, person.guarded)
                ? `What ${person.name || person.email} is working on. Add a task on a day to give it to them; it shows on their bell.`
                : `What ${person.name || person.email} worked on.`
        }
        actions={
          <>
            {others && view !== "team" ? (
              <PersonPicker
                people={people.map((item) => ({ email: item.email, name: item.name }))}
                value={person.email}
                me={staff.email}
                view={view}
              />
            ) : null}
            <Link href="/internal/tasks/reports" className={buttonClass("secondary")}>
              Reports
            </Link>
          </>
        }
      />
      {failed ? (
        <div className="mb-4">
          <Notice tone="warning">Couldn&apos;t load the whole team list just now; showing what loaded.</Notice>
        </div>
      ) : null}
      {params.denied ? (
        <div className="mb-4">
          <Notice tone="warning">That needs more access than you have.</Notice>
        </div>
      ) : null}
      <LinkTabs items={tabs} active={view} />
      {view === "board" ? <BoardView {...props} /> : null}
      {view === "week" ? <WeekView {...props} /> : null}
      {view === "month" ? <MonthView {...props} /> : null}
      {view === "team" ? <TeamView {...props} /> : null}
    </>
  );
}
