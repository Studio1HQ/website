import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PencilSimple } from "@phosphor-icons/react/dist/ssr";
import { requireCommunity } from "@/lib/internal/session";
import {
  getRecord,
  incomplete,
  loadActivity,
  loadContacts,
  loadEvents,
  loadGuestCounts,
  loadHackathonCounts,
  loadPartners,
  loadTasks,
  ownerChoices,
  refOptions,
} from "@/lib/internal/community/data";
import {
  EVENT_KINDS,
  EVENT_STATUSES,
  PARTNER_KINDS,
  PARTNER_STAGES,
  formatDay,
  formatEventDate,
  labelOf,
  todayKey,
  type Partner,
} from "@/lib/internal/community/schema";
import { turnouts } from "@/lib/internal/community/stats";
import {
  Card,
  CardTitle,
  ExternalLink,
  Field,
  Fields,
  PageHeader,
  TagChip,
  buttonClass,
} from "@/components/internal/ui";
import { ActivityLog } from "@/components/internal/community/activity-log";
import { ContactList, TaskList } from "@/components/internal/community/lists";
import { QuickSelect } from "@/components/internal/community/quick-select";
import { RecordDialog } from "@/components/internal/community/record-dialog";
import {
  LoadNotice,
  MigrationNotice,
  Muted,
  OptionPill,
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
  const partner = await getRecord<Partner>("partner", id);
  return { title: partner?.name ?? "Partner" };
}

export default async function PartnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [staff, { id }] = await Promise.all([requireCommunity(), params]);
  const partner = await getRecord<Partner>("partner", id);
  if (!partner) notFound();
  const canEdit = staff.community === "manager";
  const today = todayKey();

  const [
    contacts,
    events,
    guestCounts,
    hackathonCounts,
    partners,
    tasks,
    activity,
    refs,
    owners,
  ] = await Promise.all([
    loadContacts({ partner_id: partner.id }),
    loadEvents(),
    loadGuestCounts(),
    loadHackathonCounts(),
    loadPartners(),
    loadTasks({ partner_id: partner.id }),
    loadActivity({ partner_id: partner.id }),
    refOptions(["event", "sponsor", "partner"]),
    ownerChoices(),
  ]);
  if (!contacts.ok) return <MigrationNotice message={contacts.message} />;

  const allPartners = partners.ok ? partners.rows : [];
  const parent = partner.parent_id
    ? allPartners.find((item) => item.id === partner.parent_id)
    : null;
  const children = allPartners.filter((item) => item.parent_id === partner.id);
  // Events hosted here or by its clubs.
  const hostIds = new Set([partner.id, ...children.map((child) => child.id)]);
  const hosted = (events.ok ? events.rows : []).filter(
    (event) => event.partner_id && hostIds.has(event.partner_id),
  );
  const turnout = turnouts(
    hosted,
    guestCounts.ok ? guestCounts.rows : [],
    hackathonCounts.ok ? hackathonCounts.rows : [],
    today,
  );
  const reached = hosted.reduce(
    (sum, event) =>
      sum +
      (event.status === "cancelled"
        ? 0
        : (turnout.get(event.id)?.attended ?? 0)),
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href="/internal/community/campus"
            className="inline-flex items-center gap-1 hover:text-[var(--i-ink)]"
          >
            <ArrowLeft size={13} /> Campus partners
          </Link>
        }
        title={partner.name}
        description={[
          labelOf(PARTNER_KINDS, partner.kind),
          parent ? `at ${parent.name}` : "",
          [partner.city, partner.country].filter(Boolean).join(", "),
          partner.next_step ? `Next: ${partner.next_step}` : "",
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <QuickSelect
              entity="partner"
              id={partner.id}
              value={partner.stage}
              canEdit={canEdit}
              label="Partner stage"
            />
            <RecordDialog
              entity="partner"
              record={partner}
              refs={refs}
              owners={owners}
              readOnly={!canEdit}
              deletedHref="/internal/community/campus"
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
          contacts,
          events,
          guestCounts,
          hackathonCounts,
          partners,
          tasks,
          activity,
        )}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={partner.kind === "venue" ? "Seats" : "Students or members"}
          value={
            (partner.kind === "venue"
              ? partner.capacity
              : partner.reach
            )?.toLocaleString("en-IN") ?? "—"
          }
          note={
            partner.kind !== "venue" && partner.capacity
              ? `${partner.capacity.toLocaleString("en-IN")} seats for events`
              : undefined
          }
        />
        <Stat
          label="Events hosted"
          value={hosted.filter((event) => event.status !== "cancelled").length}
          note={children.length ? "Including its clubs" : undefined}
        />
        <Stat
          label="People reached"
          value={reached ? reached.toLocaleString("en-IN") : "—"}
          note="Attended its events"
          accent={reached > 0}
        />
        <Stat
          label="Last contact"
          value={
            partner.last_contact_on
              ? formatDay(partner.last_contact_on, today)
              : "—"
          }
          note={
            partner.follow_up_on
              ? `Follow up ${formatDay(partner.follow_up_on, today)}`
              : "No follow-up set"
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <ActivityLog
            parent={{ partner_id: partner.id }}
            items={activity.ok ? activity.rows : []}
            canEdit={canEdit}
            followUp={{
              entity: "partner",
              id: partner.id,
              on: partner.follow_up_on,
            }}
          />
          <Card>
            <CardTitle>Events</CardTitle>
            {hosted.length ? (
              <ul className="divide-y divide-[var(--i-line)]">
                {hosted.map((event) => {
                  const numbers = turnout.get(event.id);
                  return (
                    <li key={event.id}>
                      <Link
                        href={`/internal/community/events/${event.id}`}
                        className="flex items-center gap-3 px-5 py-2.5 text-[13px] hover:bg-[var(--i-hover)]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {event.name}
                          </span>
                          <span className="block truncate text-[12px] text-[var(--i-muted)]">
                            {formatEventDate(
                              event.starts_on,
                              event.ends_on,
                              today,
                            )}{" "}
                            · {labelOf(EVENT_KINDS, event.kind)}
                            {event.partner_id !== partner.id
                              ? ` · ${allPartners.find((item) => item.id === event.partner_id)?.name ?? ""}`
                              : ""}
                          </span>
                        </span>
                        <span className="hidden whitespace-nowrap tabular-nums text-[12.5px] text-[var(--i-muted)] sm:block">
                          {numbers?.attended
                            ? `${numbers.attended} attended`
                            : numbers?.signedUp
                              ? `${numbers.signedUp} signed up`
                              : ""}
                        </span>
                        <OptionPill
                          list={EVENT_STATUSES}
                          value={event.status}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
                No events yet. Pick this{" "}
                {labelOf(PARTNER_KINDS, partner.kind).toLowerCase()} as the host
                when you add an event.
              </p>
            )}
          </Card>
          {children.length ? (
            <Card>
              <CardTitle>Student clubs</CardTitle>
              <ul className="divide-y divide-[var(--i-line)]">
                {children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/internal/community/campus/${child.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px] hover:bg-[var(--i-hover)]"
                    >
                      <span className="truncate font-medium">{child.name}</span>
                      <OptionPill list={PARTNER_STAGES} value={child.stage} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
        <div className="min-w-0 space-y-5">
          <ContactList
            contacts={contacts.rows}
            canEdit={canEdit}
            defaults={{ partner_id: partner.id }}
            hidden={["sponsor_id", "partner_id"]}
          />
          <Card>
            <CardTitle>Details</CardTitle>
            <div className="px-5 py-4">
              <Fields>
                <Field label="Owner">
                  {partner.owner ? <Owner owner={partner.owner} /> : null}
                </Field>
                <Field label="College">
                  {parent ? (
                    <Link
                      href={`/internal/community/campus/${parent.id}`}
                      className="underline decoration-[var(--i-line-strong)] underline-offset-[3px] hover:text-[var(--i-accent-text)]"
                    >
                      {parent.name}
                    </Link>
                  ) : null}
                </Field>
                <Field label="Website" wide>
                  {partner.website ? (
                    <ExternalLink href={partner.website} />
                  ) : null}
                </Field>
                <Field label="MoU or agreement" wide>
                  {partner.agreement_url ? (
                    <ExternalLink href={partner.agreement_url}>
                      Open the agreement
                    </ExternalLink>
                  ) : (
                    <Muted>None on file</Muted>
                  )}
                </Field>
                {partner.tags.length ? (
                  <Field label="Tags" wide>
                    <span className="flex flex-wrap gap-1">
                      {partner.tags.map((tag) => (
                        <TagChip key={tag} tag={tag} />
                      ))}
                    </span>
                  </Field>
                ) : null}
                {partner.notes ? (
                  <Field label="Notes" wide>
                    <span className="whitespace-pre-wrap">{partner.notes}</span>
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
            defaults={{ partner_id: partner.id, owner: staff.email }}
          />
        </div>
      </div>
    </>
  );
}
