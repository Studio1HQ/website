import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarBlank, DownloadSimple, Eye, FileText, ListChecks } from "@/components/internal/icons";
import { inScope } from "@/lib/internal/clients/scope";
import { canSeeMoney, requireClients, type Staff } from "@/lib/internal/session";
import { ensureNextCycles, takesNewMonths } from "@/lib/internal/clients/cycles";
import {
  devrelReady,
  incomplete,
  loadClientBySlug,
  loadCycles,
  loadDeliverables,
  loadEngagements,
  loadMilestones,
  loadPeople,
  loadScopeLines,
  loadStatusEvents,
  loadTemplates,
  ownerChoices,
} from "@/lib/internal/clients/data";
import { buildClientReport, reportText } from "@/lib/internal/clients/report-text";
import { isInternal } from "@/lib/internal/clients/rules";
import { projectName, projectPath } from "@/lib/internal/clients/projects";
import {
  CYCLE_STATES,
  DELIVERABLE_KINDS,
  clientPath,
  engagementTypes,
  isMonthKey,
  isOwnedBy,
  labelOf,
  monthLabel,
  namesFrom,
  personName,
  templateFor,
  thisMonth,
  todayKey,
  type ClientAccount,
} from "@/lib/internal/clients/schema";
import { one } from "@/lib/internal/community/stats";
import { Card, EmptyState, Notice, PageHeader, buttonClass } from "@/components/internal/ui";
import { LinkTabs } from "@/components/internal/community/ui";
import { PrintButton } from "@/components/internal/community/print-button";
import { ClientsLoadNotice, ClientsMigrationNotice, OptionBadge, ProgressMeter } from "@/components/internal/clients/ui";
import { ClientLogo } from "@/components/internal/clients/client-logo";
import { CycleNotes, CycleStartButton, CycleStateControl, InvoiceControl } from "@/components/internal/clients/cycle-controls";
import { CycleMonthNav } from "@/components/internal/clients/cycle-month-nav";
import { MonthWork } from "@/components/internal/clients/month-work";
import { ReportCopyButton } from "@/components/internal/clients/report-copy-button";
import { ReportView } from "@/components/internal/clients/report-view";
import { Activity, Fold, HeldUp, monthFacts } from "@/components/internal/clients/project-parts";

type Params = Promise<{ slug: string; month: string }>;
type Query = Promise<Record<string, string | string[] | undefined>>;

/** The company, if this person may open it (an admin can give someone only some clients). */
async function companyFor(staff: Staff, slug: string) {
  const found = await loadClientBySlug(slug);
  if (!found.ok) return found;
  if (!found.client || !inScope(staff.clientScope, found.client.id)) notFound();
  return { ok: true as const, client: found.client };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  // The title is data too: check access before reading the client.
  const [staff, { slug, month }] = await Promise.all([requireClients(), params]);
  const found = await loadClientBySlug(slug);
  const client = found.ok ? found.client : null;
  if (!client || !inScope(staff.clientScope, client.id) || !isMonthKey(month)) return { title: "Project" };
  return { title: `${client.name} · ${monthLabel(month, true)}` };
}

/**
 * A project: one company's work for one month ("DevRel · November 2026").
 * Work (the default) is the month's pieces, where each one is added and its
 * links kept; Report is the same month as the client reads it, to copy,
 * print or download. The month's state, invoice, notes and activity sit
 * folded at the bottom.
 */
export default async function ProjectPage({ params, searchParams }: { params: Params; searchParams: Query }) {
  const [staff, { slug, month }, query] = await Promise.all([requireClients(), params, searchParams]);
  if (!isMonthKey(month)) notFound();
  const manager = staff.clients === "manager";
  const money = canSeeMoney(staff);
  const found = await companyFor(staff, slug);
  if (!found.ok) {
    return (
      <>
        <PageHeader eyebrow={<BackTo href="/clients" label="Clients" />} title="Project" />
        {found.missing ? <ClientsMigrationNotice message={found.message} /> : <Notice tone="error">{found.message}</Notice>}
      </>
    );
  }
  const client: ClientAccount = found.client;
  const company = clientPath(client.slug);
  const back = <BackTo href={company} label={client.name} />;
  const today = todayKey();
  const current = thisMonth();

  const [engagements, people, templates, owners] = await Promise.all([
    loadEngagements({ clientId: client.id }),
    loadPeople(),
    loadTemplates(),
    ownerChoices(),
  ]);
  if (!engagements.ok) {
    return (
      <>
        <PageHeader eyebrow={back} title={client.name} />
        {engagements.missing ? <ClientsMigrationNotice message={engagements.message} /> : <Notice tone="error">{engagements.message}</Notice>}
      </>
    );
  }
  const engagementRows = engagements.rows;
  // No projects at all: the company page says how to add one.
  if (!engagementRows.length) redirect(company);
  const several = engagementRows.length > 1;
  const names = people.ok ? namesFrom(people.rows) : {};
  const types = engagementTypes(templates.ok ? templates.rows : []);

  let cycles = await loadCycles({ engagementIds: engagementRows.map((item) => item.id), month });
  const has = (id: string) => cycles.ok && cycles.rows.some((cycle) => cycle.engagement_id === id);
  // The one asked for; else the running one that has this month; else any that has it; else the running one.
  const asked = one(query.e) ?? one(query.engagement);
  const engagement =
    engagementRows.find((item) => item.id === asked) ??
    engagementRows.find((item) => item.status === "active" && has(item.id)) ??
    engagementRows.find((item) => has(item.id)) ??
    engagementRows.find((item) => item.status === "active") ??
    engagementRows[0];

  // Months start themselves: a running engagement with no row for the
  // current month gets one (last month's plan carried over) the first time
  // anyone opens it. Running it twice changes nothing. Not for a client
  // that is paused, ended or archived.
  if (month === current && engagement.status === "active" && takesNewMonths(client) && cycles.ok && !has(engagement.id)) {
    const started = await ensureNextCycles({ month, by: staff.email, engagementIds: [engagement.id] });
    // Read again, past this request's kept copy (it's from before the month
    // was made). Also when nothing was made here: someone else opening the
    // page at the same moment may have started it.
    if (started.ok) cycles = await loadCycles({ engagementIds: engagementRows.map((item) => item.id), month }, { fresh: true });
  }
  const cycle = cycles.ok ? (cycles.rows.find((item) => item.engagement_id === engagement.id) ?? null) : null;

  const report = one(query.view) === "report";
  const [lines, deliverables, devrel, milestones] = await Promise.all([
    loadScopeLines(cycle ? [cycle.id] : []),
    loadDeliverables({ cycleIds: cycle ? [cycle.id] : [] }),
    devrelReady(),
    report ? loadMilestones([engagement.id]) : Promise.resolve(null),
  ]);
  const lineRows = lines.ok ? lines.rows : [];
  const pieces = deliverables.ok ? deliverables.rows : [];
  // The activity fold is on the Work view only.
  const events =
    !report && pieces.length ? await loadStatusEvents({ deliverableIds: pieces.map((item) => item.id), limit: 200 }) : null;
  const clientReport =
    report && cycle
      ? buildClientReport({
          client,
          engagement,
          cycle,
          lines: lineRows,
          deliverables: pieces,
          names,
          milestones: milestones?.ok ? milestones.rows : [],
        })
      : null;
  const facts = monthFacts(lineRows, pieces, today);
  const name = projectName(engagement, client.name, types);
  const href = (target: { month?: string; report?: boolean }) =>
    projectPath(client.slug, target.month ?? month, {
      engagement: several ? engagement.id : null,
      view: (target.report ?? report) ? "report" : undefined,
    });
  const template = templateFor(engagement.type, templates.ok ? templates.rows : []);
  const canExport = manager || isOwnedBy(engagement.owner, staff.email);
  const exportQuery = new URLSearchParams({ engagement: engagement.id, month });

  return (
    <>
      <PageHeader
        eyebrow={back}
        title={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <ClientLogo slug={client.slug} name={client.name} website={client.website} size={26} className="mr-0.5" />
            {name}
            <span className="font-normal text-[var(--i-muted)]">· {monthLabel(month)}</span>
            {cycle ? <OptionBadge list={CYCLE_STATES} value={cycle.state} /> : null}
          </span>
        }
        description={
          cycle ? (
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="w-48">
                <ProgressMeter done={facts.progress.done} planned={facts.progress.planned} approved={facts.progress.approved} compact />
              </span>
              {facts.views ? (
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Eye size={14} aria-hidden /> {facts.views.toLocaleString("en-US")} views
                </span>
              ) : null}
              <HeldUp blocked={facts.blocked} waiting={facts.waiting} late={facts.late} />
              {engagement.owner ? <span>Run by {personName(engagement.owner, names)}</span> : null}
            </span>
          ) : undefined
        }
        actions={<CycleMonthNav month={month} href={(target) => href({ month: target })} />}
      />
      {several ? (
        <LinkTabs
          active={engagement.id}
          items={engagementRows.map((item) => ({
            key: item.id,
            label: projectName(item, client.name, types),
            href: projectPath(client.slug, month, { engagement: item.id }),
          }))}
        />
      ) : null}
      <ClientsLoadNotice show={incomplete(engagements, people, templates, cycles, lines, deliverables)} />

      {!cycle ? (
        <Card>
          <EmptyState
            icon={<CalendarBlank size={20} />}
            title={`${name} has no ${monthLabel(month)} yet`}
            action={manager && engagement.status !== "ended" ? <CycleStartButton engagementId={engagement.id} month={month} /> : undefined}
          >
            {manager
              ? `Starting it carries over last month's plan. With no last month it starts from the ${labelOf(types, engagement.type).toLowerCase()} plan: ${
                  template.lines
                    .filter((line) => line.quantity > 0)
                    .map((line) => `${line.quantity} × ${line.label || labelOf(DELIVERABLE_KINDS, line.kind)}`)
                    .join(", ") || "nothing yet"
                }. Then add each piece as it starts.`
              : takesNewMonths(client)
                ? "This month hasn't been started. The current month starts on its own; a client manager can start any other."
                : "This month hasn't been started. Months don't start on their own while the client is paused, ended or archived; a client manager can start one."}
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <LinkTabs
              active={report ? "report" : "work"}
              items={[
                { key: "work", label: "Work", href: href({ report: false }), icon: <ListChecks size={14} aria-hidden /> },
                { key: "report", label: "Report", href: href({ report: true }), icon: <FileText size={14} aria-hidden /> },
              ]}
            />
            {report ? (
              <div className="flex flex-wrap items-center gap-2">
                {canExport ? (
                  <>
                    <a href={`/clients/reports/export?${exportQuery}`} className={buttonClass("secondary", "sm")}>
                      <DownloadSimple size={13} /> CSV
                    </a>
                    {clientReport ? <ReportCopyButton text={reportText(clientReport)} /> : null}
                  </>
                ) : null}
                <PrintButton label="Print / PDF" />
              </div>
            ) : null}
          </div>

          {report && clientReport ? (
            <>
              {!canExport ? (
                <p className="mb-3 text-[12.5px] text-[var(--i-muted)] print:hidden">
                  The CSV and the copy for the client are for client managers and{" "}
                  {engagement.owner ? personName(engagement.owner, names) : "the account owner"}.
                </p>
              ) : null}
              <div className="mx-auto max-w-[960px]">
                <ReportView report={clientReport} />
              </div>
            </>
          ) : (
            <>
              <MonthWork
                cycleId={cycle.id}
                lines={lineRows}
                deliverables={pieces}
                viewer={{ email: staff.email, clients: staff.clients }}
                internal={isInternal(engagement.type)}
                owners={owners}
                names={names}
                canEditPlan={manager}
                devrel={devrel}
              />
              <div className="mt-8 space-y-3">
                <Fold title="This month" note={`state, notes${money ? ", invoice" : ""}`}>
                  {manager || money ? (
                    <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                      <CycleStateControl cycleId={cycle.id} state={cycle.state} canEdit={manager} />
                      {money ? (
                        <InvoiceControl cycleId={cycle.id} state={cycle.invoice_state} url={cycle.invoice_url} canEdit={manager} />
                      ) : null}
                    </div>
                  ) : null}
                  <div className="max-w-3xl">
                    <CycleNotes cycleId={cycle.id} scopeNote={cycle.scope_note} retroNote={cycle.retro_note} canEdit={manager} />
                  </div>
                </Fold>
                <Fold title="Activity" note={events?.ok && events.rows.length ? String(Math.min(events.rows.length, 20)) : undefined}>
                  <Activity events={events?.ok ? events.rows : []} deliverables={pieces} names={names} />
                </Fold>
              </div>
            </>
          )}
        </>
      )}
      {!cycle ? null : (
        <p className="mt-6 text-[12px] text-[var(--i-faint)] print:hidden">
          <Link href={company} className="hover:text-[var(--i-ink)]">
            All of {client.name}&apos;s projects
          </Link>
        </p>
      )}
    </>
  );
}

function BackTo({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 hover:text-[var(--i-ink)]">
      <ArrowLeft size={13} /> {label}
    </Link>
  );
}
