import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowSquareOut,
  ChartBar,
  PencilSimple,
  Trophy,
} from "@phosphor-icons/react/dist/ssr";
import { requireCommunity } from "@/lib/internal/session";
import { hackathonBreakdown, hackathonRegistrationsFor } from "@/lib/internal/data";
import { doorCounts, doorRows, type SiteRegistration } from "@/lib/internal/community/door";
import { statusLabel } from "@/lib/internal/sections";
import {
  getRecord,
  incomplete,
  loadActivity,
  loadEventPartners,
  loadExpenses,
  loadGuests,
  loadHackathonCounts,
  loadPartners,
  loadSponsors,
  loadSponsorships,
  loadTasks,
  ownerChoices,
  refOptions,
} from "@/lib/internal/community/data";
import {
  EVENT_FORMATS,
  EVENT_KINDS,
  EVENT_PARTNERS_MIGRATION_HINT,
  PARTNER_KINDS,
  formatEventDate,
  formatTotals,
  inCurrency,
  labelOf,
  percent,
  relativeDay,
  todayKey,
  turnoutOf,
  type CommunityEvent,
  type GuestCounts,
  type Partner,
} from "@/lib/internal/community/schema";
import {
  costPerHead,
  moneyOf,
  phaseOf,
  subtractMoney,
} from "@/lib/internal/community/stats";
import {
  Card,
  CardTitle,
  ExternalLink,
  Field,
  Fields,
  PageHeader,
  StatusDot,
  TagChip,
  buttonClass,
  safeUrl,
} from "@/components/internal/ui";
import { hackathonListHref } from "@/components/internal/hackathon-tabs";
import { ActivityLog } from "@/components/internal/community/activity-log";
import { GuestList } from "@/components/internal/community/guest-list";
import {
  EventPartnerList,
  ExpenseList,
  SponsorshipList,
  TaskList,
} from "@/components/internal/community/lists";
import { QuickSelect } from "@/components/internal/community/quick-select";
import { RecordDialog } from "@/components/internal/community/record-dialog";
import {
  LoadNotice,
  Meter,
  MigrationNotice,
  Owner,
  Stat,
} from "@/components/internal/community/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  // The title is data too: check the role before reading the record.
  const [, { id }] = await Promise.all([requireCommunity(), params]);
  const event = await getRecord<CommunityEvent>("event", id);
  return { title: event?.name ?? "Event" };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [staff, { id }] = await Promise.all([requireCommunity(), params]);
  const event = await getRecord<CommunityEvent>("event", id);
  if (!event) notFound();
  const canEdit = staff.community === "manager";
  const today = todayKey();

  const [
    guests,
    hackathons,
    partner,
    expenses,
    sponsorships,
    sponsors,
    tasks,
    activity,
    refs,
    owners,
    breakdown,
    links,
    allPartners,
    siteRows,
  ] = await Promise.all([
    loadGuests(event.id),
    event.hackathon_slug ? loadHackathonCounts() : Promise.resolve(null),
    event.partner_id
      ? getRecord<Partner>("partner", event.partner_id)
      : Promise.resolve(null),
    loadExpenses({ event_id: event.id }),
    loadSponsorships({ event_id: event.id }),
    loadSponsors(),
    loadTasks({ event_id: event.id }),
    loadActivity({ event_id: event.id }),
    refOptions(["event", "partner", "sponsor", "hackathon"]),
    ownerChoices(),
    event.hackathon_slug ? hackathonBreakdown() : Promise.resolve(null),
    loadEventPartners({ event_id: event.id }),
    loadPartners(),
    event.hackathon_slug ? hackathonRegistrationsFor(event.hackathon_slug) : Promise.resolve(null),
  ]);

  if (!guests.ok) {
    return <MigrationNotice message={guests.message} />;
  }

  const guestRows = guests.rows;
  // A hackathon's site registrations join its guest list at the door.
  const registrationRows: SiteRegistration[] | undefined = siteRows?.ok
    ? siteRows.rows.map((row) => ({
        id: String(row.id),
        created_at: String(row.created_at ?? ""),
        name: String(row.name ?? ""),
        email: String(row.email ?? ""),
        github: String(row.github ?? ""),
        team: String(row.team ?? ""),
        team_name: String(row.team_name ?? ""),
        track: String(row.track ?? ""),
        review_status: String(row.review_status ?? "new"),
      }))
    : undefined;
  // Each person once, across the guest list and the site registrations.
  const counts: GuestCounts = doorCounts(doorRows(guestRows, registrationRows ?? []));
  const hackathon = hackathons?.ok
    ? hackathons.rows.find((row) => row.hackathon_slug === event.hackathon_slug)
    : undefined;
  // With the registrations in the counts above, the per-hackathon view would
  // count them twice.
  const turnout = turnoutOf(event, counts, registrationRows ? undefined : hackathon, today);
  // This hackathon's site registrations by review status.
  const registrations =
    breakdown?.ok && event.hackathon_slug
      ? breakdown.events.find((item) => item.slug === event.hackathon_slug)
      : undefined;
  const partnerNames = Object.fromEntries(
    (allPartners.ok ? allPartners.rows : []).map((item) => [item.id, item.name]),
  );
  const money = moneyOf(
    expenses.ok ? expenses.rows : [],
    sponsorships.ok ? sponsorships.rows : [],
  );
  const currency = event.currency;
  const spent = inCurrency(money.spent, currency);
  const projected = spent + inCurrency(money.planned, currency);
  const net = subtractMoney(money.income, money.spent);
  const perHead = costPerHead(money.spent, turnout.attended, currency);
  const phase = phaseOf(event, today);
  const sponsorNames = Object.fromEntries(
    (sponsors.ok ? sponsors.rows : []).map((sponsor) => [
      sponsor.id,
      sponsor.name,
    ]),
  );

  // Only ever link out to a real web address.
  const registrationUrl = safeUrl(event.registration_url);
  const where = [event.venue, event.city].filter(Boolean).join(", ");
  const subtitle = [
    formatEventDate(event.starts_on, event.ends_on, today) +
      (event.start_time ? `, ${event.start_time.slice(0, 5)}` : ""),
    labelOf(EVENT_KINDS, event.kind),
    event.format === "online"
      ? "Online"
      : [where, event.format === "hybrid" ? "Hybrid" : ""]
          .filter(Boolean)
          .join(" · "),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href="/internal/community/events"
            className="inline-flex items-center gap-1 hover:text-[var(--i-ink)]"
          >
            <ArrowLeft size={13} /> Events
          </Link>
        }
        title={event.name}
        description={
          <>
            {subtitle}
            {phase === "upcoming" && event.starts_on ? (
              <span className="ml-1.5 text-[var(--i-faint)]">
                ({relativeDay(event.starts_on, today).toLowerCase()})
              </span>
            ) : null}
          </>
        }
        actions={
          <>
            <QuickSelect
              entity="event"
              id={event.id}
              value={event.status}
              canEdit={canEdit}
              label="Event status"
            />
            <Link href={`/internal/community/events/${event.id}/report`} className={buttonClass("secondary")}>
              <ChartBar size={14} /> Report
            </Link>
            {registrationUrl ? (
              <a
                href={registrationUrl.toString()}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className={buttonClass("secondary")}
              >
                <ArrowSquareOut size={14} /> Registration page
              </a>
            ) : null}
            <RecordDialog
              entity="event"
              record={event}
              refs={refs}
              owners={owners}
              readOnly={!canEdit}
              deletedHref="/internal/community/events"
              trigger={
                <button
                  type="button"
                  className={buttonClass(canEdit ? "primary" : "secondary")}
                >
                  <PencilSimple size={14} /> {canEdit ? "Edit" : "Details"}
                </button>
              }
            />
          </>
        }
      />

      <LoadNotice
        show={incomplete(
          guests,
          hackathons,
          siteRows,
          breakdown,
          expenses,
          sponsorships,
          sponsors,
          tasks,
          activity,
        )}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Signed up"
          value={
            turnout.source === "none"
              ? "—"
              : turnout.signedUp.toLocaleString("en-IN")
          }
          note={
            event.capacity ? (
              <span className="flex items-center gap-2">
                <span className="w-16">
                  <Meter value={turnout.signedUp} max={event.capacity} />
                </span>
                of {event.capacity.toLocaleString("en-IN")} seats
              </span>
            ) : turnout.source === "typed" ? (
              "Typed in"
            ) : (
              "No capacity set"
            )
          }
        />
        <Stat
          label="Attended"
          value={
            turnout.attended ? turnout.attended.toLocaleString("en-IN") : "—"
          }
          note={
            turnout.showUp !== null
              ? `${percent(turnout.showUp)} showed up`
              : phase === "upcoming"
                ? "After the event"
                : "Check people in"
          }
          accent={turnout.attended > 0}
        />
        <Stat
          label="Spent"
          value={formatTotals(money.spent)}
          note={
            event.budget ? (
              <span className="flex items-center gap-2">
                <span className="w-16">
                  <Meter value={projected} max={event.budget} />
                </span>
                {Math.round((projected / event.budget) * 100)}% of the{" "}
                {formatTotals({ [currency]: event.budget })} budget with plans
              </span>
            ) : perHead ? (
              `${formatTotals({ [currency]: perHead })} per attendee`
            ) : (
              "No budget set"
            )
          }
        />
        <Stat
          label="Sponsorship"
          value={formatTotals(money.income)}
          note={`Net ${formatTotals(net)} · ${formatTotals(money.received)} received`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {hackathon || registrations ? (
            <Card className="px-5 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2.5 text-[13px]">
                  <Trophy size={16} className="text-[var(--i-accent)]" />
                  <span>
                    <strong className="font-medium">
                      {(registrations?.total ?? hackathon?.signed_up ?? 0).toLocaleString("en-IN")}
                    </strong>{" "}
                    registered on the site form
                    {registrations?.lastWeek
                      ? `, ${registrations.lastWeek.toLocaleString("en-IN")} in the last 7 days`
                      : ""}
                    .
                  </span>
                </span>
                {event.hackathon_slug ? (
                  <Link
                    href={hackathonListHref(event.hackathon_slug)}
                    className={buttonClass("secondary", "sm")}
                  >
                    {canEdit ? "Review registrations" : "See registrations"}
                  </Link>
                ) : null}
              </div>
              {registrations && registrations.total ? (
                <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--i-line)] pt-2.5 text-[12.5px]">
                  {Object.entries(registrations.byStatus)
                    .filter(([, count]) => count > 0)
                    .map(([status, count]) => (
                      <li key={status}>
                        <Link
                          href={hackathonListHref(registrations.slug, status)}
                          className="inline-flex items-center gap-1.5 text-[var(--i-ink-2)] hover:text-[var(--i-ink)]"
                        >
                          <StatusDot status={status} />
                          <span className="font-medium tabular-nums">{count}</span>{" "}
                          {statusLabel(status).toLowerCase()}
                        </Link>
                      </li>
                    ))}
                  {registrations.overdue ? (
                    <li className="text-amber-700 dark:text-amber-300">
                      {registrations.overdue} waiting over 5 days
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </Card>
          ) : null}
          <GuestList
            eventId={event.id}
            eventName={event.name}
            guests={guestRows}
            registrations={registrationRows}
            canEdit={canEdit}
            isOver={phase === "past"}
          />
          <div className="grid gap-5 xl:grid-cols-2">
            <ExpenseList
              expenses={expenses.ok ? expenses.rows : []}
              canEdit={canEdit}
              refs={refs}
              defaults={{ event_id: event.id, currency, status: "planned" }}
              title={
                <>
                  Expenses{" "}
                  {event.budget ? (
                    <span className="font-normal text-[var(--i-muted)]">
                      · {formatTotals({ [currency]: spent })} of{" "}
                      {formatTotals({ [currency]: event.budget })}
                    </span>
                  ) : null}
                </>
              }
            />
            <SponsorshipList
              sponsorships={sponsorships.ok ? sponsorships.rows : []}
              sponsorNames={sponsorNames}
              canEdit={canEdit}
              refs={refs}
              defaults={{ event_id: event.id, currency }}
            />
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardTitle>Details</CardTitle>
            <div className="px-5 py-4">
              <Fields>
                <Field label="Owner">
                  {event.owner ? <Owner owner={event.owner} /> : null}
                </Field>
                <Field label="Format">
                  {labelOf(EVENT_FORMATS, event.format)}
                </Field>
                <Field label="Host" wide>
                  {partner ? (
                    <>
                      <Link
                        href={`/internal/community/campus/${partner.id}`}
                        className="underline decoration-[var(--i-line-strong)] underline-offset-[3px] hover:text-[var(--i-accent-text)]"
                      >
                        {partner.name}
                      </Link>
                      <span className="text-[var(--i-muted)]">
                        {" "}
                        · {labelOf(PARTNER_KINDS, partner.kind)}
                      </span>
                    </>
                  ) : null}
                </Field>
                {where ? (
                  <Field label="Venue" wide>
                    {where}
                  </Field>
                ) : null}
                <Field label="Budget">
                  {event.budget !== null
                    ? formatTotals({ [currency]: event.budget })
                    : null}
                </Field>
                <Field label="Cost per attendee">
                  {perHead ? formatTotals({ [currency]: perHead }) : null}
                </Field>
                {event.recap_url ? (
                  <Field label="Recap" wide>
                    <ExternalLink href={event.recap_url} />
                  </Field>
                ) : null}
                {event.tags.length ? (
                  <Field label="Tags" wide>
                    <span className="flex flex-wrap gap-1">
                      {event.tags.map((tag) => (
                        <TagChip key={tag} tag={tag} />
                      ))}
                    </span>
                  </Field>
                ) : null}
                {event.notes ? (
                  <Field label="Notes" wide>
                    <span className="whitespace-pre-wrap">{event.notes}</span>
                  </Field>
                ) : null}
              </Fields>
            </div>
          </Card>
          <EventPartnerList
            side="event"
            links={links.ok ? links.rows : []}
            names={partnerNames}
            host={partner ? { id: partner.id, name: partner.name } : null}
            missing={!links.ok && links.missing ? EVENT_PARTNERS_MIGRATION_HINT : null}
            canEdit={canEdit}
            refs={refs}
            defaults={{ event_id: event.id }}
            hidden={["event_id"]}
          />
          <TaskList
            tasks={tasks.ok ? tasks.rows : []}
            me={staff.email}
            canEdit={canEdit}
            refs={refs}
            owners={owners}
            defaults={{ event_id: event.id, owner: staff.email }}
          />
          <ActivityLog
            parent={{ event_id: event.id }}
            items={activity.ok ? activity.rows : []}
            canEdit={canEdit}
          />
        </div>
      </div>
    </>
  );
}
