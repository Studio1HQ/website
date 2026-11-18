import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { homeFor, requireMember } from "@/lib/internal/session";
import { addDays, shiftWeek, weekDays, weekLabel, weekStart } from "@/lib/internal/clients/schema";
import { dayLabel, displayName, istNow, monthLabel, monthOf, shiftMonth } from "@/lib/internal/team/shared";
import { canPlanCalls, canSeeAllCalls, canSeeCalls } from "@/lib/internal/calls/access";
import { callPeople, changesOf, listCalls, listChanges } from "@/lib/internal/calls/data";
import { isIn, lengthLabel, monthGridDays, nextOccurrence, occurrences, type Occurrence } from "@/lib/internal/calls/shared";
import { cn } from "@/lib/utils";
import { Notice, PageHeader } from "@/components/internal/ui";
import { LinkTabs } from "@/components/internal/community/ui";
import { PeriodSwitcher } from "@/components/internal/tasks/week-parts";
import { CallsProvider } from "@/components/internal/calls/call-parts";
import { NewCallButton } from "@/components/internal/calls/call-form";
import { CallList, MonthCalendar, TimeGrid } from "@/components/internal/calls/call-views";

export const metadata: Metadata = { title: "Calls" };

const VIEWS = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
  { key: "list", label: "List" },
] as const;
type View = (typeof VIEWS)[number]["key"];

/** How far either way the calendar goes. */
const MONTHS_AWAY = 12;

function one(value: string | string[] | undefined) {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? first.trim() : "";
}

function isDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** "Today", "Tomorrow", "Yesterday", or nothing. */
function dayName(day: string, today: string) {
  if (day === today) return "Today";
  if (day === addDays(today, 1)) return "Tomorrow";
  if (day === addDays(today, -1)) return "Yesterday";
  return "";
}

/**
 * Calls: Studio1's internal calls as a calendar (month, week, day) and a
 * list. Everyone sees only the calls they're invited to, founders included
 * by default; the founders and the founder's associate can switch to
 * Everyone's, and they plan the calls. For everyone else, calls they aren't
 * in never leave the server. Prospect, hiring and client calls stay in
 * Google Calendar.
 */
export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, raw] = await Promise.all([requireMember(), searchParams]);
  if (!canSeeCalls(staff)) redirect(homeFor(staff));
  const canPlan = canPlanCalls(staff);
  const seesAll = canSeeAllCalls(staff);
  const me = staff.email.toLowerCase();
  const now = istNow();
  const today = now.date;

  const asked = one(raw.view);
  const view: View = VIEWS.some((item) => item.key === asked) ? (asked as View) : "month";
  // The day the calendar is on (any day of the month or week shown).
  const date = (() => {
    const value = one(raw.date);
    if (!isDay(value)) return today;
    const earliest = `${shiftMonth(monthOf(today), -MONTHS_AWAY)}-01`;
    const latest = `${shiftMonth(monthOf(today), MONTHS_AWAY)}-01`;
    return value < earliest ? earliest : value > latest ? latest : value;
  })();
  const month = monthOf(date);
  const week = weekStart(date);
  const days = view === "month" ? monthGridDays(month) : view === "week" ? weekDays(week) : [date];
  const from = days[0];
  const to = days[days.length - 1];

  const [calls, changes, who] = await Promise.all([
    listCalls(),
    view === "list" ? Promise.resolve(null) : listChanges(from, to),
    callPeople(),
  ]);

  const all = calls.ok ? calls.rows : [];
  // Everyone starts on their own calls ("on a personal level, I can see
  // only the things that are related to me"). Only the founders and the
  // associate get anyone else's, and only when they ask for Everyone's.
  const whose: "mine" | "all" = seesAll && one(raw.who) === "all" ? "all" : "mine";
  const visible = seesAll ? all : all.filter((call) => isIn(call, me));
  const shown = whose === "mine" ? visible.filter((call) => isIn(call, me)) : visible;

  // Names for everyone the shown calls name, even people on no list.
  const known = new Map(who.people.map((person) => [person.email, person.name]));
  const names: Record<string, string> = {};
  for (const call of visible) {
    for (const email of [call.host, ...call.people]) {
      if (email) names[email] = known.get(email) || displayName({ email });
    }
  }
  if (canPlan) for (const person of who.people) names[person.email] = person.name;

  const href = (params: { view?: View | null; date?: string | null; who?: string | null }) => {
    const query = new URLSearchParams();
    const values = {
      view: view === "month" ? null : view,
      date: date === today ? null : date,
      who: whose === "all" ? "all" : null,
      ...params,
    };
    for (const [key, value] of Object.entries(values)) if (value) query.set(key, value);
    const text = query.toString();
    return `/calls${text ? `?${text}` : ""}`;
  };
  const dayHref = href({ view: "day", date: "{date}" }).replace("%7Bdate%7D", "{date}");

  let items: Occurrence[] = [];
  let next: Record<string, Occurrence | null> = {};
  let failed = calls.ok ? null : calls.message;
  if (view !== "list" && changes) {
    if (!changes.ok) failed ??= changes.message;
    items = occurrences(shown, changes.ok ? changes.rows : [], from, to);
  }
  if (view === "list" && shown.length) {
    const upcoming = await changesOf(
      shown.map((call) => call.id),
      today,
    );
    if (!upcoming.ok) failed ??= upcoming.message;
    next = Object.fromEntries(shown.map((call) => [call.id, nextOccurrence(call, upcoming.ok ? upcoming.rows : [], today)]));
  }

  // The period's own calls (a month view also shows the edges of the next and last months).
  const counted = items.filter((item) => !item.cancelled && (view !== "month" || item.day.startsWith(month)));
  const minutes = counted.reduce((sum, item) => sum + item.minutes, 0);
  const missing = !calls.ok && calls.missing;

  const period =
    view === "month"
      ? {
          label: monthLabel(month),
          sub: month === monthOf(today) ? "This month" : "",
          previous: href({ date: `${shiftMonth(month, -1)}-01` }),
          next: shiftMonth(month, 1) <= shiftMonth(monthOf(today), MONTHS_AWAY) ? href({ date: `${shiftMonth(month, 1)}-01` }) : null,
          noun: "month",
          current: month !== monthOf(today),
        }
      : view === "week"
        ? {
            label: weekLabel(week),
            sub: week === weekStart(today) ? "This week" : week === shiftWeek(weekStart(today), 1) ? "Next week" : "",
            previous: href({ date: shiftWeek(week, -1) }),
            next: href({ date: shiftWeek(week, 1) }),
            noun: "week",
            current: week !== weekStart(today),
          }
        : {
            label: dayLabel(date),
            sub: dayName(date, today),
            previous: href({ date: addDays(date, -1) }),
            next: href({ date: addDays(date, 1) }),
            noun: "day",
            current: date !== today,
          };

  // Mine / Everyone's: the founders and the associate only, Mine first.
  const whoToggle = seesAll ? (
    <nav aria-label="Whose calls" className="flex rounded-lg bg-[var(--i-sunken)] p-0.5 ring-1 ring-[var(--i-line)]">
      {(
        [
          { key: "mine", label: "Mine" },
          { key: "all", label: "Everyone's" },
        ] as const
      ).map((option) => (
        <Link
          key={option.key}
          href={href({ who: option.key === "all" ? "all" : null })}
          aria-current={whose === option.key ? "page" : undefined}
          className={cn(
            "rounded-md px-2.5 py-1 text-[12.5px] transition-colors",
            whose === option.key
              ? "bg-[var(--i-panel)] font-medium text-[var(--i-ink)] shadow-[var(--i-shadow-sm)]"
              : "text-[var(--i-muted)] hover:text-[var(--i-ink)]",
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  ) : null;

  return (
    <CallsProvider
      value={{
        calls: Object.fromEntries(visible.map((call) => [call.id, call])),
        names,
        // The form's people picker: planners only.
        people: canPlan ? who.people : [],
        team: who.team,
        me,
        canPlan,
        today,
        now,
      }}
    >
      <PageHeader
        eyebrow="Team"
        title="Calls"
        description={
          seesAll
            ? "Your internal Studio1 calls, in IST; switch to Everyone's to see every call. Everyone else sees only the calls they're in. Prospect, hiring and client calls stay in Google Calendar."
            : "Your internal Studio1 calls: when they are (IST), who's in and the link."
        }
        actions={canPlan && !missing ? <NewCallButton /> : null}
      />
      {failed ? (
        <div className="mb-4">
          <Notice tone="warning">{failed}</Notice>
        </div>
      ) : null}
      {!missing ? (
        <>
          <LinkTabs
            items={VIEWS.map((item) => ({
              key: item.key,
              label: item.label,
              count: item.key === "list" ? shown.length : undefined,
              href: href({ view: item.key === "month" ? null : item.key }),
            }))}
            active={view}
          />
          {view !== "list" ? (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <PeriodSwitcher
                  label={period.label}
                  sub={period.sub || undefined}
                  previous={period.previous}
                  next={period.next}
                  current={period.current ? href({ date: null }) : null}
                  currentLabel="Today"
                  noun={period.noun}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[12.5px] tabular-nums text-[var(--i-muted)]">
                    <span className="font-medium text-[var(--i-ink)]">{counted.length}</span> {counted.length === 1 ? "call" : "calls"}
                    {minutes ? <> · {lengthLabel(minutes)}</> : null}
                  </p>
                  {whoToggle}
                </div>
              </div>
              {view === "month" ? (
                <MonthCalendar key={month} month={month} days={days} items={items} dayHref={dayHref} />
              ) : (
                <TimeGrid days={days} items={items} dayHref={dayHref} />
              )}
              {!shown.length && calls.ok ? (
                <p className="mt-3 text-[12.5px] text-[var(--i-muted)]">
                  {!visible.length
                    ? canPlan
                      ? "No calls yet. Add the team's regular calls with New call; each person sees the ones they're in, here and on My day."
                      : "You're not in any calls yet. The founders or the founder's associate add them."
                    : "You're not in any calls. Switch to Everyone's to see the team's."}
                </p>
              ) : null}
            </>
          ) : (
            <>
              {whoToggle ? <div className="mb-3 flex justify-end">{whoToggle}</div> : null}
              <CallList ids={shown.map((call) => call.id)} next={next} />
              {canPlan && visible.length ? (
                <p className="mt-3 text-[12.5px] text-[var(--i-faint)]">
                  To change one day only (move it or call it off), open that day on the{" "}
                  <Link href={href({ view: null })} className="underline underline-offset-2 hover:text-[var(--i-ink)]">
                    calendar
                  </Link>
                  .
                </p>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </CallsProvider>
  );
}
