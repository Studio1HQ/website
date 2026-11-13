import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowSquareOut,
  PencilSimple,
  Trophy,
} from "@phosphor-icons/react/dist/ssr";
import { requireCommunity } from "@/lib/internal/session";
import {
  getRecord,
  incomplete,
  loadActivity,
  loadExpenses,
  loadGuests,
  loadHackathonCounts,
  loadSponsors,
  loadSponsorships,
  loadTasks,
  ownerChoices,
  refOptions,
} from "@/lib/internal/community/data";
import {
  EVENT_FORMATS,
  EVENT_KINDS,
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
  TagChip,
  buttonClass,
  safeUrl,
} from "@/components/internal/ui";
import { ActivityLog } from "@/components/internal/community/activity-log";
import { GuestList } from "@/components/internal/community/guest-list";
import {
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
  ]);

  if (!guests.ok) {
    return <MigrationNotice message={guests.message} />;
  }

  const guestRows = guests.rows;
  const counts: GuestCounts = {
    signed_up: guestRows.filter((guest) => guest.status !== "cancelled").length,
    attended: guestRows.filter((guest) => guest.status === "attended").length,
    waitlisted: guestRows.filter((guest) => guest.status === "waitlisted")
      .length,
    no_show: guestRows.filter((guest) => guest.status === "no_show").length,
  };
  const hackathon = hackathons?.ok
    ? hackathons.rows.find((row) => row.hackathon_slug === event.hackathon_slug)
    : undefined;
  const turnout = turnoutOf(event, counts, hackathon, today);
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
          {hackathon ? (
            <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <span className="flex items-center gap-2.5 text-[13px]">
                <Trophy size={16} className="text-[var(--i-accent)]" />
                <span>
                  <strong className="font-medium">
                    {hackathon.signed_up.toLocaleString("en-IN")}
                  </strong>{" "}
                  signed up on the site form
                  {hackathon.attended
                    ? `, ${hackathon.attended.toLocaleString("en-IN")} attended`
                    : ""}
                  {hackathon.waitlisted
                    ? `, ${hackathon.waitlisted.toLocaleString("en-IN")} waitlisted`
                    : ""}
                  .
                </span>
              </span>
              {staff.role ? (
                <Link
                  href={`/internal/hackathons?event=${encodeURIComponent(hackathon.hackathon_slug)}`}
                  className={buttonClass("secondary", "sm")}
                >
                  Review in Hackathons
                </Link>
              ) : null}
            </Card>
          ) : null}
          <GuestList
            eventId={event.id}
            eventName={event.name}
            guests={guestRows}
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
