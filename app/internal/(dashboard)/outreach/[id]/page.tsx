import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowSquareOut, PencilSimple } from "@/components/internal/icons";
import {
  removeOrg,
  saveOrg,
} from "@/app/internal/(dashboard)/outreach/actions";
import { getClientById } from "@/lib/internal/outreach/client-link";
import {
  formatDay,
  formatMoney,
  labelOf,
  todayKey,
} from "@/lib/internal/community/schema";
import { requireOutreach } from "@/lib/internal/outreach/access";
import {
  getOrg,
  loadActivity,
  loadContacts,
  ownerChoices,
} from "@/lib/internal/outreach/data";
import { isOpen } from "@/lib/internal/outreach/rules";
import {
  ORG_FIELDS,
  ORG_KINDS,
  ORG_SOURCES,
  OUTREACH_MIGRATION_HINT,
} from "@/lib/internal/outreach/schema";
import {
  Card,
  CardTitle,
  ExternalLink,
  Field,
  Fields,
  Notice,
  PageHeader,
  TagChip,
  buttonClass,
} from "@/components/internal/ui";
import { Owner, Stat } from "@/components/internal/community/ui";
import { ActivityLog } from "@/components/internal/outreach/activity-log";
import { ContactList } from "@/components/internal/outreach/contact-list";
import { ConvertButton } from "@/components/internal/outreach/convert-button";
import { FieldDialog } from "@/components/internal/outreach/field-dialog";
import { OrgLogo, PriorityPill } from "@/components/internal/outreach/org-marks";
import { StageSelect } from "@/components/internal/outreach/stage-select";

const PATH = "/outreach";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  // The title is data too: check who's asking before reading the record.
  const [, { id }] = await Promise.all([requireOutreach(), params]);
  const org = await getOrg(id);
  return { title: org && org !== "error" ? org.name : "Outreach" };
}

export default async function OutreachOrgPage({ params }: { params: Promise<{ id: string }> }) {
  const [staff, { id }] = await Promise.all([requireOutreach(), params]);
  const org = await getOrg(id);
  if (org === "error") return <Notice tone="warning">{OUTREACH_MIGRATION_HINT}</Notice>;
  if (!org) notFound();
  const today = todayKey();
  const [contacts, activity, owners, client] = await Promise.all([
    loadContacts(org.id),
    loadActivity(org.id),
    ownerChoices(),
    org.client_id ? getClientById(org.client_id) : Promise.resolve(null),
  ]);
  const open = isOpen(org.stage);
  const people = contacts.ok ? contacts.rows : [];
  // A researched lead: its reason and way in sit above the log.
  const researched = Boolean(
    org.why_fit || org.warm_path || org.conflict || org.funding || org.signal_url || org.priority,
  );

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href={PATH} className="inline-flex items-center gap-1 hover:text-[var(--i-ink)]">
            <ArrowLeft size={13} /> Outreach
          </Link>
        }
        title={
          <span className="flex min-w-0 items-center gap-3">
            <OrgLogo org={org} size={32} />
            <span className="min-w-0 truncate">{org.name}</span>
          </span>
        }
        description={[
          labelOf(ORG_KINDS, org.kind),
          org.about,
          org.interest,
          org.stage === "lost" && org.lost_reason
            ? `Lost: ${org.lost_reason}`
            : org.next_step
              ? `Next: ${org.next_step}`
              : "",
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <StageSelect id={org.id} value={org.stage} name={org.name} />
            {client ? (
              <Link href={`/clients/${client.slug}`} className={buttonClass("secondary")}>
                <ArrowSquareOut size={14} /> Open the client
              </Link>
            ) : org.stage === "won" && !org.client_id && staff.clients === "manager" ? (
              // Adding a client needs Clients manager access (see convertToClient).
              <ConvertButton id={org.id} name={org.name} />
            ) : null}
            <FieldDialog
              fields={ORG_FIELDS}
              noun="organisation"
              record={org}
              owners={owners}
              save={saveOrg.bind(null, org.id)}
              remove={removeOrg.bind(null, org.id)}
              deleteNote="Its contacts and everything logged here go with it."
              deletedHref={PATH}
              trigger={
                <button type="button" className={buttonClass("primary")}>
                  <PencilSimple size={14} /> Edit
                </button>
              }
            />
          </>
        }
      />

      {!contacts.ok || !activity.ok ? (
        <div className="mb-5">
          <Notice tone="warning">
            Some of this page couldn&apos;t be loaded, so contacts or log entries may be missing. Reload in a minute.
          </Notice>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Follow up"
          value={org.follow_up_on ? formatDay(org.follow_up_on, today) : "—"}
          note={
            !open
              ? "Closed, nothing to chase"
              : org.follow_up_on
                ? org.follow_up_on <= today
                  ? "Due now"
                  : "Set"
                : "No date set: log an entry to set one"
          }
          accent={open && Boolean(org.follow_up_on && org.follow_up_on <= today)}
        />
        <Stat
          label="Last contact"
          value={org.last_contact_on ? formatDay(org.last_contact_on, today) : "—"}
          note={`${activity.ok ? activity.rows.length : 0} logged`}
        />
        <Stat
          label="Rough value a month"
          value={org.est_value !== null ? formatMoney(org.est_value, org.currency) : "—"}
          note="A guess, for sorting what matters"
        />
        <Stat
          label={open ? "In the pipeline since" : "Closed"}
          value={formatDay(open ? todayKey(new Date(org.created_at)) : org.closed_on, today)}
          note={labelOf(ORG_SOURCES, org.source)}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {researched ? (
            <Card>
              <CardTitle action={org.priority ? <PriorityPill priority={org.priority} /> : null}>
                Why reach out
              </CardTitle>
              <div className="space-y-4 px-5 py-4">
                {org.conflict ? (
                  <Notice tone="warning">
                    <span className="font-medium">{org.conflict}.</span> Close to a Studio1 client: check with them
                    before anyone reaches out.
                  </Notice>
                ) : null}
                <Fields>
                  <Field label="Why they fit" wide>
                    {org.why_fit ? (
                      <>
                        <span className="whitespace-pre-wrap">{org.why_fit}</span>
                        {org.signal_url ? (
                          <span className="mt-1 block">
                            <ExternalLink href={org.signal_url} className="text-[12.5px]" />
                          </span>
                        ) : null}
                      </>
                    ) : org.signal_url ? (
                      <ExternalLink href={org.signal_url} />
                    ) : null}
                  </Field>
                  <Field label="Warm path" wide>
                    {org.warm_path ? <span className="whitespace-pre-wrap">{org.warm_path}</span> : null}
                  </Field>
                  <Field label="What they do">{org.about}</Field>
                  <Field label="Funding">{org.funding}</Field>
                </Fields>
              </div>
            </Card>
          ) : null}
          <ActivityLog
            orgId={org.id}
            items={activity.ok ? activity.rows : []}
            contacts={people.map((contact) => ({ id: contact.id, name: contact.name }))}
            followUpOn={org.follow_up_on}
            open={open}
          />
        </div>
        <div className="min-w-0 space-y-5">
          <ContactList orgId={org.id} contacts={people} />
          <Card>
            <CardTitle>Details</CardTitle>
            <div className="px-5 py-4">
              <Fields>
                <Field label="Owner">{org.owner ? <Owner owner={org.owner} /> : null}</Field>
                <Field label="How it started">{labelOf(ORG_SOURCES, org.source)}</Field>
                <Field label="Website" wide>
                  {org.website ? <ExternalLink href={org.website} /> : null}
                </Field>
                <Field label="Interested in" wide>
                  {org.interest}
                </Field>
                <Field label="Next step" wide>
                  {org.next_step}
                </Field>
                {org.stage === "lost" ? (
                  <Field label="Why it was lost" wide>
                    {org.lost_reason}
                  </Field>
                ) : null}
                {org.tags.length ? (
                  <Field label="Tags" wide>
                    <span className="flex flex-wrap gap-1">
                      {org.tags.map((tag) => (
                        <TagChip key={tag} tag={tag} />
                      ))}
                    </span>
                  </Field>
                ) : null}
                {org.notes ? (
                  <Field label="Notes" wide>
                    <span className="whitespace-pre-wrap">{org.notes}</span>
                  </Field>
                ) : null}
              </Fields>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
