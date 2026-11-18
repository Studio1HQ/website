import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bank,
  Briefcase,
  CalendarBlank,
  CheckCircle,
  Compass,
  EnvelopeSimple,
  Binoculars,
  Folders,
  IdentificationCard,
  Kanban,
  NotePencil,
  Trophy,
  UserGear,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { CommunitySummaryCard } from "@/components/internal/community/summary-card";
import { Avatar, Card, CardTitle, Notice } from "@/components/internal/ui";
import { Meter } from "@/components/internal/community/ui";
import { Sparkline, Trend } from "@/components/internal/sparkline";
import { timeRange } from "@/lib/internal/calls/shared";
import { change } from "@/lib/internal/trend";
import { dashboardOverview, type AreaKey, type Attention } from "@/lib/internal/overview";
import { SECTIONS } from "@/lib/internal/sections";
import { homeFor, requireMember } from "@/lib/internal/session";
import {
  dayLabel,
  displayName,
  formatMinutes,
  formatMoney,
  monthLabel,
  photoUrl,
  type TeamPerson,
} from "@/lib/internal/team/shared";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

type CardKey = AreaKey | "audiences";

const AREAS: Record<CardKey, { name: string; icon: Icon }> = {
  hiring: { name: "Hiring", icon: Briefcase },
  hackathons: { name: "Hackathons", icon: Trophy },
  blog: { name: "Blog", icon: NotePencil },
  team: { name: "Team", icon: IdentificationCard },
  money: { name: "Money", icon: Bank },
  community: { name: "Community", icon: Compass },
  clients: { name: "Clients", icon: Folders },
  outreach: { name: "Outreach", icon: Binoculars },
  access: { name: "Team access", icon: UserGear },
  audiences: { name: "Audiences", icon: EnvelopeSimple },
};

function greeting(time: string) {
  const hour = Number(time.slice(0, 2));
  return hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function number(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : value.toLocaleString("en-IN");
}

function money(byCurrency: Record<string, number>) {
  const entries = Object.entries(byCurrency).filter(([, amount]) => amount > 0);
  return entries.length ? entries.map(([currency, amount]) => formatMoney(amount, currency)).join(" + ") : formatMoney(0);
}

/** One to-do in "Needs you": the area, what's waiting, and where to act. */
function TodoRow({ item }: { item: Attention }) {
  const area = AREAS[item.area];
  const IconComponent = area.icon;
  return (
    <li className="border-b border-[var(--i-line)] last:border-b-0">
      <Link href={item.href} className="group flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--i-hover)]">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
            item.urgent
              ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25"
              : "bg-[var(--i-sunken)] text-[var(--i-ink-2)] ring-[var(--i-line)]",
          )}
        >
          <IconComponent size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium leading-snug">{item.label}</span>
          <span className="block truncate text-[12px] text-[var(--i-muted)]">
            {area.name}
            {item.detail ? (
              <span className={item.urgent ? "text-amber-700 dark:text-amber-300" : undefined}> · {item.detail}</span>
            ) : null}
          </span>
        </span>
        <ArrowRight size={14} className="shrink-0 text-[var(--i-faint)] group-hover:text-[var(--i-ink)]" />
      </Link>
    </li>
  );
}

/**
 * An area at a glance, kept short: its headline number, a small chart or
 * faces beside it when there's one, and a line of notes (an up or down
 * arrow first, when the area has a trend).
 */
function AreaCard({
  area,
  href,
  value,
  unit,
  chart,
  trend,
  notes = [],
  extra,
}: {
  area: CardKey;
  href: string;
  value: React.ReactNode;
  unit: string;
  /** Beside the number: a sparkline, or the people in today. */
  chart?: React.ReactNode;
  trend?: React.ReactNode;
  /** Short facts under the number; empty ones are dropped. */
  notes?: (React.ReactNode | null | false | undefined | 0)[];
  extra?: React.ReactNode;
}) {
  const IconComponent = AREAS[area].icon;
  const shown = notes.filter(Boolean);
  return (
    <Link href={href} className="group block">
      <Card className="flex h-full flex-col px-4 py-3.5 transition-colors group-hover:bg-[var(--i-hover)]">
        <div className="flex items-center gap-2">
          <IconComponent size={15} className="text-[var(--i-muted)]" />
          <h2 className="flex-1 text-[12.5px] font-medium text-[var(--i-ink-2)]">{AREAS[area].name}</h2>
          <ArrowRight size={12} className="text-[var(--i-faint)] group-hover:text-[var(--i-ink)]" />
        </div>
        <div className="mt-2.5 flex items-end justify-between gap-3">
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
            <span className="text-[22px] font-medium leading-none tracking-[-0.015em]">{value}</span>
            <span className="text-[12.5px] text-[var(--i-muted)]">{unit}</span>
          </p>
          {chart}
        </div>
        {extra}
        {trend || shown.length ? (
          <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] leading-snug text-[var(--i-muted)]">
            {trend}
            {shown.map((note, index) => (
              <span key={index}>{note}</span>
            ))}
          </p>
        ) : null}
      </Card>
    </Link>
  );
}

/** "2 at risk": a count that stands out, for the notes line. */
function Flag({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-[var(--i-accent-text)]">{children}</span>;
}

function Faces({ people }: { people: TeamPerson[] }) {
  if (people.length === 0) return null;
  return (
    <span className="flex shrink-0 -space-x-1.5">
      {people.slice(0, 5).map((person) => (
        <Avatar
          key={person.email}
          name={displayName(person)}
          email={person.email}
          size={24}
          src={photoUrl(person)}
          className="ring-2 ring-[var(--i-panel)]"
        />
      ))}
    </span>
  );
}

/** A "today" card: a titled list with a link to the page it comes from. */
function TodayCard({
  title,
  href,
  linkLabel,
  children,
}: {
  title: React.ReactNode;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardTitle
        action={
          <Link href={href} className="inline-flex items-center gap-1 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]">
            {linkLabel} <ArrowRight size={12} />
          </Link>
        }
      >
        {title}
      </CardTitle>
      {children}
    </Card>
  );
}

function TodayEmpty({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-6 text-center text-[13px] text-[var(--i-muted)]">
      {icon ? <span className="text-[var(--i-faint)]">{icon}</span> : null}
      <p>{children}</p>
    </div>
  );
}

/**
 * The dashboard's front page: everything the signed-in person can see, at a
 * glance. "Needs you" gathers the to-dos from every area; under it, your own
 * tasks and calls for today; below that, one card per area. Admins see every area; others only theirs. People with a single
 * area (a writer, a community manager, an employee) start on that area's
 * own page instead.
 */
export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requireMember(), searchParams]);
  const home = homeFor(staff);
  if (home !== "/") redirect(home);

  const data = await dashboardOverview(staff);
  const { hiring, blog, team, todo, now } = data;
  const firstName = (staff.person ? displayName(staff.person) : staff.email.split("@")[0].split(/[._+-]/)[0])
    .split(" ")[0]
    .replace(/^./, (letter) => letter.toUpperCase());
  const pipelinesOk = (hiring ? hiring.pipelines.every((pipeline) => pipeline.ok) : true) && data.hackathonsOk;
  const awaiting = hiring ? hiring.pipelines.reduce((sum, pipeline) => sum + pipeline.awaiting, 0) : 0;
  // How many of the two "today" cards sit beside Needs you.
  const today = (data.myTasks ? 1 : 0) + (data.myCalls ? 1 : 0);
  const thisMonth = monthLabel(now.date.slice(0, 7), true);
  // Applications a day across the hiring pipelines, last 14 days.
  const applied = hiring
    ? Array.from({ length: 14 }, (_, day) => hiring.pipelines.reduce((sum, pipeline) => sum + (pipeline.daily[day] ?? 0), 0))
    : [];

  return (
    <>
      <header className="mb-6">
        <p className="mb-1.5 text-[12.5px] text-[var(--i-muted)]">{dayLabel(now.date, true)}</p>
        <h1 className="text-[24px] font-medium leading-tight tracking-[-0.015em]">
          {greeting(now.time)}, {firstName}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-[var(--i-muted)]">
          {todo.length
            ? `${todo.length} ${todo.length === 1 ? "thing needs" : "things need"} you. Everything else is below.`
            : "Nothing needs you right now. Here's where everything stands."}
        </p>
      </header>

      {!pipelinesOk ? (
        <div className="mb-5">
          <Notice tone="error">Some numbers couldn&apos;t be loaded from Supabase. The server log has the details.</Notice>
        </div>
      ) : null}

      {/* The top row: what needs you, and your own day beside it */}
      <div
        className={cn(
          "mb-4 grid gap-4",
          today === 2 ? "lg:grid-cols-2 xl:grid-cols-3" : today === 1 ? "lg:grid-cols-2" : null,
        )}
      >
      <Card className={cn("flex h-full flex-col", today === 2 ? "lg:col-span-2 xl:col-span-1" : null)}>
        <CardTitle>Needs you</CardTitle>
        {todo.length ? (
          <ul>
            {todo.map((item) => (
              <TodoRow key={`${item.area}-${item.label}`} item={item} />
            ))}
          </ul>
        ) : (
          <TodayEmpty icon={<CheckCircle size={22} weight="fill" className="text-emerald-600 dark:text-emerald-400" />}>
            All clear: nothing is waiting on you.
          </TodayEmpty>
        )}
      </Card>

          {data.myTasks ? (
            <TodayCard
              title={
                <>
                  <Kanban size={14} className="mr-2 inline align-[-2px] text-[var(--i-muted)]" />
                  Your tasks today
                </>
              }
              href="/tasks"
              linkLabel="All tasks"
            >
              {!data.myTasks.ok ? (
                <TodayEmpty>Couldn&apos;t load your tasks.</TodayEmpty>
              ) : data.myTasks.items.length === 0 ? (
                <TodayEmpty icon={<CheckCircle size={22} />}>Nothing due today, and nothing late.</TodayEmpty>
              ) : (
                <ul>
                  {data.myTasks.items.map((task) => (
                    <li key={task.id} className="border-b border-[var(--i-line)] last:border-b-0">
                      <Link href="/tasks" className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--i-hover)]">
                        <span
                          aria-hidden
                          className={cn("size-1.5 shrink-0 rounded-full", task.late ? "bg-amber-500" : "bg-[var(--i-faint)]")}
                        />
                        <span className="min-w-0 flex-1 truncate text-[13px]">{task.title}</span>
                        {task.blocked ? <span className="shrink-0 text-[12px] text-[var(--i-muted)]">Blocked</span> : null}
                        <span
                          className={cn(
                            "shrink-0 text-[12px] tabular-nums",
                            task.late ? "text-amber-700 dark:text-amber-300" : "text-[var(--i-muted)]",
                          )}
                        >
                          {task.late ? `Late · ${dayLabel(task.due_on)}` : "Today"}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {data.myTasks.more ? (
                    <li>
                      <Link href="/tasks" className="block px-5 py-2.5 text-[12.5px] text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]">
                        and {data.myTasks.more} more
                      </Link>
                    </li>
                  ) : null}
                </ul>
              )}
            </TodayCard>
          ) : null}

          {data.myCalls ? (
            <TodayCard
              title={
                <>
                  <CalendarBlank size={14} className="mr-2 inline align-[-2px] text-[var(--i-muted)]" />
                  Your calls today
                </>
              }
              href="/calls"
              linkLabel="Calendar"
            >
              {!data.myCalls.ok ? (
                <TodayEmpty>Couldn&apos;t load your calls.</TodayEmpty>
              ) : data.myCalls.items.length === 0 ? (
                <TodayEmpty icon={<CalendarBlank size={22} />}>No calls today.</TodayEmpty>
              ) : (
                <ul>
                  {data.myCalls.items.map((call) => (
                    <li key={call.key} className="flex items-center border-b border-[var(--i-line)] last:border-b-0">
                      <Link
                        href="/calls?view=day"
                        className={cn("flex min-w-0 flex-1 items-center gap-3 px-5 py-2.5 hover:bg-[var(--i-hover)]", call.over ? "opacity-55" : null)}
                      >
                        <span className="w-[6.5rem] shrink-0 text-[12.5px] tabular-nums text-[var(--i-muted)]">
                          {timeRange(call.start, call.minutes)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px]">{call.title}</span>
                        {call.over ? <span className="shrink-0 text-[12px] text-[var(--i-muted)]">Done</span> : null}
                      </Link>
                      {!call.over && /^https?:\/\//.test(call.link) ? (
                        <a
                          href={call.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mr-4 shrink-0 rounded-md px-2 py-1 text-[12.5px] font-medium text-[var(--i-accent-text)] hover:bg-[var(--i-accent-soft)]"
                        >
                          Join
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </TodayCard>
          ) : null}
      </div>

      {/* Every area at a glance */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {hiring ? (
          <AreaCard
            area="hiring"
            href="/jobs"
            value={number(awaiting)}
            unit="to review"
            chart={pipelinesOk ? <Sparkline points={applied} label="Applications a day, last 14 days" /> : null}
            trend={pipelinesOk ? <Trend delta={change(applied, 7).delta} against="last week" /> : null}
            notes={[`${number(change(applied, 7).now)} in 7 days`]}
          />
        ) : null}

        {blog ? (
          <AreaCard
            area="blog"
            href="/blog"
            value={blog.reviewer ? blog.inReview : blog.feedback}
            unit={blog.reviewer ? "waiting for review" : "with feedback"}
            chart={<Sparkline points={blog.publishedByMonth} label="Posts published a month, last 6 months" />}
            trend={<Trend delta={change(blog.publishedByMonth, 1).delta} against="last month" />}
            notes={[
              `${blog.publishedThisMonth} published in ${thisMonth}`,
              blog.drafts ? `${blog.drafts} ${blog.drafts === 1 ? "draft" : "drafts"}` : null,
              blog.changes ? `${blog.changes} with changes asked` : null,
              blog.approved ? `${blog.approved} approved, not live` : null,
            ]}
          />
        ) : null}

        {team?.ready && team.people === 0 ? (
          <AreaCard
            area="team"
            href="/people"
            value="No one yet"
            unit="on the team list"
            notes={["Add employees and interns to track attendance and payroll."]}
          />
        ) : team?.ready ? (
          <AreaCard
            area="team"
            href="/people"
            value={team.working.length}
            unit={`of ${team.people} in today`}
            chart={<Faces people={team.working} />}
            notes={[
              team.leave.length ? `${team.leave.length} on leave` : null,
              team.notLogged.length ? `${team.notLogged.length} not logged yet` : "Everyone has logged",
            ]}
          />
        ) : data.mine ? (
          <AreaCard
            area="team"
            href="/me"
            value={data.mine.day?.kind === "leave" ? "On leave" : (data.mine.day?.start_time ?? "Not started")}
            unit={data.mine.day?.start_time ? (data.mine.day.end_time ? `– ${data.mine.day.end_time}` : "started") : "today"}
            notes={[
              data.mine.day?.start_time
                ? `${data.mine.day.end_time ? "Active" : "So far"} ${formatMinutes(data.mine.day.end_time ? data.mine.day.active_minutes : data.mine.soFar)}`
                : null,
              data.interns ? `${data.interns.logged} of ${data.interns.total} interns logged today` : null,
            ]}
          />
        ) : data.interns ? (
          <AreaCard
            area="team"
            href="/people"
            value={data.interns.logged}
            unit={`of ${data.interns.total} interns logged today`}
          />
        ) : null}

        {team?.ready && team.money ? (
          <AreaCard
            area="money"
            href="/money"
            value={team.money.payments.ok ? money(team.money.payments.toPayByCurrency) : "—"}
            unit="to pay"
            notes={[
              team.money.payments.ok && team.money.payments.toPay
                ? `${team.money.payments.toPay} ${team.money.payments.toPay === 1 ? "payment" : "payments"}`
                : null,
              `${team.money.payroll.sent} of ${team.money.payroll.salaried} payslips sent`,
              team.money.payroll.claimsWaiting ? <Flag>{team.money.payroll.claimsWaiting} claims waiting</Flag> : null,
              team.money.payments.ok && team.money.payments.toReceive
                ? `${money(team.money.payments.toReceiveByCurrency)} to receive`
                : null,
            ]}
          />
        ) : null}

        {data.clients?.ok ? (
          <AreaCard
            area="clients"
            href="/clients"
            value={number(data.clients.active)}
            unit={data.clients.active === 1 ? "active engagement" : "active engagements"}
            extra={
              <div className="mt-2.5">
                <Meter
                  value={data.clients.done}
                  max={data.clients.planned}
                  label={`${data.clients.done} of ${data.clients.planned} planned pieces live in ${thisMonth}`}
                />
              </div>
            }
            notes={[
              `${number(data.clients.done)} of ${number(data.clients.planned)} pieces live`,
              data.clients.red ? <Flag>{data.clients.red} at risk</Flag> : null,
              data.clients.blocked ? <Flag>{data.clients.blocked} blocked</Flag> : null,
              data.clients.amber ? `${data.clients.amber} need a look` : null,
              data.clients.inClientReview ? `${data.clients.inClientReview} with clients` : null,
            ]}
          />
        ) : data.clients ? (
          <AreaCard
            area="clients"
            href="/clients"
            value="—"
            unit={data.clients.missing ? "not set up yet" : "couldn't load"}
          />
        ) : null}

        {data.outreach ? (
          <AreaCard
            area="outreach"
            href="/outreach"
            value={number(data.outreach.open)}
            unit="in play"
            chart={<Sparkline points={data.outreach.addedByWeek} label="Organisations added a week, last 8 weeks" />}
            trend={<Trend delta={change(data.outreach.addedByWeek, 1).delta} against="last week" />}
            notes={[
              `${change(data.outreach.addedByWeek, 1).now} added this week`,
              data.outreach.followUpsDue ? <Flag>{data.outreach.followUpsDue} follow-ups due</Flag> : null,
              data.outreach.callBooked ? `${data.outreach.callBooked} calls booked` : null,
              data.outreach.proposal ? `${data.outreach.proposal} proposals out` : null,
              data.outreach.wonThisMonth ? `${data.outreach.wonThisMonth} won in ${thisMonth}` : null,
            ]}
          />
        ) : null}

        {data.community ? <CommunitySummaryCard /> : null}

        {data.hackathons && data.hackathons.length ? (
          <AreaCard
            area="hackathons"
            href={SECTIONS.hackathons.path}
            value={number(data.hackathons.reduce((sum, event) => sum + (event.byStatus.new ?? 0), 0))}
            unit="new to review"
            notes={[
              `${number(data.hackathons.reduce((sum, event) => sum + event.lastWeek, 0))} registered in 7 days`,
              `${number(data.hackathons.reduce((sum, event) => sum + (event.byStatus.confirmed ?? 0), 0))} confirmed`,
              data.hackathons.length > 1 ? `${data.hackathons.length} hackathons` : null,
            ]}
          />
        ) : null}

        {hiring && data.admin ? (
          <AreaCard
            area="audiences"
            href={SECTIONS.subscribers.path}
            value={number(hiring.subscribers)}
            unit="subscribers"
            notes={[`${number(hiring.partners)} in the partner pool`]}
          />
        ) : null}
      </div>

      {params.denied !== undefined ? (
        <p className="mt-5 text-[12.5px] text-[var(--i-muted)]">
          That page needs a higher role. Ask Arindam, Amitesh or an admin if you need it.
        </p>
      ) : null}
    </>
  );
}
