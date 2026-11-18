import Link from "next/link";
import { cn } from "@/lib/utils";
import { listDays } from "@/lib/internal/team/attendance";
import { displayName, isWeekend, istNow, photoUrl } from "@/lib/internal/team/shared";
import { shiftWeek, weekDays, weekEnd, weekLabel, weekStart } from "@/lib/internal/clients/schema";
import { isFounder, owesReports } from "@/lib/internal/tasks/access";
import { listReports } from "@/lib/internal/tasks/data";
import { doneCounts } from "@/lib/internal/tasks/views-data";
import { TASKS_MIGRATION_HINT, tasksHref, type Report } from "@/lib/internal/tasks/shared";
import {
  attendanceByPersonDay,
  reportCell,
  weekToShow,
} from "@/lib/internal/tasks/views";
import { Avatar, Card, Notice } from "@/components/internal/ui";
import { Pill, Table, rowClass } from "@/components/internal/community/ui";
import { weekName } from "@/components/internal/clients/week-switcher";
import { PeriodSwitcher } from "@/components/internal/tasks/week-parts";
import type { ViewProps } from "./types";

const SHORT_DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });

/**
 * Everyone the viewer may see, for one week: how much each person got done
 * each day (leave from attendance), the week's total and, for the founders,
 * whether that week's report is in. Names and days open their week.
 */
export async function TeamView({ staff, viewer, people, params, today }: ViewProps) {
  const current = weekStart(today);
  const week = weekToShow(params.week, today);
  const end = weekEnd(week);
  const days = weekDays(week);
  const founder = isFounder(viewer);
  const emails = people.map((person) => person.email);
  const href = (target: string) => tasksHref({ view: "team", week: target === current ? null : target });

  const [attendance, done, reports] = await Promise.all([
    listDays({ from: week, to: end, emails }),
    doneCounts(emails, week, end),
    founder ? listReports({ period: "week", starts: [week], emails }) : Promise.resolve(null),
  ]);

  const switcher = (
    <div className="mb-4">
      <PeriodSwitcher
        label={weekLabel(week)}
        sub={weekName(week, current)}
        previous={href(shiftWeek(week, -1))}
        next={week < current ? href(shiftWeek(week, 1)) : null}
        current={week !== current ? href(current) : null}
        currentLabel="This week"
        noun="week"
      />
    </div>
  );

  if (!done.ok) {
    return (
      <>
        {switcher}
        <Notice tone={done.missing ? "warning" : "error"}>{done.missing ? TASKS_MIGRATION_HINT : done.message}</Notice>
      </>
    );
  }

  const perDay = done.byDay;
  const marks = attendance.ok ? attendanceByPersonDay(attendance.days) : {};
  const counts = done.counts;
  const byEmail = new Map<string, Report>((reports?.ok ? reports.rows : []).map((report) => [report.email.toLowerCase(), report]));
  const now = istNow();
  const teamDay = days.map((day) => people.reduce((sum, person) => sum + (perDay[person.email]?.[day] ?? 0), 0));
  const teamTotal = teamDay.reduce((sum, value) => sum + value, 0);
  const who = (email: string) => (email === staff.email ? null : email);

  return (
    <>
      {switcher}
      {!attendance.ok || (reports && !reports.ok) ? (
        <div className="mb-4">
          <Notice tone="warning">Some of the week couldn&apos;t be loaded just now (attendance or reports). Reload in a minute.</Notice>
        </div>
      ) : null}
      <Card>
        <Table
          head={
            <>
              <th>Person</th>
              {days.map((day) => (
                <th key={day} className={cn("text-right", day === today && "text-[var(--i-accent-text)]")}>
                  {SHORT_DAY.format(new Date(`${day}T00:00:00Z`))}
                </th>
              ))}
              <th className="text-right">Done</th>
              {founder ? <th>Report</th> : null}
            </>
          }
        >
          {people.map((person) => {
            const email = person.email;
            const report = byEmail.get(email);
            const cell = founder && owesReports(email) ? reportCell(report, week, now) : null;
            return (
              <tr key={email} className={rowClass}>
                <td>
                  <Link href={tasksHref({ person: who(email) })} className="group flex min-w-0 items-center gap-2.5">
                    <Avatar name={displayName(person)} email={email} src={photoUrl(person)} size={24} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium group-hover:text-[var(--i-accent-text)]">
                        {displayName(person)}
                        {email === staff.email ? <span className="font-normal text-[var(--i-muted)]"> (you)</span> : null}
                      </span>
                      {person.designation || person.kind === "intern" ? (
                        <span className="block truncate text-[12px] text-[var(--i-muted)]">
                          {person.designation || "Intern"}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </td>
                {days.map((day) => {
                  const logged = perDay[email]?.[day] ?? 0;
                  const mark = marks[email]?.[day];
                  const ahead = day > today;
                  const label = mark?.kind === "leave" ? "Leave" : logged ? String(logged) : "—";
                  return (
                    <td key={day} className="text-right tabular-nums">
                      {ahead ? (
                        <span className="text-[var(--i-faint)]">·</span>
                      ) : (
                        <Link
                          href={tasksHref({ week: weekStart(day), person: who(email) })}
                          className={cn(
                            "inline-block rounded px-1 hover:bg-[var(--i-hover)]",
                            mark?.kind === "leave"
                              ? "text-[12px] text-amber-700 dark:text-amber-300"
                              : logged
                                ? "text-[var(--i-ink)]"
                                : isWeekend(day)
                                  ? "text-[var(--i-faint)]"
                                  : "text-[var(--i-muted)]",
                          )}
                          aria-label={`${displayName(person)}, ${day}: ${label}`}
                        >
                          {label}
                          {mark?.kind === "half_day" ? <span className="ml-0.5 text-[11px] text-sky-600 dark:text-sky-300">½</span> : null}
                        </Link>
                      )}
                    </td>
                  );
                })}
                <td className="text-right font-medium tabular-nums">{counts[email] || "—"}</td>
                {founder ? (
                  <td className="whitespace-nowrap">
                    {cell ? (
                      report && (report.status === "submitted" || report.status === "seen") ? (
                        <Link href={`/tasks/reports/${report.id}`} className="hover:opacity-80">
                          <Pill tone={cell.tone}>{cell.label}</Pill>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <Pill tone={cell.tone}>{cell.label}</Pill>
                          {cell.late ? <span className="text-[12px] text-rose-700 dark:text-rose-300">late</span> : null}
                        </span>
                      )
                    ) : (
                      <span className="text-[var(--i-faint)]">—</span>
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
          {people.length > 1 ? (
            <tr className="bg-[var(--i-sunken)]">
              <td className="text-[12.5px] font-medium text-[var(--i-muted)]">Everyone</td>
              {teamDay.map((value, index) => (
                <td key={days[index]} className="text-right text-[12.5px] tabular-nums text-[var(--i-muted)]">
                  {value || "—"}
                </td>
              ))}
              <td className="text-right text-[12.5px] font-medium tabular-nums">{teamTotal || "—"}</td>
              {founder ? <td /> : null}
            </tr>
          ) : null}
        </Table>
      </Card>
      <p className="mt-3 text-[12px] text-[var(--i-faint)]">
        Each number is what someone got done that day: their tasks, client deliverables that went live and community tasks finished.
        {founder ? " Reports are due Monday at 12:00 for the week before." : ""}
      </p>
    </>
  );
}
