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
  loadSponsorships,
  loadTasks,
  ownerChoices,
  refOptions,
} from "@/lib/internal/community/data";
import {
  formatDay,
  formatTotals,
  sumMoney,
  todayKey,
  type Sponsor,
} from "@/lib/internal/community/schema";
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
import {
  ContactList,
  SponsorshipList,
  TaskList,
} from "@/components/internal/community/lists";
import { QuickSelect } from "@/components/internal/community/quick-select";
import { RecordDialog } from "@/components/internal/community/record-dialog";
import {
  LoadNotice,
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
  const sponsor = await getRecord<Sponsor>("sponsor", id);
  return { title: sponsor?.name ?? "Sponsor" };
}

export default async function SponsorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [staff, { id }] = await Promise.all([requireCommunity(), params]);
  const sponsor = await getRecord<Sponsor>("sponsor", id);
  if (!sponsor) notFound();
  const canEdit = staff.community === "manager";
  const today = todayKey();

  const [contacts, deals, events, tasks, activity, refs, owners] =
    await Promise.all([
      loadContacts({ sponsor_id: sponsor.id }),
      loadSponsorships({ sponsor_id: sponsor.id }),
      loadEvents(),
      loadTasks({ sponsor_id: sponsor.id }),
      loadActivity({ sponsor_id: sponsor.id }),
      refOptions(["event", "sponsor", "partner"]),
      ownerChoices(),
    ]);
  if (!contacts.ok) return <MigrationNotice message={contacts.message} />;

  const dealRows = deals.ok ? deals.rows : [];
  const live = dealRows.filter((deal) => deal.status !== "cancelled");
  const eventNames = Object.fromEntries(
    (events.ok ? events.rows : []).map((event) => [event.id, event.name]),
  );

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href="/internal/community/sponsors"
            className="inline-flex items-center gap-1 hover:text-[var(--i-ink)]"
          >
            <ArrowLeft size={13} /> Sponsors
          </Link>
        }
        title={sponsor.name}
        description={[
          sponsor.industry,
          sponsor.tier ? `${sponsor.tier} tier` : "",
          sponsor.next_step ? `Next: ${sponsor.next_step}` : "",
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <QuickSelect
              entity="sponsor"
              id={sponsor.id}
              value={sponsor.stage}
              canEdit={canEdit}
              label="Sponsor stage"
            />
            <RecordDialog
              entity="sponsor"
              record={sponsor}
              owners={owners}
              readOnly={!canEdit}
              deletedHref="/internal/community/sponsors"
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

      <LoadNotice show={incomplete(contacts, deals, events, tasks, activity)} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Asking for"
          value={
            sponsor.ask_amount !== null
              ? formatTotals({ [sponsor.currency]: sponsor.ask_amount })
              : "—"
          }
          note={
            sponsor.proposal_sent_on
              ? `Proposal sent ${formatDay(sponsor.proposal_sent_on, today)}`
              : "No proposal sent yet"
          }
        />
        <Stat
          label="Committed"
          value={formatTotals(sumMoney(live))}
          note={`${live.length} ${live.length === 1 ? "sponsorship" : "sponsorships"}`}
          accent={live.length > 0}
        />
        <Stat
          label="Received"
          value={formatTotals(
            sumMoney(dealRows.filter((deal) => deal.status === "paid")),
          )}
          note={`${formatTotals(sumMoney(dealRows.filter((deal) => deal.status === "invoiced")))} invoiced, not paid`}
        />
        <Stat
          label="Last contact"
          value={
            sponsor.last_contact_on
              ? formatDay(sponsor.last_contact_on, today)
              : "—"
          }
          note={
            sponsor.follow_up_on
              ? `Follow up ${formatDay(sponsor.follow_up_on, today)}`
              : "No follow-up set"
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <ActivityLog
            parent={{ sponsor_id: sponsor.id }}
            items={activity.ok ? activity.rows : []}
            canEdit={canEdit}
            followUp={{
              entity: "sponsor",
              id: sponsor.id,
              on: sponsor.follow_up_on,
            }}
          />
          <SponsorshipList
            sponsorships={dealRows}
            sponsorNames={{ [sponsor.id]: sponsor.name }}
            eventNames={eventNames}
            canEdit={canEdit}
            refs={refs}
            defaults={{
              sponsor_id: sponsor.id,
              currency: sponsor.currency,
              amount: sponsor.ask_amount ?? "",
            }}
            hidden={["sponsor_id"]}
          />
        </div>
        <div className="min-w-0 space-y-5">
          <ContactList
            contacts={contacts.rows}
            canEdit={canEdit}
            defaults={{ sponsor_id: sponsor.id }}
            hidden={["sponsor_id", "partner_id"]}
          />
          <Card>
            <CardTitle>Details</CardTitle>
            <div className="px-5 py-4">
              <Fields>
                <Field label="Owner">
                  {sponsor.owner ? <Owner owner={sponsor.owner} /> : null}
                </Field>
                <Field label="Tier">{sponsor.tier}</Field>
                <Field label="Website" wide>
                  {sponsor.website ? (
                    <ExternalLink href={sponsor.website} />
                  ) : null}
                </Field>
                <Field label="Proposal" wide>
                  {sponsor.proposal_url ? (
                    <ExternalLink href={sponsor.proposal_url}>
                      Open the proposal
                    </ExternalLink>
                  ) : null}
                </Field>
                {sponsor.tags.length ? (
                  <Field label="Tags" wide>
                    <span className="flex flex-wrap gap-1">
                      {sponsor.tags.map((tag) => (
                        <TagChip key={tag} tag={tag} />
                      ))}
                    </span>
                  </Field>
                ) : null}
                {sponsor.notes ? (
                  <Field label="Notes" wide>
                    <span className="whitespace-pre-wrap">{sponsor.notes}</span>
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
            defaults={{ sponsor_id: sponsor.id, owner: staff.email }}
          />
        </div>
      </div>
    </>
  );
}
