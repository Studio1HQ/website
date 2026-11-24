import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarBlank,
  CheckCircle,
} from "@/components/internal/icons";
import { requireCommunity } from "@/lib/internal/session";
import { hackathonBreakdown } from "@/lib/internal/data";
import { hackathonListHref } from "@/components/internal/hackathon-tabs";
import {
  incomplete,
  loadEvents,
  loadExpenses,
  loadGuestCounts,
  loadHackathonCounts,
  loadPartners,
  loadRecentActivity,
  loadSponsors,
  loadSponsorships,
  loadTasks,
  ownerChoices,
  peopleTotals,
  refOptions,
} from "@/lib/internal/community/data";
import {
  ACTIVITY_KINDS,
  EVENT_KINDS,
  addDays,
  formatDay,
  formatEventDate,
  formatTotals,
  isOwnedBy,
  labelOf,
  ownerName,
  relativeDay,
  sumMoney,
  todayKey,
} from "@/lib/internal/community/schema";
import {
  partnerFollowUpDue,
  phaseOf,
  sponsorFollowUpDue,
  sponsorshipsIn,
  turnouts,
} from "@/lib/internal/community/stats";
import { seesMoney } from "@/lib/internal/community/visibility";
import {
  Card,
  CardTitle,
  EmptyState,
  Notice,
  PageHeader,
} from "@/components/internal/ui";
import { cn } from "@/lib/utils";
import { TaskList } from "@/components/internal/community/lists";
import { QuickSelect } from "@/components/internal/community/quick-select";
import {
  DueDate,
  LoadNotice,
  Meter,
  MigrationNotice,
  Muted,
  Stat,
} from "@/components/internal/community/ui";

export const metadata: Metadata = { title: "Community" };

type Attention = {
  key: string;
  href: string;
  title: string;
  detail: string;
  day?: string | null;
};

export default async function CommunityOverview({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requireCommunity(), searchParams]);
  const canEdit = staff.community === "manager";
  // Interns: no money on this page, and only their own tasks (the loaders
  // below already leave both out for them).
  const money = seesMoney(staff.community);
  const today = todayKey();
  const [
    events,
    guestCounts,
    hackathonCounts,
    tasks,
    sponsors,
    partners,
    expenses,
    sponsorships,
    people,
    recent,
    refs,
    owners,
    registrations,
  ] = await Promise.all([
    loadEvents(staff.community),
    loadGuestCounts(),
    loadHackathonCounts(),
    loadTasks(staff),
    loadSponsors(staff.community),
    loadPartners(),
    loadExpenses(staff.community),
    loadSponsorships(staff.community),
    peopleTotals(),
    loadRecentActivity(8),
    refOptions(["event", "sponsor", "partner"]),
    ownerChoices(),
    hackathonBreakdown(),
  ]);

  const header = (
    <PageHeader
      eyebrow="Community"
      title="Overview"
      description="What's coming up, what needs a nudge today, and how the community is doing."
    />
  );
  if (!events.ok) {
    return (
      <>
        {header}
        <MigrationNotice message={events.message} />
      </>
    );
  }

  const turnout = turnouts(
    events.rows,
    guestCounts.ok ? guestCounts.rows : [],
    hackathonCounts.ok ? hackathonCounts.rows : [],
    today,
  );
  const upcoming = events.rows
    .filter((event) => phaseOf(event, today) === "upcoming")
    .sort((a, b) =>
      (a.starts_on ?? "9999").localeCompare(b.starts_on ?? "9999"),
    );
  const nextMonth = upcoming.filter(
    (event) => event.starts_on && event.starts_on <= addDays(today, 30),
  );
  const taskRows = tasks.ok ? tasks.rows : [];
  const openTasks = taskRows.filter((task) => task.status !== "done");
  const lateTasks = openTasks.filter(
    (task) => task.due_on && task.due_on < today,
  );
  const myTasks = taskRows.filter((task) => isOwnedBy(task.owner, staff.email));
  const year = today.slice(0, 4);
  const thisYearDeals = sponsorshipsIn(
    year,
    sponsorships.ok ? sponsorships.rows : [],
    events.rows,
  );
  // A read that failed shows as nothing; say so instead of "All clear".
  const partial =
    people === null ||
    !registrations.ok ||
    incomplete(
      events,
      guestCounts,
      hackathonCounts,
      tasks,
      sponsors,
      partners,
      expenses,
      sponsorships,
      recent,
    );
  const pastThisYear = events.rows.filter(
    (event) =>
      phaseOf(event, today) === "past" && event.starts_on?.slice(0, 4) === year,
  );
  const attendedThisYear = pastThisYear.reduce(
    (sum, event) => sum + (turnout.get(event.id)?.attended ?? 0),
    0,
  );

  // Everything that needs someone today, most urgent first.
  const attention: Attention[] = [];
  for (const sponsor of sponsors.ok ? sponsors.rows : []) {
    if (sponsorFollowUpDue(sponsor, today)) {
      attention.push({
        key: `s${sponsor.id}`,
        href: `/community/sponsors/${sponsor.id}`,
        title: `Follow up with ${sponsor.name}`,
        detail: sponsor.next_step || "Sponsor",
        day: sponsor.follow_up_on,
      });
    }
  }
  for (const partner of partners.ok ? partners.rows : []) {
    if (partnerFollowUpDue(partner, today)) {
      attention.push({
        key: `p${partner.id}`,
        href: `/community/campus/${partner.id}`,
        title: `Follow up with ${partner.name}`,
        detail: partner.next_step || "Campus partner",
        day: partner.follow_up_on,
      });
    }
  }
  for (const event of upcoming) {
    if (
      event.starts_on &&
      event.starts_on <= addDays(today, 14) &&
      (event.status === "planning" || event.status === "idea")
    ) {
      attention.push({
        key: `e${event.id}`,
        href: `/community/events/${event.id}`,
        title: `${event.name} isn't confirmed yet`,
        detail: `Starts ${relativeDay(event.starts_on, today).toLowerCase()}`,
        day: event.starts_on,
      });
    }
  }
  for (const event of events.rows) {
    if (phaseOf(event, today) === "past" && event.status !== "done") {
      attention.push({
        key: `d${event.id}`,
        href: `/community/events/${event.id}`,
        title: `Close out ${event.name}`,
        detail: "Mark it done and record who came",
        day: event.ends_on ?? event.starts_on,
      });
    }
  }
  for (const expense of money && expenses.ok ? expenses.rows : []) {
    if (
      expense.status === "to_pay" &&
      expense.due_on &&
      expense.due_on < today
    ) {
      attention.push({
        key: `x${expense.id}`,
        href: "/community/budget",
        title: `Pay ${expense.vendor || expense.description}`,
        detail: formatTotals({
          [expense.currency]: expense.amount ?? expense.expected_amount ?? 0,
        }),
        day: expense.due_on,
      });
    }
  }
  const sponsorNames = new Map(
    (sponsors.ok ? sponsors.rows : []).map((sponsor) => [
      sponsor.id,
      sponsor.name,
    ]),
  );
  for (const deal of money && sponsorships.ok ? sponsorships.rows : []) {
    if (
      (deal.status === "pledged" || deal.status === "invoiced") &&
      deal.due_on &&
      deal.due_on < today
    ) {
      attention.push({
        key: `c${deal.id}`,
        href: `/community/sponsors/${deal.sponsor_id}`,
        title: `Chase payment from ${sponsorNames.get(deal.sponsor_id) ?? "a sponsor"}`,
        detail:
          deal.amount !== null
            ? formatTotals({ [deal.currency]: deal.amount })
            : "In kind",
        day: deal.due_on,
      });
    }
  }
  // New site registrations, per hackathon: managers review and reply.
  if (canEdit && registrations.ok) {
    for (const hackathon of registrations.events) {
      const fresh = hackathon.byStatus.new ?? 0;
      if (!fresh) continue;
      attention.push({
        key: `h${hackathon.slug}`,
        href: hackathonListHref(hackathon.slug, "new"),
        title: `${fresh} new ${fresh === 1 ? "registration" : "registrations"} for ${hackathon.name}`,
        detail: hackathon.overdue
          ? `${hackathon.overdue} waiting over 5 days`
          : "Confirm, waitlist or reply",
        // Waiting ones first: they're as urgent as anything due today.
        day: hackathon.overdue ? addDays(today, -5) : today,
      });
    }
  }
  attention.sort((a, b) => (a.day ?? "").localeCompare(b.day ?? ""));

  const activityParent = (item: {
    sponsor_id: string | null;
    partner_id: string | null;
    event_id: string | null;
  }) => {
    if (item.sponsor_id)
      return {
        href: `/community/sponsors/${item.sponsor_id}`,
        name: sponsorNames.get(item.sponsor_id),
      };
    if (item.partner_id) {
      return {
        href: `/community/campus/${item.partner_id}`,
        name: (partners.ok ? partners.rows : []).find(
          (partner) => partner.id === item.partner_id,
        )?.name,
      };
    }
    if (item.event_id)
      return {
        href: `/community/events/${item.event_id}`,
        name: events.rows.find((event) => event.id === item.event_id)?.name,
      };
    return null;
  };

  return (
    <>
      {header}
      {params.denied !== undefined ? (
        <div className="mb-5">
          <Notice tone="warning">
            You can read the community pages but not change them. Ask an admin
            for the Community manager role.
          </Notice>
        </div>
      ) : null}
      <LoadNotice show={partial} />

      <div
        className={cn(
          "mb-6 grid grid-cols-2 gap-3",
          money ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        <Stat
          label="Coming up"
          value={nextMonth.length}
          note={`in the next 30 days · ${upcoming.length} planned`}
          href="/community/events"
        />
        <Stat
          label="People reached"
          value={people ? people.people.toLocaleString("en-IN") : "—"}
          note={
            people
              ? `${people.returning.toLocaleString("en-IN")} signed up more than once · ${attendedThisYear.toLocaleString("en-IN")} attended in ${year}`
              : "Guest lists and sign-ups"
          }
          href="/community/analytics"
        />
        {money ? (
          <Stat
            label={`Sponsorship ${year}`}
            value={formatTotals(sumMoney(thisYearDeals))}
            note={`${formatTotals(sumMoney(thisYearDeals.filter((deal) => deal.status === "paid")))} received`}
            href="/community/budget"
          />
        ) : null}
        <Stat
          label={canEdit ? "Open tasks" : "My open tasks"}
          value={openTasks.length}
          note={lateTasks.length ? `${lateTasks.length} late` : "None late"}
          accent={lateTasks.length > 0}
          href="/community/tasks"
        />
      </div>

      {/* Two columns that end level: the last card in each grows to fill. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardTitle
              action={
                <Link
                  href="/community/events"
                  className="inline-flex items-center gap-1 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
                >
                  All events <ArrowRight size={12} />
                </Link>
              }
            >
              Coming up
            </CardTitle>
            {upcoming.length ? (
              <ul className="divide-y divide-[var(--i-line)]">
                {upcoming.slice(0, 6).map((event) => {
                  const numbers = turnout.get(event.id)!;
                  return (
                    <li
                      key={event.id}
                      className="flex items-center gap-4 px-5 py-3"
                    >
                      <span className="w-14 shrink-0 text-center">
                        {event.starts_on ? (
                          <>
                            <span className="block text-[11px] uppercase tracking-[0.06em] text-[var(--i-muted)]">
                              {new Intl.DateTimeFormat("en-GB", {
                                month: "short",
                                timeZone: "UTC",
                              }).format(
                                new Date(`${event.starts_on}T00:00:00Z`),
                              )}
                            </span>
                            <span className="block text-[20px] font-medium leading-tight tabular-nums">
                              {Number(event.starts_on.slice(8))}
                            </span>
                          </>
                        ) : (
                          <span className="text-[12px] text-[var(--i-faint)]">
                            No date
                          </span>
                        )}
                      </span>
                      <Link
                        href={`/community/events/${event.id}`}
                        className="group min-w-0 flex-1"
                      >
                        <span className="block truncate text-[13.5px] font-medium group-hover:text-[var(--i-accent-text)]">
                          {event.name}
                        </span>
                        <span className="block truncate text-[12px] text-[var(--i-muted)]">
                          {[
                            labelOf(EVENT_KINDS, event.kind),
                            event.format === "online" ? "Online" : event.city,
                            event.starts_on
                              ? relativeDay(event.starts_on, today)
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </Link>
                      <span className="hidden w-32 shrink-0 text-[12.5px] sm:block">
                        {numbers.source === "none" ? (
                          <Muted>No sign-ups yet</Muted>
                        ) : (
                          <>
                            <span className="tabular-nums">
                              {numbers.signedUp.toLocaleString("en-IN")}
                            </span>
                            <Muted>
                              {" "}
                              {event.capacity
                                ? `/ ${event.capacity.toLocaleString("en-IN")}`
                                : "signed up"}
                            </Muted>
                            {event.capacity ? (
                              <span className="mt-1 block">
                                <Meter
                                  value={numbers.signedUp}
                                  max={event.capacity}
                                />
                              </span>
                            ) : null}
                          </>
                        )}
                      </span>
                      <QuickSelect
                        entity="event"
                        id={event.id}
                        value={event.status}
                        canEdit={canEdit}
                        label={`Status of ${event.name}`}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={<CalendarBlank size={20} />}
                title="Nothing planned yet"
              >
                {canEdit ? (
                  <>
                    Add the next meetup or hackathon on{" "}
                    <Link
                      href="/community/events"
                      className="underline underline-offset-2"
                    >
                      Events
                    </Link>
                    .
                  </>
                ) : undefined}
              </EmptyState>
            )}
          </Card>

          <Card className="lg:flex-1">
            <CardTitle>
              Needs attention{" "}
              <span className="font-normal text-[var(--i-faint)]">
                {attention.length}
              </span>
            </CardTitle>
            {attention.length ? (
              <ul className="divide-y divide-[var(--i-line)]">
                {attention.slice(0, 12).map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-5 py-2.5 text-[13px] hover:bg-[var(--i-hover)]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{item.title}</span>
                        <span className="block truncate text-[12px] text-[var(--i-muted)]">
                          {item.detail}
                        </span>
                      </span>
                      <DueDate day={item.day} today={today} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<CheckCircle size={20} />}
                title={partial ? "Nothing to show" : "All clear"}
              >
                {partial
                  ? "Not everything loaded, so there may be things waiting. Reload in a minute."
                  : "No follow-ups due, nothing late, every past event closed out."}
              </EmptyState>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <TaskList
            tasks={myTasks}
            me={staff.email}
            title="My tasks"
            showOwner={false}
            canEdit={canEdit}
            refs={refs}
            owners={owners}
            defaults={{ owner: staff.email }}
          />
          <Card className="flex flex-col lg:flex-1">
            <CardTitle>Latest outreach and notes</CardTitle>
            {recent.ok && recent.rows.length ? (
              <ul className="divide-y divide-[var(--i-line)]">
                {recent.rows.map((item) => {
                  const parent = activityParent(item);
                  return (
                    <li key={item.id} className="px-5 py-3">
                      <p className="text-[12px] text-[var(--i-muted)]">
                        {labelOf(ACTIVITY_KINDS, item.kind)} ·{" "}
                        {formatDay(item.happened_on, today)}
                        {item.created_by
                          ? ` · ${ownerName(item.created_by)}`
                          : ""}
                      </p>
                      {parent?.name ? (
                        <Link
                          href={parent.href}
                          className="text-[13px] font-medium hover:text-[var(--i-accent-text)]"
                        >
                          {parent.name}
                        </Link>
                      ) : null}
                      <p className="line-clamp-2 text-[13px] leading-relaxed text-[var(--i-ink-2)]">
                        {item.body}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
                Log emails, calls and meetings on a sponsor&apos;s or
                partner&apos;s page and they show up here.
              </p>
            )}
            {upcoming[0]?.starts_on ? (
              <p className="mt-auto border-t border-[var(--i-line)] px-5 py-3 text-[12.5px] text-[var(--i-muted)]">
                Next event:{" "}
                <span className="text-[var(--i-ink-2)]">
                  {formatEventDate(
                    upcoming[0].starts_on,
                    upcoming[0].ends_on,
                    today,
                  )}
                </span>
              </p>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}
