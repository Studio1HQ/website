import type { Metadata } from "next";
import Link from "next/link";
import { IdentificationCard } from "@/components/internal/icons";
import { Card, EmptyState, Notice, buttonClass } from "@/components/internal/ui";
import { MyDay } from "@/components/internal/team/my-day";
import { TodayWork } from "@/components/internal/tasks/today-work";
import { CallsProvider } from "@/components/internal/calls/call-parts";
import { TodayCalls } from "@/components/internal/calls/call-views";
import { canPlanCalls, canSeeCalls } from "@/lib/internal/calls/access";
import { callPeople, listCalls, listChanges } from "@/lib/internal/calls/data";
import { isIn, occurrences } from "@/lib/internal/calls/shared";
import { cardChoices, loadWeekCards, teammates } from "@/lib/internal/tasks/load";
import { isDateKey, weekStart } from "@/lib/internal/clients/schema";
import { earliestCardDay } from "@/lib/internal/tasks/calendar";
import { isAdmin, requireMember } from "@/lib/internal/session";
import { listDays } from "@/lib/internal/team/attendance";
import { listPayslips } from "@/lib/internal/team/payroll";
import { listReimbursements } from "@/lib/internal/team/reimbursements";
import {
  daysInMonth,
  displayName,
  isMonthKey,
  istNow,
  minutesSoFar,
  monthOf,
  openSlot,
  runningDay,
  shiftDay,
} from "@/lib/internal/team/shared";

export const metadata: Metadata = { title: "My day" };

/**
 * Today's calls for this person, with what the cards need; null when
 * they're in no call at all (or Calls isn't set up), so the card stays away.
 */
async function todaysCalls(staff: Awaited<ReturnType<typeof requireMember>>, now: { date: string; time: string }) {
  const today = now.date;
  if (!canSeeCalls(staff)) return null;
  const me = staff.email.toLowerCase();
  const [calls, changes] = await Promise.all([listCalls({ from: today }), listChanges(today, today)]);
  if (!calls.ok || !changes.ok) return null;
  const mine = calls.rows.filter((call) => isIn(call, me));
  if (!mine.length) return null;
  const { people, team } = await callPeople();
  return {
    items: occurrences(mine, changes.rows, today, today),
    context: {
      calls: Object.fromEntries(mine.map((call) => [call.id, call])),
      names: Object.fromEntries(people.map((person) => [person.email, person.name])),
      // The form's people picker: planners only.
      people: canPlanCalls(staff) ? people : [],
      team,
      me,
      canPlan: canPlanCalls(staff),
      today,
      now,
    },
  };
}

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
  // The day "Today's tasks" shows: today, or one picked in its box (?day=),
  // no further back than the box lets you pick.
  const taskDay =
    isDateKey(params.day) && params.day >= earliestCardDay(now.date) ? params.day : now.date;
  const person = staff.person;

  if (!person) {
    return (
      <Card>
        <EmptyState
          icon={<IdentificationCard size={20} />}
          title="You're not on the team list yet"
          action={
            isAdmin(staff) ? (
              <Link href="/people?tab=directory" className={buttonClass("primary")}>
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

  // Today and yesterday come from the month's read when it holds both; only
  // a past month, or the 1st, needs a read of its own.
  const yesterday = shiftDay(now.date, -1);
  const inMonth = month === current && monthOf(yesterday) === current;
  const [monthDays, recentDays, payslips, claims, work, options, calls, team] = await Promise.all([
    listDays({ from: `${month}-01`, to: `${month}-${String(daysInMonth(month)).padStart(2, "0")}`, emails: [person.email] }),
    inMonth ? null : listDays({ from: yesterday, to: now.date, emails: [person.email] }),
    listPayslips({ email: person.email, status: "sent" }),
    listReimbursements({ email: person.email }),
    // Tasks: the shown day's week of cards (hidden until the tasks migration has run).
    loadWeekCards(person.email, weekStart(taskDay), now.date),
    // The same week as the cards, so its rows are read once.
    cardChoices(staff, weekStart(taskDay)),
    todaysCalls(staff, now),
    teammates(),
  ]);

  const recent = recentDays ?? monthDays;
  const dayOn = (date: string) => (recent.ok ? (recent.days.find((day) => day.day === date) ?? null) : null);
  const today = dayOn(now.date);
  // The day on the clock: today, or yesterday while a slot started then is
  // still running past midnight (so the button reads End, not Start).
  const working = runningDay(today, dayOn(yesterday), now.time);
  const soFar = working ? minutesSoFar(working, now.time) : null;
  const failed = [monthDays, payslips, claims].find((result) => !result.ok);

  return (
    <>
      {failed && !failed.ok ? (
        <div className="mb-3">
          <Notice tone={failed.missing ? "warning" : "error"}>{failed.message}</Notice>
        </div>
      ) : null}
      <MyDay
        person={person}
        admin={isAdmin(staff)}
        greeting={`${greeting(now.time)}, ${displayName(person).split(" ")[0]}`}
        now={now}
        month={month}
        current={current}
        today={today}
        carried={working && working !== today ? working : null}
        soFar={soFar}
        days={monthDays.ok ? monthDays.days : []}
        payslips={payslips.ok ? payslips.slips : []}
        claims={claims.ok ? claims.items : []}
        inboundAddress={process.env.INBOUND_EMAIL_ADDRESS?.trim() || null}
        calls={
          calls ? (
            <CallsProvider value={calls.context}>
              {/* With tasks above, the calls keep to under half the column. */}
              <TodayCalls items={calls.items} className={work.missing ? "xl:flex-1" : "shrink-0 xl:max-h-[45%]"} />
            </CallsProvider>
          ) : null
        }
        tasks={
          work.missing ? null : (
            <TodayWork
              cards={work.cards.filter((card) => card.day === taskDay)}
              day={taskDay}
              today={now.date}
              ended={Boolean(today && today.kind !== "leave" && today.slots.length && !openSlot(today.slots))}
              options={options}
              who={person.email.toLowerCase()}
              team={team}
              className="min-h-[14rem] xl:flex-1"
            />
          )
        }
      />
    </>
  );
}
