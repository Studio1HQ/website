import { listDays } from "@/lib/internal/team/attendance";
import { firstDay, lastDay, monthLabel, shiftMonth, weekStart } from "@/lib/internal/clients/schema";
import { liveSnapshot } from "@/lib/internal/tasks/load";
import { TASKS_MIGRATION_HINT, tasksHref } from "@/lib/internal/tasks/shared";
import { attendanceByDay, monthCalendar, monthToShow, share } from "@/lib/internal/tasks/views";
import { Card, CardTitle, Notice } from "@/components/internal/ui";
import { DoneByWeek, MonthHeatmap } from "@/components/internal/tasks/month-parts";
import { ItemsCard, PeriodSwitcher, StatTile, StatsRow, WorkCard, workRows } from "@/components/internal/tasks/week-parts";
import type { ViewProps } from "./types";

/**
 * One person's month: a calendar of how much got done each day (leave
 * marked from attendance), Studio1 vs clients, and everything finished, by
 * week. Each day opens its week on the calendar.
 */
export async function MonthView({ person, own, params, today }: ViewProps) {
  const current = today.slice(0, 7);
  const month = monthToShow(params.month, today);
  const from = firstDay(month);
  const to = lastDay(month);
  const who = own ? null : person.email;
  const href = (target: string) => tasksHref({ view: "month", month: target === current ? null : target, person: who });

  const [snapshot, days] = await Promise.all([
    liveSnapshot(person.email, "month", from),
    listDays({ from, to, emails: [person.email] }),
  ]);

  const switcher = (
    <div className="mb-4">
      <PeriodSwitcher
        label={monthLabel(month)}
        sub={month === current ? "This month" : month === shiftMonth(current, -1) ? "Last month" : undefined}
        previous={href(shiftMonth(month, -1))}
        next={month < current ? href(shiftMonth(month, 1)) : null}
        current={month !== current ? href(current) : null}
        currentLabel="This month"
        noun="month"
      />
    </div>
  );

  if (!snapshot.ok) {
    return (
      <>
        {switcher}
        <Notice tone={snapshot.message === TASKS_MIGRATION_HINT ? "warning" : "error"}>{snapshot.message}</Notice>
      </>
    );
  }

  const data = snapshot.snapshot;
  const attendance = data.attendance;
  const rows = monthCalendar(month);
  const counts: Record<string, number> = {};
  for (const item of data.done) if (item.day) counts[item.day] = (counts[item.day] ?? 0) + 1;
  const dayLinks = Object.fromEntries(
    rows.flat().flatMap((day) => (day ? [[day, tasksHref({ week: weekStart(day), person: who })]] : [])),
  );
  const work = workRows(data.done);
  const client = work.filter((row) => row.client).reduce((sum, row) => sum + row.count, 0);
  const blocked = data.open.filter((item) => item.blocked).length;
  const workedDays = attendance ? attendance.worked + attendance.half : 0;

  return (
    <>
      {switcher}
      <StatsRow>
        <StatTile label="Done" value={String(data.done.length)} note="tasks, deliverables, community" />
        <StatTile label="Still open" value={String(data.open.length)} note={blocked ? `${blocked} blocked` : "nothing blocked"} />
        <StatTile
          label="Client work"
          value={data.done.length ? `${share(client, data.done.length)}%` : "—"}
          note={`${client} of ${data.done.length} done`}
        />
        <StatTile
          label="Days worked"
          value={attendance ? String(workedDays) : "—"}
          note={attendance ? (attendance.leave ? `${attendance.leave} on leave` : "from My day") : "Couldn't load attendance"}
        />
      </StatsRow>

      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardTitle>Done per day</CardTitle>
          <div className="p-4 sm:p-5">
            <MonthHeatmap
              rows={rows}
              counts={counts}
              marks={days.ok ? attendanceByDay(days.days) : {}}
              today={today}
              hrefFor={dayLinks}
            />
          </div>
        </Card>
        <WorkCard rows={work} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DoneByWeek items={data.done} />
        <ItemsCard title="Still open" items={data.open} kind="open" empty="Nothing open." />
      </div>
    </>
  );
}
