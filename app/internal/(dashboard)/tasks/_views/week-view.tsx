import { isDateKey, shiftWeek, weekDays, weekEnd, weekLabel, weekStart } from "@/lib/internal/clients/schema";
import { canMoveDeliverableDay } from "@/lib/internal/clients/rules";
import { canChangeTask, canGiveTask } from "@/lib/internal/tasks/access";
import { cardChoices, giveChoices, loadWeekCards, teammates } from "@/lib/internal/tasks/load";
import { weekTally } from "@/lib/internal/tasks/calendar";
import { tasksHref } from "@/lib/internal/tasks/shared";
import { Notice } from "@/components/internal/ui";
import { weekName } from "@/components/internal/clients/week-switcher";
import { PeriodSwitcher } from "@/components/internal/tasks/week-parts";
import { WeekCalendar } from "@/components/internal/tasks/week-calendar";
import type { ViewProps } from "./types";

/** How far ahead the calendar goes, for planning. */
const WEEKS_AHEAD = 8;

/** ?week= (any day of it), from long ago up to eight weeks ahead; this week by default. */
function weekFrom(value: string | undefined, today: string) {
  const current = weekStart(today);
  if (!isDateKey(value)) return current;
  const week = weekStart(value);
  const last = shiftWeek(current, WEEKS_AHEAD);
  return week > last ? last : week;
}

/**
 * The week, as a calendar: a column per day with that day's cards, the
 * way the old tracker looked. The person's own tasks, the client
 * deliverables they own and their community tasks, each on its day;
 * "+ New" on a day adds to it. On someone else's week, "+ New" gives them
 * a task (founders, the founder's associate, admins: canGiveTask) and the
 * cards the viewer may change (canChangeTask) open for editing.
 */
export async function WeekView({ staff, viewer, person, own, people, params, today }: ViewProps) {
  const current = weekStart(today);
  const week = weekFrom(params.week, today);
  const href = (target: string) => tasksHref({ week: target === current ? null : target, person: own ? null : person.email });
  const names = Object.fromEntries(people.map((item) => [item.email.toLowerCase(), item.name || item.email]));
  const canAdd = own || canGiveTask(viewer, person.email, person.guarded);

  const [data, options, team] = await Promise.all([
    loadWeekCards(
      person.email,
      week,
      today,
      names,
      (task) => canChangeTask(viewer, task),
      (deliverable, clientId) => canMoveDeliverableDay(staff, deliverable, clientId),
    ),
    // The same week as the cards, so its rows are read once.
    own ? cardChoices(staff, week) : canAdd ? giveChoices(staff) : Promise.resolve([]),
    teammates(),
  ]);
  const tally = weekTally(data.cards);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <PeriodSwitcher
          label={weekLabel(week)}
          sub={weekName(week, current)}
          previous={href(shiftWeek(week, -1))}
          next={week < shiftWeek(current, WEEKS_AHEAD) ? href(shiftWeek(week, 1)) : null}
          current={week !== current ? href(current) : null}
          currentLabel="This week"
          noun="week"
        />
        <p className="text-[12.5px] tabular-nums text-[var(--i-muted)]">
          <span className="font-medium text-[var(--i-ink)]">{tally.done}</span> done ·{" "}
          <span className="font-medium text-[var(--i-ink)]">{tally.doing}</span> in progress ·{" "}
          <span className="font-medium text-[var(--i-ink)]">{tally.todo}</span> not started
        </p>
      </div>
      {data.missing ? (
        <Notice tone="warning">{data.failed}</Notice>
      ) : (
        <>
          {data.failed ? (
            <div className="mb-3">
              <Notice tone="warning">{data.failed} Some cards may be missing.</Notice>
            </div>
          ) : null}
          {/* Keyed by whose week and which: an open "+ New" draft never carries over to another person or week. */}
          <WeekCalendar
            key={`${person.email}:${week}`}
            days={weekDays(week)}
            today={today}
            cards={data.cards}
            tray={data.tray}
            options={options}
            own={own}
            canAdd={canAdd}
            person={own ? undefined : { email: person.email, name: person.name || person.email }}
            who={person.email.toLowerCase()}
            team={team}
          />
        </>
      )}
      {own && weekEnd(week) >= today ? (
        <p className="mt-1 text-[12px] text-[var(--i-faint)]">
          Tag a card with a client and it shows on that client&apos;s page too. Your client deliverables and community
          tasks appear on their due days by themselves.
        </p>
      ) : null}
    </>
  );
}
