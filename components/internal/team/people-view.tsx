"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AirplaneTilt, IdentificationCard } from "@phosphor-icons/react";
import { addLeaveFor, deleteDayFor, saveDayFor } from "@/app/internal/(dashboard)/people/actions";
import { HoverLink, LinkPending } from "@/components/internal/nav-progress";
import { cn } from "@/lib/utils";
import { Avatar, Card, EmptyState, Notice, PageHeader, buttonClass } from "@/components/internal/ui";
import { dayText, dayTone, type Tone } from "@/components/internal/team/chips";
import { DayDialog, LeaveDialog } from "@/components/internal/team/day-dialogs";
import { MonthSwitcher } from "@/components/internal/team/kit";
import { TeamList, type ClientChoice } from "@/components/internal/team/team-list";
import type { Teammate } from "@/lib/internal/team/teammates";
import {
  datesOfMonth,
  dayLabel,
  displayName,
  formatMinutes,
  isWeekend,
  leaveFor,
  lopFor,
  photoUrl,
  slotsLabel,
  weekday,
  type AttendanceDay,
  type TeamPerson,
} from "@/lib/internal/team/shared";

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

const MARK_TONES: Record<Tone, string> = {
  emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
  stone: "bg-stone-100 text-stone-700 dark:bg-stone-500/20 dark:text-stone-300",
};

/** What a cell shows: a dot for worked, ½ for a half day, a letter for leave. */
function Mark({ day }: { day: AttendanceDay }) {
  if (day.kind === "work") return <span aria-hidden className="size-2.5 rounded-full bg-emerald-500" />;
  const letter = day.kind === "half_day" ? "½" : day.leave_type === "unpaid" ? "U" : day.leave_type === "sick" ? "S" : "L";
  return (
    <span
      aria-hidden
      className={cn("flex size-5 items-center justify-center rounded text-[10.5px] font-medium", MARK_TONES[dayTone(day)])}
    >
      {letter}
    </span>
  );
}

function describe(day: AttendanceDay) {
  return [
    dayLabel(day.day),
    dayText(day),
    day.slots.length ? slotsLabel(day.slots) : null,
    day.kind !== "leave" && day.active_minutes !== null ? `${formatMinutes(day.active_minutes)} active` : null,
    day.note || null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function PeopleView({
  admin,
  owner,
  me,
  tab,
  month,
  current,
  today,
  people,
  teammates,
  clients,
  days,
  daysError,
  reviewers,
}: {
  admin: boolean;
  /** Arindam or Amitesh: outside writers, the Admin switch, Team tasks and turning people off. */
  owner: boolean;
  me: string;
  tab: "team" | "attendance";
  month: string;
  current: string;
  today: string;
  people: TeamPerson[];
  /** The one team list, for admins: everyone with their details and access. */
  teammates: Teammate[];
  /** Every client, to give a Client team member only some. */
  clients: ClientChoice[];
  days: AttendanceDay[];
  daysError: string | null;
  reviewers: string[];
}) {
  const active = people.filter((person) => person.active);
  const tabHref = (value: string) =>
    value === "team" ? "/internal/people" : `/internal/people?tab=${value}${month !== current ? `&month=${month}` : ""}`;

  return (
    <>
      <PageHeader
        title="People"
        description={
          admin
            ? "Everyone on the team, what they can open, and who's in today."
            : "Log your interns' days and leave. They can see what you log on their My day."
        }
      />
      {admin ? (
        <nav aria-label="People" className="mb-5 flex gap-1 border-b border-[var(--i-line)]">
          {(
            [
              ["team", "Team"],
              ["attendance", "Attendance"],
            ] as const
          ).map(([value, label]) => (
            <HoverLink
              key={value}
              href={tabHref(value)}
              aria-current={tab === value ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3 pb-2.5 pt-1 text-[13px] transition-colors",
                tab === value
                  ? "border-[var(--i-accent)] font-medium text-[var(--i-ink)]"
                  : "border-transparent text-[var(--i-muted)] hover:text-[var(--i-ink)]",
              )}
            >
              {label}
              <span className="ml-1.5 text-[12px] tabular-nums text-[var(--i-faint)]">
                {value === "team" ? teammates.filter((teammate) => teammate.status !== "off").length : active.length}
              </span>
              <LinkPending className="ml-1.5 align-[-1px]" />
            </HoverLink>
          ))}
        </nav>
      ) : null}
      {tab === "team" ? (
        <TeamList teammates={teammates} clients={clients} me={me} owner={owner} reviewers={reviewers} />
      ) : (
        <Attendance
          admin={admin}
          me={me}
          month={month}
          current={current}
          today={today}
          people={active}
          days={days}
          daysError={daysError}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------ attendance */

function Attendance({
  admin,
  me,
  month,
  current,
  today,
  people,
  days,
  daysError,
}: {
  admin: boolean;
  me: string;
  month: string;
  current: string;
  today: string;
  people: TeamPerson[];
  days: AttendanceDay[];
  daysError: string | null;
}) {
  const [editing, setEditing] = useState<{ person: TeamPerson; date: string; existing: AttendanceDay | null } | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const dates = datesOfMonth(month);
  const byKey = useMemo(() => new Map(days.map((day) => [`${day.email}|${day.day}`, day])), [days]);
  const canEdit = (person: TeamPerson) => admin || (person.kind === "intern" && person.reviewer === me);
  const editable = people.filter(canEdit);

  if (people.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IdentificationCard size={20} />}
          title={admin ? "No one on the team list yet" : "No interns to log for"}
          action={
            admin ? (
              <Link href="/internal/people" className={buttonClass("primary")}>
                Add people
              </Link>
            ) : undefined
          }
        >
          {admin
            ? "Add people on the Team tab. Employees then log their own days on My day."
            : "An admin sets who reviews each intern on the People page."}
        </EmptyState>
      </Card>
    );
  }

  const todays = people.map((person) => ({ person, day: byKey.get(`${person.email}|${today}`) ?? null }));
  const groups = [
    { label: "In today", list: todays.filter(({ day }) => day && day.kind !== "leave") },
    { label: "On leave", list: todays.filter(({ day }) => day?.kind === "leave") },
    { label: "Not logged yet", list: isWeekend(today) ? [] : todays.filter(({ day }) => !day) },
  ];

  return (
    <div className="space-y-4">
      {month === current ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.label} className="px-4 py-3">
              <p className="text-[12px] text-[var(--i-muted)]">
                {group.label} <span className="tabular-nums text-[var(--i-faint)]">{group.list.length}</span>
              </p>
              {group.list.length ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {group.list.map(({ person, day }) => (
                    <li
                      key={person.email}
                      title={day ? describe(day) : undefined}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--i-sunken)] py-0.5 pl-0.5 pr-2 text-[12px] ring-1 ring-inset ring-[var(--i-line)]"
                    >
                      <Avatar name={displayName(person)} email={person.email} size={20} src={photoUrl(person)} />
                      {displayName(person).split(" ")[0]}
                      {day?.start_time && day.kind !== "leave" ? (
                        <span className="tabular-nums text-[var(--i-faint)]">{day.start_time}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[12.5px] text-[var(--i-faint)]">
                  {group.label === "Not logged yet" && isWeekend(today) ? "It's the weekend." : "No one"}
                </p>
              )}
            </Card>
          ))}
        </div>
      ) : null}

      {daysError ? <Notice tone="error">{daysError}</Notice> : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] text-[var(--i-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" /> Worked
            </span>
            {(
              [
                ["½", "amber", "Half day"],
                ["L", "sky", "Paid leave"],
                ["S", "violet", "Sick"],
                ["U", "rose", "Unpaid"],
              ] as const
            ).map(([letter, tone, label]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span className={cn("flex size-4 items-center justify-center rounded text-[9.5px] font-medium", MARK_TONES[tone])}>
                  {letter}
                </span>
                {label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <MonthSwitcher
              month={month}
              current={current}
              hrefFor={(value) => `/internal/people?tab=attendance${value === current ? "" : `&month=${value}`}`}
            />
            {editable.length ? (
              <button type="button" onClick={() => setLeaveOpen(true)} className={buttonClass("secondary", "sm")}>
                <AirplaneTilt size={14} /> Add leave
              </button>
            ) : null}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-[12px]">
            <thead>
              <tr className="text-[var(--i-muted)]">
                <th
                  scope="col"
                  className="sticky left-0 z-10 min-w-[124px] border-b border-[var(--i-line)] bg-[var(--i-panel)] px-3 py-2 text-left font-normal sm:min-w-[168px] sm:px-4"
                >
                  Person
                </th>
                {dates.map((date) => (
                  <th
                    key={date}
                    scope="col"
                    className={cn(
                      "min-w-[25px] border-b border-[var(--i-line)] px-0 py-1.5 text-center font-normal",
                      isWeekend(date) && "bg-[var(--i-sunken)]",
                      date === today && "text-[var(--i-accent-text)]",
                    )}
                  >
                    <span className="block text-[10px] text-[var(--i-faint)]">{WEEKDAY_LETTERS[weekday(date)]}</span>
                    <span className={cn("block tabular-nums", date === today && "font-medium")}>{Number(date.slice(8))}</span>
                  </th>
                ))}
                {["Days", "Hours", "Leave"].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="whitespace-nowrap border-b border-l border-[var(--i-line)] px-2.5 py-2 text-right font-normal"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people.map((person) => {
                const mine = dates.map((date) => byKey.get(`${person.email}|${date}`) ?? null);
                const logged = mine.filter((day): day is AttendanceDay => day !== null);
                const worked = logged.reduce((sum, day) => sum + (day.kind === "work" ? 1 : day.kind === "half_day" ? 0.5 : 0), 0);
                const minutes = logged.reduce((sum, day) => sum + (day.kind === "leave" ? 0 : (day.active_minutes ?? 0)), 0);
                const leave = logged.reduce((sum, day) => sum + leaveFor(day), 0);
                const unpaid = logged.reduce((sum, day) => sum + lopFor(day), 0);
                const can = canEdit(person);
                const name = displayName(person);
                return (
                  <tr key={person.email} className="group">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 max-w-[124px] border-b border-[var(--i-line)] bg-[var(--i-panel)] px-3 py-2 text-left font-normal group-last:border-b-0 sm:max-w-none sm:px-4"
                    >
                      <span className="flex items-center gap-2 sm:gap-2.5">
                        <Avatar name={name} email={person.email} size={24} src={photoUrl(person)} />
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-medium text-[var(--i-ink)]">{name}</span>
                          <span className="block truncate text-[11px] text-[var(--i-faint)]">
                            {[person.employee_code, person.kind === "intern" ? "Intern" : null].filter(Boolean).join(" · ") ||
                              person.designation ||
                              " "}
                          </span>
                        </span>
                      </span>
                    </th>
                    {dates.map((date, index) => {
                      const day = mine[index];
                      const missing = !day && !isWeekend(date) && date < today;
                      const label = day ? describe(day) : `${dayLabel(date)} · ${missing ? "Not logged" : "Nothing logged"}`;
                      return (
                        <td
                          key={date}
                          className={cn(
                            "border-b border-[var(--i-line)] p-0 text-center group-last:border-b-0",
                            isWeekend(date) && "bg-[var(--i-sunken)]",
                            date === today && "bg-[var(--i-accent-soft)]",
                          )}
                        >
                          {can ? (
                            <button
                              type="button"
                              title={label}
                              aria-label={`${name}: ${label}`}
                              onClick={() => setEditing({ person, date, existing: day })}
                              className="mx-auto flex size-6 items-center justify-center rounded-md hover:bg-[var(--i-hover)] hover:ring-1 hover:ring-[var(--i-line)]"
                            >
                              {day ? <Mark day={day} /> : missing ? <span aria-hidden className="size-1 rounded-full bg-[var(--i-line-strong)]" /> : null}
                            </button>
                          ) : (
                            <span title={label} className="mx-auto flex size-6 items-center justify-center">
                              {day ? <Mark day={day} /> : missing ? <span aria-hidden className="size-1 rounded-full bg-[var(--i-line-strong)]" /> : null}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-l border-[var(--i-line)] px-2.5 text-right tabular-nums group-last:border-b-0">{worked}</td>
                    <td className="whitespace-nowrap border-b border-[var(--i-line)] px-2.5 text-right tabular-nums group-last:border-b-0">
                      {minutes ? formatMinutes(minutes) : "—"}
                    </td>
                    <td className="whitespace-nowrap border-b border-[var(--i-line)] px-2.5 text-right tabular-nums group-last:border-b-0">
                      {leave || "—"}
                      {unpaid ? <span className="text-rose-700 dark:text-rose-300"> ({unpaid} U)</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[var(--i-line)] px-5 py-2.5 text-[11.5px] text-[var(--i-faint)]">
          {admin
            ? "Click a day to log or fix it. Employees log their own days on My day; a grey dot is a weekday nobody logged."
            : "Click a day to log it for your intern."}
        </p>
      </Card>

      <DayDialog
        open={editing !== null}
        onOpenChange={(open) => (open ? null : setEditing(null))}
        date={editing?.date ?? today}
        existing={editing?.existing ?? null}
        who={editing ? displayName(editing.person) : undefined}
        onSave={(input) => saveDayFor(editing?.person.email, input)}
        onDelete={(date) => deleteDayFor(editing?.person.email, date)}
      />
      <LeaveDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        today={today}
        people={editable.map((person) => ({ email: person.email, name: displayName(person) }))}
        onSave={addLeaveFor}
      />
    </div>
  );
}
