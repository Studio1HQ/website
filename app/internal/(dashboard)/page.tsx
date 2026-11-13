import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bank,
  Briefcase,
  CheckCircle,
  Compass,
  EnvelopeSimple,
  Handshake,
  IdentificationCard,
  NotePencil,
  Trophy,
  UserGear,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { CommunitySummaryCard } from "@/components/internal/community/summary-card";
import {
  Avatar,
  Card,
  CardTitle,
  EmptyState,
  Notice,
  StatusBadge,
  formatDate,
  relativeDate,
} from "@/components/internal/ui";
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

const AREAS: Record<AreaKey, { name: string; icon: Icon }> = {
  hiring: { name: "Hiring", icon: Briefcase },
  hackathons: { name: "Hackathons", icon: Trophy },
  blog: { name: "Blog", icon: NotePencil },
  team: { name: "Team", icon: IdentificationCard },
  money: { name: "Money", icon: Bank },
  community: { name: "Community", icon: Compass },
  access: { name: "Team access", icon: UserGear },
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
      <Link href={item.href} className="group flex items-center gap-3 px-5 py-3 hover:bg-[var(--i-hover)]">
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
          <span className="block truncate text-[13.5px] font-medium">{item.label}</span>
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

/** An area at a glance: its headline number and a few lines under it. */
function AreaCard({
  area,
  href,
  value,
  unit,
  rows,
  extra,
}: {
  area: AreaKey;
  href: string;
  value: React.ReactNode;
  unit: string;
  rows: [string, React.ReactNode][];
  extra?: React.ReactNode;
}) {
  const IconComponent = AREAS[area].icon;
  return (
    <Link href={href} className="group block">
      <Card className="flex h-full flex-col px-5 py-4 transition-colors group-hover:bg-[var(--i-hover)]">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--i-sunken)] text-[var(--i-ink-2)] ring-1 ring-inset ring-[var(--i-line)]">
            <IconComponent size={15} />
          </span>
          <h2 className="flex-1 text-[13px] font-medium">{AREAS[area].name}</h2>
          <ArrowRight size={13} className="text-[var(--i-faint)] group-hover:text-[var(--i-ink)]" />
        </div>
        <p className="mt-3 flex items-baseline gap-1.5">
          <span className="text-[24px] font-medium leading-none tabular-nums tracking-[-0.015em]">{value}</span>
          <span className="text-[13px] text-[var(--i-muted)]">{unit}</span>
        </p>
        {extra}
        {rows.length ? (
          <dl className="mt-3 space-y-1 border-t border-[var(--i-line)] pt-3 text-[12.5px]">
            {rows.map(([label, row]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <dt className="truncate text-[var(--i-muted)]">{label}</dt>
                <dd className="shrink-0 tabular-nums text-[var(--i-ink-2)]">{row}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Card>
    </Link>
  );
}

function Faces({ people }: { people: TeamPerson[] }) {
  if (people.length === 0) return null;
  return (
    <span className="mt-2.5 flex -space-x-1.5">
      {people.slice(0, 7).map((person) => (
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

/**
 * The dashboard's front page: everything the signed-in person can see, at a
 * glance. "Needs you" gathers the to-dos from every area; below it, one card
 * per area. Admins see every area; others only theirs. People with a single
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
  if (home !== "/internal") redirect(home);

  const data = await dashboardOverview(staff);
  const { hiring, blog, team, todo, now } = data;
  const firstName = (staff.person ? displayName(staff.person) : staff.email.split("@")[0].split(/[._+-]/)[0])
    .split(" ")[0]
    .replace(/^./, (letter) => letter.toUpperCase());
  const pipelinesOk = (hiring ? hiring.pipelines.every((pipeline) => pipeline.ok) : true) && data.hackathonsOk;
  const awaiting = hiring ? hiring.pipelines.reduce((sum, pipeline) => sum + pipeline.awaiting, 0) : 0;

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

      {/* Needs you */}
      <Card className="mb-5">
        <CardTitle>Needs you</CardTitle>
        {todo.length ? (
          <ul>
            {todo.map((item) => (
              <TodoRow key={`${item.area}-${item.label}`} item={item} />
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2.5 px-5 py-4 text-[13px] text-[var(--i-muted)]">
            <CheckCircle size={18} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
            All clear: nothing is waiting on you.
          </p>
        )}
      </Card>

      {/* Every area at a glance */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {hiring ? (
          <AreaCard
            area="hiring"
            href="/internal/jobs"
            value={number(awaiting)}
            unit="to review"
            rows={hiring.pipelines.map((pipeline) => [
              SECTIONS[pipeline.key].nav,
              pipeline.ok ? (
                <>
                  {pipeline.awaiting ? (
                    <span className="font-medium text-[var(--i-accent-text)]">{pipeline.awaiting} new</span>
                  ) : (
                    <span className="text-[var(--i-faint)]">0 new</span>
                  )}
                  <span className="text-[var(--i-faint)]"> · {number(pipeline.total)} total</span>
                </>
              ) : (
                "—"
              ),
            ])}
            extra={
              <p className="mt-1.5 text-[12px] text-[var(--i-faint)]">
                {number(hiring.pipelines.reduce((sum, pipeline) => sum + pipeline.lastWeek, 0))} received in the last 7 days
              </p>
            }
          />
        ) : null}

        {blog ? (
          <AreaCard
            area="blog"
            href="/internal/blog"
            value={blog.reviewer ? blog.inReview : blog.feedback}
            unit={blog.reviewer ? "waiting for review" : "with feedback"}
            rows={[
              ["Drafts", blog.drafts],
              ["Changes requested", blog.changes],
              ["Approved, not live yet", blog.approved],
              [`Published in ${monthLabel(now.date.slice(0, 7), true)}`, blog.publishedThisMonth],
            ]}
          />
        ) : null}

        {team?.ready && team.people === 0 ? (
          <AreaCard
            area="team"
            href="/internal/people?tab=directory"
            value="No one yet"
            unit="on the team list"
            extra={
              <p className="mt-1.5 text-[12px] text-[var(--i-faint)]">
                Add employees and interns to track attendance and payroll.
              </p>
            }
            rows={[]}
          />
        ) : team?.ready ? (
          <AreaCard
            area="team"
            href="/internal/people"
            value={team.working.length}
            unit={`of ${team.people} in today`}
            extra={<Faces people={team.working} />}
            rows={[
              ["On leave", team.leave.length],
              ["Not logged yet", team.notLogged.length],
            ]}
          />
        ) : data.mine ? (
          <AreaCard
            area="team"
            href="/internal/me"
            value={data.mine.day?.kind === "leave" ? "On leave" : (data.mine.day?.start_time ?? "Not started")}
            unit={data.mine.day?.start_time ? (data.mine.day.end_time ? `– ${data.mine.day.end_time}` : "started") : "today"}
            rows={[
              ...(data.mine.day?.start_time
                ? ([[data.mine.day.end_time ? "Active" : "So far", formatMinutes(data.mine.day.end_time ? data.mine.day.active_minutes : data.mine.soFar)]] as [string, React.ReactNode][])
                : []),
              ...(data.interns ? ([["Interns logged today", `${data.interns.logged} of ${data.interns.total}`]] as [string, React.ReactNode][]) : []),
            ]}
          />
        ) : data.interns ? (
          <AreaCard
            area="team"
            href="/internal/people"
            value={data.interns.logged}
            unit={`of ${data.interns.total} interns logged today`}
            rows={[]}
          />
        ) : null}

        {team?.ready ? (
          <AreaCard
            area="money"
            href="/internal/money"
            value={team.payments.ok ? money(team.payments.toPayByCurrency) : "—"}
            unit="to pay"
            rows={[
              ["Payments to make", team.payments.ok ? team.payments.toPay : "—"],
              [`Payslips sent · ${monthLabel(team.month, true)}`, `${team.payroll.sent} of ${team.payroll.salaried}`],
              ["Expense claims waiting", team.payroll.claimsWaiting],
              ...(team.payments.ok && team.payments.toReceive
                ? ([["From sponsors, to receive", money(team.payments.toReceiveByCurrency)]] as [string, React.ReactNode][])
                : []),
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
            rows={data.hackathons.slice(0, 4).map((event) => [
              event.name,
              <>
                {event.byStatus.new ? (
                  <span className="font-medium text-[var(--i-accent-text)]">{event.byStatus.new} new</span>
                ) : (
                  <span className="text-[var(--i-faint)]">0 new</span>
                )}
                <span className="text-[var(--i-faint)]">
                  {" "}
                  · {number(event.byStatus.confirmed ?? 0)} confirmed · {number(event.total)} total
                </span>
              </>,
            ])}
            extra={
              <p className="mt-1.5 text-[12px] text-[var(--i-faint)]">
                {number(data.hackathons.reduce((sum, event) => sum + event.lastWeek, 0))} registered in the last 7 days
                {data.hackathons.length > 4 ? ` · ${data.hackathons.length} hackathons` : ""}
              </p>
            }
          />
        ) : null}
      </div>

      {/* What came in lately */}
      {hiring ? (
        <div className={data.admin ? "grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : "grid items-start gap-4"}>
          <Card>
            <CardTitle>Latest applications</CardTitle>
            {!hiring.latestOk ? (
              <div className="p-4">
                <Notice tone="error">Couldn&apos;t load the latest entries.</Notice>
              </div>
            ) : hiring.latest.length === 0 ? (
              <EmptyState icon={<Briefcase size={20} />} title="No entries yet">
                New applications and registrations will show up here.
              </EmptyState>
            ) : (
              <ul>
                {hiring.latest.map((entry) => (
                  <li key={`${entry.section}-${entry.id}`} className="border-b border-[var(--i-line)] last:border-b-0">
                    <Link
                      href={`${SECTIONS[entry.section].path}/${entry.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--i-hover)]"
                    >
                      <Avatar name={entry.name} email={entry.email} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{entry.name || entry.email}</p>
                        <p className="truncate text-[12.5px] text-[var(--i-muted)]">
                          {SECTIONS[entry.section].nav} · {entry.program}
                        </p>
                      </div>
                      <StatusBadge status={entry.status} />
                      <span
                        className="hidden w-16 text-right text-[12.5px] text-[var(--i-muted)] sm:block"
                        title={formatDate(entry.createdAt)}
                      >
                        {relativeDate(entry.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {data.admin ? (
            <Card>
              <CardTitle>Audiences</CardTitle>
              <ul>
                {(
                  [
                    ["subscribers", hiring.subscribers, "opted in to future emails", EnvelopeSimple],
                    ["partner-pool", hiring.partners, "open to partner referrals", Handshake],
                  ] as const
                ).map(([key, value, label, IconComponent]) => (
                  <li key={key} className="border-b border-[var(--i-line)] last:border-b-0">
                    <Link href={SECTIONS[key].path} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--i-hover)]">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--i-sunken)] text-[var(--i-ink-2)] ring-1 ring-inset ring-[var(--i-line)]">
                        <IconComponent size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium">{SECTIONS[key].nav}</p>
                        <p className="text-[12px] text-[var(--i-muted)]">{label}</p>
                      </div>
                      <span className="text-[18px] font-medium tabular-nums">{number(value)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}

      {params.denied !== undefined ? (
        <p className="mt-5 text-[12.5px] text-[var(--i-muted)]">
          That page needs a higher role. Ask Arindam or Amitesh if you need it.
        </p>
      ) : null}
    </>
  );
}
