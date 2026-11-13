import type { Metadata } from "next";
import Link from "next/link";
import { CalendarBlank, Plus } from "@phosphor-icons/react/dist/ssr";
import { requireCommunity } from "@/lib/internal/session";
import {
  incomplete,
  loadEvents,
  loadGuestCounts,
  loadHackathonCounts,
  loadPartners,
  ownerChoices,
  refOptions,
} from "@/lib/internal/community/data";
import {
  EVENT_FORMATS,
  EVENT_KINDS,
  formatEventDate,
  labelOf,
  percent,
  relativeDay,
  todayKey,
} from "@/lib/internal/community/schema";
import {
  matches,
  one,
  phaseOf,
  turnouts,
  type Phase,
} from "@/lib/internal/community/stats";
import {
  Card,
  EmptyState,
  PageHeader,
  buttonClass,
} from "@/components/internal/ui";
import { RecordDialog } from "@/components/internal/community/record-dialog";
import { QuickSelect } from "@/components/internal/community/quick-select";
import {
  LinkTabs,
  LoadNotice,
  Meter,
  MigrationNotice,
  Muted,
  Owner,
  RowLink,
  SearchBox,
  Table,
  rowClass,
} from "@/components/internal/community/ui";

export const metadata: Metadata = { title: "Events" };

const VIEWS: { key: Phase | "all"; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "idea", label: "Ideas" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requireCommunity(), searchParams]);
  const canEdit = staff.community === "manager";
  const [events, guestCounts, hackathonCounts, partners, refs, owners] =
    await Promise.all([
      loadEvents(),
      loadGuestCounts(),
      loadHackathonCounts(),
      loadPartners(),
      canEdit ? refOptions(["partner", "hackathon"]) : Promise.resolve({}),
      canEdit ? ownerChoices() : Promise.resolve([]),
    ]);

  const today = todayKey();
  const view = (VIEWS.find((item) => item.key === one(params.view))?.key ??
    "upcoming") as Phase | "all";
  const kind = EVENT_KINDS.find(
    (item) => item.value === one(params.kind),
  )?.value;
  const query = one(params.q)?.slice(0, 100) ?? "";

  const header = (
    <PageHeader
      eyebrow="Community"
      title="Events"
      description="Meetups, hackathons, campus events and workshops: dates, hosts, guest lists and turnout."
      actions={
        canEdit ? (
          <RecordDialog
            entity="event"
            refs={refs}
            owners={owners}
            defaults={{ owner: staff.email }}
            goTo="/internal/community/events/"
            trigger={
              <button type="button" className={buttonClass("accent")}>
                <Plus size={14} /> New event
              </button>
            }
          />
        ) : null
      }
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
  const partnerNames = new Map(
    (partners.ok ? partners.rows : []).map((partner) => [
      partner.id,
      partner.name,
    ]),
  );
  const searched = events.rows.filter(
    (event) =>
      (!kind || event.kind === kind) &&
      matches(
        query,
        event.name,
        event.city,
        event.venue,
        event.tags,
        partnerNames.get(event.partner_id ?? ""),
      ),
  );
  const counts = Object.fromEntries(
    VIEWS.map((item) => [item.key, 0]),
  ) as Record<string, number>;
  for (const event of searched) {
    counts[phaseOf(event, today)]++;
    counts.all++;
  }
  const rows = searched
    .filter((event) => view === "all" || phaseOf(event, today) === view)
    .sort((a, b) => {
      // Upcoming soonest first (undated last); everything else newest first.
      const left = a.starts_on ?? (view === "upcoming" ? "9999" : "0000");
      const right = b.starts_on ?? (view === "upcoming" ? "9999" : "0000");
      return view === "upcoming"
        ? left.localeCompare(right)
        : right.localeCompare(left);
    });

  const link = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { view, kind, q: query || undefined, ...changes };
    for (const [key, value] of Object.entries(merged))
      if (value && !(key === "view" && value === "upcoming"))
        next.set(key, value);
    const search = next.toString();
    return `/internal/community/events${search ? `?${search}` : ""}`;
  };

  return (
    <>
      {header}
      <LoadNotice
        show={incomplete(events, guestCounts, hackathonCounts, partners)}
      />
      <LinkTabs
        active={view}
        items={VIEWS.map((item) => ({
          key: item.key,
          label: item.label,
          count: counts[item.key],
          href: link({ view: item.key }),
        }))}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox
          action="/internal/community/events"
          value={query}
          placeholder="Search events, cities, hosts"
          keep={{ view, kind }}
        />
        <div className="flex flex-wrap gap-1">
          <Link
            href={link({ kind: undefined })}
            className={buttonClass(kind ? "ghost" : "secondary", "sm")}
          >
            All types
          </Link>
          {EVENT_KINDS.map((item) => (
            <Link
              key={item.value}
              href={link({ kind: item.value })}
              className={buttonClass(
                kind === item.value ? "secondary" : "ghost",
                "sm",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        {rows.length ? (
          <Table
            head={
              <>
                <th>Date</th>
                <th>Event</th>
                <th>Status</th>
                <th>Signed up</th>
                <th>Attended</th>
                <th>Owner</th>
              </>
            }
          >
            {rows.map((event) => {
              const numbers = turnout.get(event.id)!;
              const where =
                event.format === "online"
                  ? "Online"
                  : [
                      event.city,
                      event.format === "hybrid"
                        ? labelOf(EVENT_FORMATS, "hybrid")
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ");
              const host = event.partner_id
                ? partnerNames.get(event.partner_id)
                : null;
              return (
                <tr key={event.id} className={rowClass}>
                  <td className="whitespace-nowrap">
                    <span className="block tabular-nums">
                      {formatEventDate(event.starts_on, event.ends_on, today)}
                    </span>
                    {event.starts_on && phaseOf(event, today) === "upcoming" ? (
                      <span className="text-[12px] text-[var(--i-muted)]">
                        {relativeDay(event.starts_on, today)}
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-[22rem]">
                    <RowLink
                      href={`/internal/community/events/${event.id}`}
                      sub={[labelOf(EVENT_KINDS, event.kind), where, host]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      {event.name}
                    </RowLink>
                  </td>
                  <td>
                    <QuickSelect
                      entity="event"
                      id={event.id}
                      value={event.status}
                      canEdit={canEdit}
                      label={`Status of ${event.name}`}
                    />
                  </td>
                  <td className="w-40">
                    {numbers.source === "none" ? (
                      <Muted>—</Muted>
                    ) : (
                      <span className="block">
                        <span className="tabular-nums">
                          {numbers.signedUp.toLocaleString("en-IN")}
                        </span>
                        {event.capacity ? (
                          <Muted>
                            {" "}
                            / {event.capacity.toLocaleString("en-IN")}
                          </Muted>
                        ) : null}
                        {event.capacity ? (
                          <span className="mt-1 block w-28">
                            <Meter
                              value={numbers.signedUp}
                              max={event.capacity}
                              label={`${numbers.signedUp} of ${event.capacity} seats`}
                            />
                          </span>
                        ) : null}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap tabular-nums">
                    {numbers.attended ? (
                      <>
                        {numbers.attended.toLocaleString("en-IN")}
                        {numbers.showUp !== null ? (
                          <Muted> · {percent(numbers.showUp)}</Muted>
                        ) : null}
                      </>
                    ) : (
                      <Muted>—</Muted>
                    )}
                  </td>
                  <td className="max-w-[10rem] text-[12.5px]">
                    <Owner owner={event.owner} />
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <EmptyState
            icon={<CalendarBlank size={20} />}
            title={events.rows.length ? "No events here" : "No events yet"}
          >
            {events.rows.length
              ? "Try another tab or clear the search."
              : canEdit
                ? "Add your first meetup, hackathon or campus event. Ideas count too: set the status to Idea."
                : "Events the community team adds show up here."}
          </EmptyState>
        )}
      </Card>
    </>
  );
}
