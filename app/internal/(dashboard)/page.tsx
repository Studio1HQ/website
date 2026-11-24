import type { Metadata } from "next";
import { OverviewTop } from "@/components/internal/overview-top";
import { OverviewStat } from "@/components/internal/overview-stat";
import { redirect } from "next/navigation";
import { CommunitySummaryCard } from "@/components/internal/community/summary-card";
import { Avatar, Notice } from "@/components/internal/ui";
import { change } from "@/lib/internal/trend";
import { dashboardOverview } from "@/lib/internal/overview";
import { SECTIONS } from "@/lib/internal/sections";
import { homeFor, requireMember } from "@/lib/internal/session";
import {
  dayLabel,
  displayName,
  formatMinutes,
  formatMoney,
  monthLabel,
  photoUrl,
} from "@/lib/internal/team/shared";

export const metadata: Metadata = { title: "Overview" };

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

/** The non-empty parts, joined into one short line ("3 at risk · 2 blocked"). */
function line(parts: (string | null | false | undefined | 0)[]) {
  const shown = parts.filter(Boolean);
  return shown.length ? shown.join(" · ") : null;
}

/**
 * The dashboard's front page, on one screen: what needs you and your own day
 * side by side, then one small tile per area (its number and one line).
 * Admins see every area; others only theirs. People with a single area (a
 * writer, a community manager, an employee) start on that area's own page
 * instead.
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
  const thisMonth = monthLabel(now.date.slice(0, 7), true);
  // Applications a day across the hiring pipelines, last 14 days.
  const applied = hiring
    ? Array.from({ length: 14 }, (_, day) => hiring.pipelines.reduce((sum, pipeline) => sum + (pipeline.daily[day] ?? 0), 0))
    : [];

  const clientFlags = data.clients?.ok
    ? line([
        data.clients.red ? `${data.clients.red} at risk` : null,
        data.clients.blocked ? `${data.clients.blocked} blocked` : null,
      ])
    : null;

  return (
    <>
      {/* The same greeting as My day. The avatar is as tall as the two lines
          beside it (28 + 4 + 16 = 48px), so their tops and bottoms line up. */}
      <header className="mb-5 flex min-w-0 items-center gap-3.5 md:pr-24">
        <Avatar
          name={staff.person ? displayName(staff.person) : firstName}
          email={staff.email}
          size={48}
          src={staff.person ? photoUrl(staff.person) : undefined}
        />
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-medium leading-[28px] tracking-[-0.02em] md:text-[26px]">
            {greeting(now.time)}, {firstName}
          </h1>
          <p className="mt-1 flex flex-col text-[14px] leading-[16px] text-[var(--i-ink-2)] opacity-80 max-sm:gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1.5">
            <span>{dayLabel(now.date, true)}</span>
            <span aria-hidden className="hidden sm:inline">·</span>
            <span>
              {todo.length
                ? `${todo.length} ${todo.length === 1 ? "thing needs" : "things need"} you.`
                : "Nothing needs you right now."}
            </span>
          </p>
        </div>
      </header>

      {!pipelinesOk ? (
        <div className="mb-4">
          <Notice tone="error">Some numbers couldn&apos;t be loaded from Supabase. The server log has the details.</Notice>
        </div>
      ) : null}

      {/* What needs you, and your own day beside it. */}
      <OverviewTop todo={todo} tasks={data.myTasks} calls={data.myCalls} />

      {/* Every area at a glance: its number and one line. The detail is on
          each area's page. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {hiring ? (
          <OverviewStat
            area="hiring"
            href="/jobs"
            value={number(awaiting)}
            unit="to review"
            note={pipelinesOk ? `${number(change(applied, 7).now)} applied in 7 days` : null}
          />
        ) : null}

        {blog ? (
          <OverviewStat
            area="blog"
            href="/blog"
            value={number(blog.reviewer ? blog.inReview : blog.feedback)}
            unit={blog.reviewer ? "waiting for review" : "with feedback"}
            note={
              blog.changes
                ? `${blog.changes} with changes asked`
                : line([
                    `${blog.publishedThisMonth} published in ${thisMonth}`,
                    blog.drafts ? `${blog.drafts} ${blog.drafts === 1 ? "draft" : "drafts"}` : null,
                  ])
            }
            flag={Boolean(blog.changes)}
          />
        ) : null}

        {team?.ready && team.people === 0 ? (
          <OverviewStat area="team" href="/people" value="—" unit="no one on the team list yet" />
        ) : team?.ready ? (
          <OverviewStat
            area="team"
            href="/people"
            value={number(team.working.length)}
            unit={`of ${team.people} in today`}
            note={
              line([
                team.notLogged.length ? `${team.notLogged.length} not logged yet` : null,
                team.leave.length ? `${team.leave.length} on leave` : null,
              ]) ?? "Everyone has logged"
            }
            flag={team.notLogged.length > 0}
          />
        ) : data.mine ? (
          <OverviewStat
            area="team"
            href="/me"
            value={data.mine.day?.kind === "leave" ? "On leave" : (data.mine.day?.start_time ?? "—")}
            unit={
              data.mine.day?.start_time
                ? data.mine.day.end_time
                  ? `– ${data.mine.day.end_time}`
                  : "started"
                : data.mine.day?.kind === "leave"
                  ? "today"
                  : "not started today"
            }
            note={line([
              data.mine.day?.start_time
                ? `${data.mine.day.end_time ? "Active" : "So far"} ${formatMinutes(data.mine.day.end_time ? data.mine.day.active_minutes : data.mine.soFar)}`
                : null,
              data.interns ? `${data.interns.logged} of ${data.interns.total} interns logged` : null,
            ])}
          />
        ) : data.interns ? (
          <OverviewStat
            area="team"
            href="/people"
            value={number(data.interns.logged)}
            unit={`of ${data.interns.total} interns logged today`}
          />
        ) : null}

        {team?.ready && team.money ? (
          <OverviewStat
            area="money"
            href="/money"
            value={team.money.payments.ok ? money(team.money.payments.toPayByCurrency) : "—"}
            unit="to pay"
            note={
              team.money.payroll.claimsWaiting
                ? `${team.money.payroll.claimsWaiting} ${team.money.payroll.claimsWaiting === 1 ? "claim" : "claims"} waiting`
                : `${team.money.payroll.sent} of ${team.money.payroll.salaried} payslips sent`
            }
            flag={team.money.payroll.claimsWaiting > 0}
          />
        ) : null}

        {data.clients?.ok ? (
          <OverviewStat
            area="clients"
            href="/clients"
            value={number(data.clients.active)}
            unit={data.clients.active === 1 ? "active engagement" : "active engagements"}
            note={clientFlags ?? `${number(data.clients.done)} of ${number(data.clients.planned)} pieces live`}
            flag={Boolean(clientFlags)}
          />
        ) : data.clients ? (
          <OverviewStat
            area="clients"
            href="/clients"
            value="—"
            unit={data.clients.missing ? "not set up yet" : "couldn't load"}
          />
        ) : null}

        {data.outreach ? (
          <OverviewStat
            area="outreach"
            href="/outreach"
            value={number(data.outreach.open)}
            unit="in play"
            note={
              data.outreach.followUpsDue
                ? `${data.outreach.followUpsDue} follow-ups due`
                : `${change(data.outreach.addedByWeek, 1).now} added this week`
            }
            flag={Boolean(data.outreach.followUpsDue)}
          />
        ) : null}

        {data.community ? <CommunitySummaryCard /> : null}

        {data.hackathons && data.hackathons.length ? (
          <OverviewStat
            area="hackathons"
            href={SECTIONS.hackathons.path}
            value={number(data.hackathons.reduce((sum, event) => sum + (event.byStatus.new ?? 0), 0))}
            unit="new to review"
            note={`${number(data.hackathons.reduce((sum, event) => sum + event.lastWeek, 0))} registered in 7 days`}
          />
        ) : null}

        {hiring && data.admin ? (
          <OverviewStat
            area="audiences"
            href={SECTIONS.subscribers.path}
            value={number(hiring.subscribers)}
            unit="subscribers"
            note={`${number(hiring.partners)} in the partner pool`}
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
