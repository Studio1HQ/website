import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Briefcase, PencilSimple, Plus } from "@/components/internal/icons";
import { inScope } from "@/lib/internal/clients/scope";
import { canSeeMoney, requireClients } from "@/lib/internal/session";
import { readLinks } from "@/lib/internal/clients/links";
import { cleanMonth } from "@/lib/internal/clients/clean";
import { ensureNextCycles } from "@/lib/internal/clients/cycles";
import {
  devrelReady,
  incomplete,
  loadClientBySlug,
  loadCycles,
  loadDeliverables,
  loadEngagements,
  loadMilestones,
  loadPartners,
  loadPeople,
  loadScopeLines,
  loadTemplates,
  ownerChoices,
} from "@/lib/internal/clients/data";
import { isWaitingOnClient } from "@/lib/internal/clients/rules";
import { projectName, projectPath } from "@/lib/internal/clients/projects";
import {
  CLIENT_STATUSES,
  engagementTypes,
  formatDay,
  monthLabel,
  namesFrom,
  plural,
  shiftMonth,
  templateFor,
  thisMonth,
  todayKey,
} from "@/lib/internal/clients/schema";
import { one } from "@/lib/internal/community/stats";
import { Card, CardTitle, EmptyState, ExternalLink, Field, Fields, Notice, PageHeader, buttonClass } from "@/components/internal/ui";
import { Pill, Stat } from "@/components/internal/community/ui";
import { ClientsLoadNotice, ClientsMigrationNotice, OptionBadge } from "@/components/internal/clients/ui";
import { ClientArchiveButton, ClientDialog } from "@/components/internal/clients/client-dialog";
import { EngagementDialog } from "@/components/internal/clients/engagement-dialog";
import { CycleStartButton } from "@/components/internal/clients/cycle-controls";
import { KeyNumbers } from "@/components/internal/clients/key-numbers";
import { Partners } from "@/components/internal/clients/partners";
import { Milestones } from "@/components/internal/clients/milestones";
import { ClientDocs, ClientLinks } from "@/components/internal/clients/client-links";
import { ClientLogo } from "@/components/internal/clients/client-logo";
import { EngagementDetails, Fold, ProjectList, countNote } from "@/components/internal/clients/project-parts";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  // The title is data too: check access before reading the client.
  const [staff, { slug }] = await Promise.all([requireClients(), params]);
  const found = await loadClientBySlug(slug);
  return {
    title: found.ok && found.client && inScope(staff.clientScope, found.client.id) ? found.client.name : "Client",
  };
}

const backLink = (
  <Link href="/clients" className="inline-flex items-center gap-1 hover:text-[var(--i-ink)]">
    <ArrowLeft size={13} /> Clients
  </Link>
);

const counts = new Intl.NumberFormat("en-US");

/**
 * A company: how it's going overall, then its projects, one per month of
 * each engagement ("DevRel · November 2026"), each opening the month's
 * pieces and report. Partners, milestones and the company's details sit
 * folded at the bottom.
 */
export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, { slug }, query] = await Promise.all([requireClients(), params, searchParams]);
  const manager = staff.clients === "manager";
  // Invoices and the contract are money: the founders' alone. Notes are for
  // client managers, not the Client team.
  const money = canSeeMoney(staff);
  const found = await loadClientBySlug(slug);
  if (!found.ok) {
    return (
      <>
        <PageHeader eyebrow={backLink} title="Client" />
        {found.missing ? <ClientsMigrationNotice message={found.message} /> : <Notice tone="error">{found.message}</Notice>}
      </>
    );
  }
  const client = found.client;
  // Not there, or not one of the clients an admin gave this person.
  if (!client || !inScope(staff.clientScope, client.id)) notFound();

  // Links from before projects had pages of their own (?month=, ?tab=work):
  // the month they meant is a project now.
  const oldMonth = cleanMonth(one(query.month));
  const oldTab = one(query.tab);
  if (oldMonth || oldTab === "work" || oldTab === "week" || one(query.view) === "month")
    redirect(projectPath(client.slug, oldMonth ?? thisMonth(), { engagement: one(query.engagement) ?? null }));
  if (oldTab === "report") redirect(projectPath(client.slug, thisMonth(), { view: "report" }));

  const links = readLinks(client.links);
  const today = todayKey();
  const current = thisMonth();
  const next = shiftMonth(current, 1);

  const [engagements, people, templates, owners] = await Promise.all([
    loadEngagements({ clientId: client.id }),
    loadPeople(),
    loadTemplates(),
    ownerChoices(),
  ]);
  if (!engagements.ok && engagements.missing) {
    return (
      <>
        <PageHeader eyebrow={backLink} title={client.name} />
        <ClientsMigrationNotice message={engagements.message} />
      </>
    );
  }
  const engagementRows = engagements.ok ? engagements.rows : [];
  const engagementIds = engagementRows.map((item) => item.id);
  const names = people.ok ? namesFrom(people.rows) : {};
  const types = engagementTypes(templates.ok ? templates.rows : []);
  // A new project's checklist opens on its type's template.
  const plans = Object.fromEntries(types.map((type) => [type.value, templateFor(type.value, templates.ok ? templates.rows : []).lines]));
  const running = engagementRows.filter((item) => item.status === "active");
  // The one partners, milestones and new readings belong to.
  const primary = running[0] ?? engagementRows[0] ?? null;

  const devrelPromise = Promise.all([
    devrelReady(),
    engagementIds.length ? loadMilestones(engagementIds) : null,
    engagementIds.length ? loadPartners(engagementIds) : null,
  ]);
  let cycles = engagementIds.length ? await loadCycles({ engagementIds }) : null;
  // This month's projects start themselves: a running engagement with no row
  // for the current month gets one (last month's plan carried over) the first
  // time anyone opens the company. Running it twice changes nothing.
  const missingNow = cycles?.ok
    ? running.filter((item) => !cycles!.ok || !cycles!.rows.some((cycle) => cycle.engagement_id === item.id && cycle.month === current))
    : [];
  if (missingNow.length && !client.archived_at) {
    const started = await ensureNextCycles({ month: current, by: staff.email, engagementIds: missingNow.map((item) => item.id) });
    if (started.ok && started.created) cycles = await loadCycles({ engagementIds });
  }
  const allCycles = cycles?.ok ? cycles.rows : [];
  const cycleIds = allCycles.map((cycle) => cycle.id);
  const [lines, deliverables, [devrel, milestones, partners]] = await Promise.all([
    loadScopeLines(cycleIds),
    loadDeliverables({ cycleIds }),
    devrelPromise,
  ]);
  const lineRows = lines.ok ? lines.rows : [];
  const pieces = deliverables.ok ? deliverables.rows : [];
  const milestoneRows = milestones?.ok ? milestones.rows.filter((item) => item.engagement_id === primary?.id) : [];
  const partnerRows = partners?.ok ? partners.rows.filter((item) => item.engagement_id === primary?.id) : [];
  // Partners and milestones: DevRel-style work, or any that already has some.
  const devrelWork = Boolean(
    primary && devrel && (!["blogs_only", "internal"].includes(primary.type) || milestoneRows.length || partnerRows.length),
  );
  const devrelMissing = Boolean((milestones && !milestones.ok && milestones.missing) || (partners && !partners.ok && partners.missing));

  // How it's going, all months together.
  const live = pieces.filter((item) => item.status === "published");
  const reach = live.reduce((sum, item) => sum + (item.views ?? 0), 0);
  const withViews = live.filter((item) => (item.views ?? 0) > 0).length;
  const withClient = pieces.filter((item) => item.status === "client_review");
  const overdue = withClient.filter((item) => isWaitingOnClient(item, today)).length;
  const approved = pieces.filter((item) => item.status === "approved").length;
  const working = pieces.filter((item) => ["planned", "in_progress", "internal_review", "changes_requested"].includes(item.status)).length;
  const firstMonth = [...allCycles].map((cycle) => cycle.month).sort()[0];

  // Near the month's end, a running project without next month gets a start button.
  const nextMissing =
    manager && Number(today.slice(8)) >= 25
      ? running.filter((item) => !allCycles.some((cycle) => cycle.engagement_id === item.id && cycle.month === next))
      : [];

  const newProject = manager ? (
    <EngagementDialog
      clientId={client.id}
      workspacePath={`/clients/${client.slug}`}
      owners={owners}
      names={names}
      me={staff.email}
      types={types}
      money={money}
      plans={plans}
      trigger={
        <button type="button" className={buttonClass(engagementRows.length ? "secondary" : "accent", "sm")}>
          <Plus size={13} /> New project
        </button>
      }
    />
  ) : null;

  return (
    <>
      <PageHeader
        eyebrow={backLink}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <ClientLogo slug={client.slug} name={client.name} website={client.website} size={28} className="mr-0.5" />
            {client.name}
            <OptionBadge list={CLIENT_STATUSES} value={client.status} />
            {client.archived_at ? <Pill>Archived</Pill> : null}
          </span>
        }
        description={
          [
            client.contact_name ? `Point of contact: ${client.contact_name}` : "",
            client.started_on ? `With us since ${formatDay(client.started_on, today)}` : "",
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        actions={
          manager ? (
            <>
              <ClientArchiveButton clientId={client.id} archived={Boolean(client.archived_at)} />
              <ClientDialog
                client={client}
                trigger={
                  <button type="button" className={buttonClass("primary")}>
                    <PencilSimple size={14} /> Edit
                  </button>
                }
              />
            </>
          ) : null
        }
      />
      <ClientLinks clientId={client.id} links={links} canEdit={manager} />

      {client.archived_at ? (
        <div className="mb-5">
          <Notice>This client is archived: it&apos;s hidden from the list, and its past projects stay here for reports.</Notice>
        </div>
      ) : null}
      <ClientsLoadNotice show={incomplete(engagements, people, templates, cycles, lines, deliverables)} />

      {allCycles.length ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Live so far" value={live.length} note={firstMonth ? `since ${monthLabel(firstMonth, true)}` : undefined} />
          <Stat
            label="Reach"
            value={reach ? counts.format(reach) : "—"}
            note={reach ? `views on ${plural(withViews, "piece")}` : "No views logged yet"}
          />
          <Stat
            label="With the client"
            value={withClient.length}
            accent={overdue > 0}
            note={overdue ? `${overdue} past their reply date` : "for approval"}
          />
          <Stat label="In the works" value={working + approved} note={approved ? `${approved} ready to go live` : "not live yet"} />
        </div>
      ) : null}

      <Card className="mb-6">
        <CardTitle
          action={
            <span className="flex flex-wrap items-center gap-2">
              {nextMissing.map((item) => (
                <CycleStartButton
                  key={item.id}
                  engagementId={item.id}
                  month={next}
                  label={`Start ${nextMissing.length > 1 ? `${projectName(item, client.name, types)} · ` : ""}${monthLabel(next, true)}`}
                />
              ))}
              {newProject}
            </span>
          }
        >
          Projects{" "}
          {allCycles.length ? <span className="font-normal text-[var(--i-faint)]">{allCycles.length}</span> : null}
        </CardTitle>
        {allCycles.length ? (
          <ProjectList
            slug={client.slug}
            company={client.name}
            engagements={engagementRows}
            cycles={allCycles}
            lines={lineRows}
            deliverables={pieces}
            types={types}
            several={engagementRows.length > 1}
            today={today}
          />
        ) : engagementRows.length ? (
          <EmptyState icon={<Briefcase size={20} />} title="No months yet">
            {manager
              ? `Start a month and it becomes a project here, like ${projectName(engagementRows[0], client.name, types)} · ${monthLabel(current)}.`
              : "A client manager starts the first month."}
            {manager ? (
              <span className="mt-4 flex flex-wrap justify-center gap-2">
                {engagementRows
                  .filter((item) => item.status !== "ended")
                  .map((item) => (
                    <CycleStartButton
                      key={item.id}
                      engagementId={item.id}
                      month={current}
                      label={`Start ${projectName(item, client.name, types)} · ${monthLabel(current, true)}`}
                    />
                  ))}
              </span>
            ) : null}
          </EmptyState>
        ) : (
          <EmptyState icon={<Briefcase size={20} />} title="No projects yet" action={newProject}>
            {manager
              ? "A project is a line of work for this company, like DevRel or Blogs. Each month of it gets its own page: the plan, every piece and its links, and the report."
              : "A client manager adds this company's projects."}
          </EmptyState>
        )}
      </Card>

      <div className="space-y-3">
        {primary && devrelWork && !devrelMissing ? (
          <>
            <Fold title="Key numbers and milestones" note={countNote(milestoneRows.length, "milestone")} id="milestones">
              <div className="max-w-3xl space-y-4">
                <KeyNumbers engagementId={primary.id} milestones={milestoneRows} />
                <Milestones engagementId={primary.id} milestones={milestoneRows} viewer={{ email: staff.email, manager }} />
              </div>
            </Fold>
            <Fold title="Partners" note={countNote(partnerRows.length, "partner")} id="partners">
              <Partners engagementId={primary.id} partners={partnerRows} viewer={{ email: staff.email, manager }} owners={owners} names={names} />
            </Fold>
          </>
        ) : null}
        <Fold title={`About ${client.name}`} note="contact, projects, docs" id="about">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-4">
              {engagementRows.map((item) => (
                <EngagementDetails
                  key={item.id}
                  engagement={money ? item : { ...item, contract_url: null }}
                  types={types}
                  money={money}
                  manager={manager}
                  rhythm={templateFor(item.type, templates.ok ? templates.rows : []).rhythm ?? ""}
                  names={names}
                  action={
                    manager ? (
                      <EngagementDialog
                        engagement={money ? item : { ...item, contract_url: null }}
                        clientId={client.id}
                        workspacePath={`/clients/${client.slug}`}
                        owners={owners}
                        names={names}
                        types={types}
                        money={money}
                        trigger={
                          <button type="button" className={buttonClass("ghost", "sm")}>
                            <PencilSimple size={13} /> Edit
                          </button>
                        }
                      />
                    ) : null
                  }
                />
              ))}
              <ClientDocs clientId={client.id} links={links} canEdit={manager} />
            </div>
            <Card className="h-fit">
              <CardTitle>Company details</CardTitle>
              <div className="px-5 py-4">
                <Fields>
                  <Field label="Point of contact">
                    {client.contact_name || client.contact_email ? (
                      <span className="flex min-w-0 flex-col">
                        {client.contact_name ? <span>{client.contact_name}</span> : null}
                        {client.contact_email ? (
                          <a
                            href={`mailto:${client.contact_email}`}
                            className="truncate text-[12.5px] text-[var(--i-muted)] underline decoration-[var(--i-line-strong)] underline-offset-[3px] hover:text-[var(--i-ink)]"
                          >
                            {client.contact_email}
                          </a>
                        ) : null}
                      </span>
                    ) : null}
                  </Field>
                  <Field label="Slack channel">{client.slack_channel_id || null}</Field>
                  <Field label="Website">{client.website ? <ExternalLink href={client.website} /> : null}</Field>
                  <Field label="Start date">{client.started_on ? formatDay(client.started_on, today) : null}</Field>
                  {manager && client.notes ? (
                    <Field label="Notes" wide>
                      <span className="whitespace-pre-wrap break-words">{client.notes}</span>
                    </Field>
                  ) : null}
                </Fields>
              </div>
            </Card>
          </div>
        </Fold>
      </div>
    </>
  );
}
