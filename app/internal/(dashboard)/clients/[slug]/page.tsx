import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CalendarBlank,
  CalendarCheck,
  ChartBar,
  ClockCounterClockwise,
  Eye,
  FileText,
  Handshake,
  Info,
  PencilSimple,
  Plus,
  SquaresFour,
  Target,
  Trophy,
} from "@phosphor-icons/react/dist/ssr";
import { requireClients } from "@/lib/internal/session";
import { clientsSlackReady } from "@/lib/internal/clients/slack";
import { readLinks } from "@/lib/internal/clients/links";
import {
  engagementsForWeek,
  weeklyUpdateText,
} from "@/lib/internal/clients/week";
import {
  loadClientWeek,
  taskAssignees,
} from "@/lib/internal/clients/week-data";
import { cleanMonth } from "@/lib/internal/clients/clean";
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
  loadStatusEvents,
  loadTemplates,
  ownerChoices,
} from "@/lib/internal/clients/data";
import {
  cycleProgress,
  engagementHealth,
  isInternal,
  plannedVsDelivered,
} from "@/lib/internal/clients/rules";
import {
  CADENCES,
  CLIENT_STATUSES,
  CYCLE_STATES,
  DELIVERABLE_KINDS,
  ENGAGEMENT_STATUSES,
  ENGAGEMENT_TYPES,
  INVOICE_STATES,
  addDays,
  clientPath,
  formatDay,
  labelOf,
  monthLabel,
  namesFrom,
  personName,
  plural,
  shiftWeek,
  templateFor,
  thisMonth,
  statusLabel,
  todayKey,
  weekStart,
  type Cycle,
  type Deliverable,
  type Engagement,
  type ScopeLine,
  type StatusEvent,
} from "@/lib/internal/clients/schema";
import { one } from "@/lib/internal/community/stats";
import {
  Card,
  CardTitle,
  EmptyState,
  ExternalLink,
  Field,
  Fields,
  Notice,
  PageHeader,
  buttonClass,
  formatDate,
  relativeDate,
} from "@/components/internal/ui";
import { LinkTabs, Meter, Pill } from "@/components/internal/community/ui";
import {
  ClientsLoadNotice,
  ClientsMigrationNotice,
  HealthBadge,
  OptionBadge,
  OwnerName,
} from "@/components/internal/clients/ui";
import {
  ClientArchiveButton,
  ClientDialog,
} from "@/components/internal/clients/client-dialog";
import { EngagementDialog } from "@/components/internal/clients/engagement-dialog";
import {
  CycleNotes,
  CycleStartButton,
  CycleStateControl,
  InvoiceControl,
} from "@/components/internal/clients/cycle-controls";
import { EngagementTime } from "@/components/internal/tasks/engagement-time";
import { CycleMonthNav } from "@/components/internal/clients/cycle-month-nav";
import { MonthWork } from "@/components/internal/clients/month-work";
import { ClientOverview } from "@/components/internal/clients/client-overview";
import { Partners } from "@/components/internal/clients/partners";
import { Milestones } from "@/components/internal/clients/milestones";
import { KeyNumbers } from "@/components/internal/clients/key-numbers";
import {
  ClientDocs,
  ClientLinks,
} from "@/components/internal/clients/client-links";
import { ClientLogo } from "@/components/internal/clients/client-logo";
import { ClientWeek } from "@/components/internal/clients/client-week";
import { AddClientTask } from "@/components/internal/clients/add-task-dialog";
import {
  CopyWeekUpdate,
  PostWeekToSlack,
} from "@/components/internal/clients/week-buttons";
import {
  WeekSwitcher,
  weekFromParam,
  weekName,
} from "@/components/internal/clients/week-switcher";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  // The title is data too: check access before reading the client.
  const [, { slug }] = await Promise.all([requireClients(), params]);
  const found = await loadClientBySlug(slug);
  return { title: found.ok && found.client ? found.client.name : "Client" };
}

const backLink = (
  <Link
    href="/internal/clients"
    className="inline-flex items-center gap-1 hover:text-[var(--i-ink)]"
  >
    <ArrowLeft size={13} /> Clients
  </Link>
);

/** The workspace's tabs (?tab=); Overview is the default. */
const TABS = [
  "overview",
  "work",
  "week",
  "partners",
  "milestones",
  "docs",
  "about",
] as const;
type Tab = (typeof TABS)[number];

/**
 * One client's workspace, in tabs: Overview (all time), Monthly (the month's
 * work), This week (the team's tasks and deliverables, with the weekly
 * update to copy), Partners, Milestones, Docs and About. Each tab loads only
 * what it shows.
 */
export default async function ClientWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, { slug }, query] = await Promise.all([
    requireClients(),
    params,
    searchParams,
  ]);
  const manager = staff.clients === "manager";
  const found = await loadClientBySlug(slug);
  if (!found.ok) {
    return (
      <>
        <PageHeader eyebrow={backLink} title="Client" />
        {found.missing ? (
          <ClientsMigrationNotice message={found.message} />
        ) : (
          <Notice tone="error">{found.message}</Notice>
        )}
      </>
    );
  }
  const client = found.client;
  if (!client) notFound();
  const links = readLinks(client.links);

  const today = todayKey();
  const current = thisMonth();
  const month = cleanMonth(one(query.month)) ?? current;
  const currentWeek = weekStart(today);
  const week = weekFromParam(query.week, today);
  // The overview by default; a month or week in the link opens that view.
  const tab: Tab =
    TABS.find((item) => item === one(query.tab)) ??
    (one(query.month) ? "work" : one(query.week) ? "week" : "overview");
  const base = clientPath(client.slug);

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
  const names = people.ok ? namesFrom(people.rows) : {};
  const picked = one(query.engagement);
  const engagement =
    engagementRows.find((item) => item.id === picked) ??
    engagementRows.find((item) => item.status === "active") ??
    engagementRows[0] ??
    null;

  // The week covers every engagement (but ended ones from this week on).
  const covered = engagementsForWeek(engagementRows, week, today);
  // Only the This week tab shows the week, so only it pays for the reads.
  const onWeek = tab === "week";
  const weekPromise = onWeek
    ? loadClientWeek({
        engagementIds: covered.map((item) => item.id),
        week,
        staff,
        time: true,
      })
    : Promise.resolve(null);
  const assigneesPromise =
    onWeek && manager ? taskAssignees(staff) : Promise.resolve([]);

  // Every month of every engagement (the overview adds them all up); the
  // Monthly tab shows the selected engagement's.
  const engagementIds = engagementRows.map((item) => item.id);
  // Partners and milestones only need the engagements, so they start now.
  const devrelPromise = Promise.all([
    devrelReady(),
    engagementIds.length ? loadMilestones(engagementIds) : null,
    engagementIds.length ? loadPartners(engagementIds) : null,
  ]);
  const cycles = engagementIds.length
    ? await loadCycles({ engagementIds })
    : null;
  const allCycles = cycles?.ok ? cycles.rows : [];
  const allCycleIds = allCycles.map((cycle) => cycle.id);
  const [lines, deliverables] = await Promise.all([
    loadScopeLines(allCycleIds),
    loadDeliverables({ cycleIds: allCycleIds }),
  ]);
  const allLines = lines.ok ? lines.rows : [];
  const allItems = deliverables.ok ? deliverables.rows : [];
  const cycleRows = engagement
    ? allCycles.filter((cycle) => cycle.engagement_id === engagement.id)
    : [];
  const lineRows = allLines;
  const itemRows = engagement
    ? allItems.filter((item) => item.engagement_id === engagement.id)
    : [];
  const cycle = cycleRows.find((item) => item.month === month) ?? null;
  const here = cycle
    ? itemRows.filter((item) => item.cycle_id === cycle.id)
    : [];
  const hereLines = cycle
    ? lineRows.filter((item) => item.cycle_id === cycle.id)
    : [];
  // The activity list is on the About tab only.
  const [events, weekData, assignees, [devrel, milestones, partners]] =
    await Promise.all([
      tab === "about" && here.length
        ? loadStatusEvents({
            deliverableIds: here.map((item) => item.id),
            limit: 2000,
          })
        : null,
      weekPromise,
      assigneesPromise,
      devrelPromise,
    ]);
  const eventRows = events?.ok ? events.rows : [];
  const allMilestones = milestones?.ok ? milestones.rows : [];
  const allPartners = partners?.ok ? partners.rows : [];
  const milestoneRows = allMilestones.filter(
    (item) => item.engagement_id === engagement?.id,
  );
  const partnerRows = allPartners.filter(
    (item) => item.engagement_id === engagement?.id,
  );
  // Partners and milestones: DevRel-style engagements, or any that has some.
  const devrelWork = Boolean(
    engagement &&
    (!["blogs_only", "internal"].includes(engagement.type) ||
      milestoneRows.length ||
      partnerRows.length),
  );
  const devrelMissing = Boolean(
    (milestones && !milestones.ok && milestones.missing) ||
    (partners && !partners.ok && partners.missing),
  );
  const monthViews = devrel
    ? here.reduce((sum, item) => sum + (item.views ?? 0), 0)
    : 0;

  const link = (changes: {
    engagement?: string;
    month?: string;
    week?: string;
    tab?: Tab;
  }) => {
    const next = new URLSearchParams();
    const pickedTab = changes.tab ?? tab;
    if (pickedTab !== "overview") next.set("tab", pickedTab);
    const engagementId = changes.engagement ?? engagement?.id;
    if (engagementId && (engagementRows.length > 1 || changes.engagement))
      next.set("engagement", engagementId);
    const pickedMonth = changes.month ?? month;
    if (pickedMonth !== current) next.set("month", pickedMonth);
    const pickedWeek = changes.week ?? week;
    if (pickedWeek !== currentWeek) next.set("week", pickedWeek);
    return `${base}${next.size ? `?${next}` : ""}`;
  };
  const reportHref = (target: string) =>
    engagement
      ? `/internal/clients/reports?month=${target}&engagement=${engagement.id}`
      : "/internal/clients/reports";

  const template = engagement
    ? templateFor(engagement.type, templates.ok ? templates.rows : [])
    : null;
  const internal = engagement ? isInternal(engagement.type) : false;
  const viewer = { email: staff.email, clients: staff.clients };

  const addEngagement = manager ? (
    <EngagementDialog
      clientId={client.id}
      workspacePath={base}
      owners={owners}
      names={names}
      me={staff.email}
      trigger={
        <button
          type="button"
          className={buttonClass(
            engagementRows.length ? "ghost" : "accent",
            "sm",
          )}
        >
          <Plus size={13} /> Add engagement
        </button>
      }
    />
  ) : null;

  const engagementNames =
    covered.length > 1
      ? Object.fromEntries(covered.map((item) => [item.id, item.name]))
      : undefined;
  const switcher = (
    <WeekSwitcher
      week={week}
      current={currentWeek}
      hrefFor={{
        previous: link({ week: shiftWeek(week, -1) }),
        next: link({ week: shiftWeek(week, 1) }),
        current: link({ week: currentWeek }),
      }}
    />
  );
  const heading = weekName(week, currentWeek);
  const taskEngagements = covered
    .filter((item) => item.status !== "ended")
    .map((item) => ({ id: item.id, name: item.name }));
  const weekSection = !covered.length || !weekData ? null : weekData.ok ? (
    <ClientWeek
      heading={heading}
      switcher={switcher}
      lines={weekData.lines}
      names={weekData.names}
      engagementNames={engagementNames}
      time={weekData.time}
      tasks={weekData.tasks}
      actions={
        <>
          <CopyWeekUpdate
            text={weeklyUpdateText({
              client: client.name,
              week,
              today,
              lines: weekData.lines,
              engagements: engagementNames,
            })}
          />
          {manager && clientsSlackReady() ? (
            <PostWeekToSlack clientId={client.id} week={week} />
          ) : null}
          {manager &&
          weekData.tasks === "ready" &&
          assignees.length > 0 &&
          taskEngagements.length > 0 ? (
            <AddClientTask
              clientName={client.name}
              people={assignees}
              engagements={taskEngagements}
              deliverables={weekData.open}
              defaultDue={week > currentWeek ? addDays(week, 4) : ""}
            />
          ) : null}
        </>
      }
    />
  ) : (
    <section aria-label="This week" className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[16px] font-medium tracking-[-0.01em]">
          {heading}
        </h2>
        {switcher}
      </div>
      <Notice tone="error">{weekData.message}</Notice>
    </section>
  );

  return (
    <>
      <PageHeader
        eyebrow={backLink}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <ClientLogo
              slug={client.slug}
              name={client.name}
              website={client.website}
              size={28}
              className="mr-0.5"
            />
            {client.name}
            <OptionBadge list={CLIENT_STATUSES} value={client.status} />
            {client.archived_at ? <Pill>Archived</Pill> : null}
          </span>
        }
        description={[
          client.contact_name ? `Contact: ${client.contact_name}` : "",
          client.started_on
            ? `With us since ${formatDay(client.started_on, today)}`
            : "",
          plural(engagementRows.length, "engagement"),
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          manager ? (
            <>
              <ClientArchiveButton
                clientId={client.id}
                archived={Boolean(client.archived_at)}
              />
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
          <Notice>
            This client is archived: it&apos;s hidden from the lists, and its
            past months stay here for reports.
          </Notice>
        </div>
      ) : null}
      <ClientsLoadNotice
        show={incomplete(
          engagements,
          people,
          templates,
          cycles,
          lines,
          deliverables,
          events,
        )}
      />

      {engagementRows.length > 1 ? (
        <LinkTabs
          active={engagement?.id ?? ""}
          items={engagementRows.map((item) => ({
            key: item.id,
            label:
              item.status === "active"
                ? item.name
                : `${item.name} (${labelOf(ENGAGEMENT_STATUSES, item.status)})`,
            href: link({ engagement: item.id }),
          }))}
        />
      ) : null}

      <LinkTabs
        active={tab}
        items={[
          {
            key: "overview",
            label: "Overview",
            href: link({ tab: "overview" }),
            icon: <SquaresFour size={14} aria-hidden />,
          },
          {
            key: "work",
            label: "Monthly",
            href: link({ tab: "work" }),
            icon: <CalendarBlank size={14} aria-hidden />,
          },
          {
            key: "week",
            label: "This week",
            href: link({ tab: "week" }),
            icon: <CalendarCheck size={14} aria-hidden />,
          },
          ...(devrelWork
            ? [
                {
                  key: "partners",
                  label: "Partners",
                  count: partnerRows.length,
                  href: link({ tab: "partners" }),
                  icon: <Handshake size={14} aria-hidden />,
                },
                {
                  key: "milestones",
                  label: "Milestones",
                  count: milestoneRows.length,
                  href: link({ tab: "milestones" }),
                  icon: <Trophy size={14} aria-hidden />,
                },
              ]
            : []),
          {
            key: "docs",
            label: "Docs",
            count: links.filter((item) => item.group === "doc").length,
            href: link({ tab: "docs" }),
            icon: <FileText size={14} aria-hidden />,
          },
          {
            key: "about",
            label: "About",
            href: link({ tab: "about" }),
            icon: <Info size={14} aria-hidden />,
          },
        ]}
      />

      {tab === "overview" ? (
        <ClientOverview
          engagementId={engagement?.id}
          engagements={engagementRows}
          cycles={allCycles}
          lines={allLines}
          deliverables={allItems}
          milestones={allMilestones}
          partners={allPartners}
          monthHref={(target, engagementId) =>
            link({ tab: "work", month: target, engagement: engagementId })
          }
          reportHref={(target, engagementId) =>
            `/internal/clients/reports?month=${target}&engagement=${engagementId}`
          }
          tabHref={(target) => link({ tab: target })}
        />
      ) : null}
      {tab === "work" ? (
        <>
          {engagement ? (
            <section aria-label="The month" className="mb-8">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="min-w-0 text-[16px] font-medium tracking-[-0.01em]">
                  {monthLabel(month)}
                  <span className="font-normal text-[var(--i-muted)]">
                    {" "}
                    · {engagement.name}
                  </span>
                </h2>
                <CycleMonthNav
                  month={month}
                  href={(target) => link({ month: target })}
                />
              </div>

              {cycle ? (
                <>
                  {/* The month at a glance, on one line. */}
                  <Card className="mb-4">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
                      <MonthSummary
                        month={month}
                        lines={hereLines}
                        deliverables={here}
                        views={monthViews}
                      />
                      <span className="flex-1" />
                      <CycleStateControl
                        cycleId={cycle.id}
                        state={cycle.state}
                        canEdit={manager}
                      />
                      <InvoiceControl
                        cycleId={cycle.id}
                        state={cycle.invoice_state}
                        url={cycle.invoice_url}
                        canEdit={manager}
                      />
                      <Link
                        href={reportHref(month)}
                        className="inline-flex items-center gap-1 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
                      >
                        <ChartBar size={13} /> Report
                      </Link>
                    </div>
                  </Card>
                  <MonthWork
                    cycleId={cycle.id}
                    lines={hereLines}
                    deliverables={here}
                    viewer={viewer}
                    internal={internal}
                    owners={owners}
                    names={names}
                    canEditPlan={manager}
                    devrel={devrel}
                  />
                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <MonthByMonth
                      cycles={cycleRows}
                      lines={lineRows}
                      deliverables={itemRows}
                      month={month}
                      href={(target) => link({ month: target })}
                      reportHref={reportHref}
                      current={current}
                    />
                    <Card className="h-fit">
                      <CardTitle>Notes for the month</CardTitle>
                      <div className="px-5 py-4">
                        <CycleNotes
                          cycleId={cycle.id}
                          scopeNote={cycle.scope_note}
                          retroNote={cycle.retro_note}
                          canEdit={manager}
                        />
                      </div>
                    </Card>
                  </div>
                  {/* Hours logged in Tasks on this engagement this month. */}
                  <EngagementTime
                    viewer={{
                      email: staff.email,
                      status: staff.status,
                      roles: staff.roles,
                    }}
                    engagementId={engagement.id}
                    month={month}
                    deliverables={here}
                    names={names}
                  />
                </>
              ) : (
                <Card>
                  <EmptyState
                    icon={<CalendarBlank size={20} />}
                    title={`${monthLabel(month)} hasn't been started`}
                    action={
                      manager ? (
                        <CycleStartButton
                          engagementId={engagement.id}
                          month={month}
                        />
                      ) : undefined
                    }
                  >
                    {manager
                      ? `It starts with the ${labelOf(ENGAGEMENT_TYPES, engagement.type).toLowerCase()} plan: ${
                          template?.lines
                            .filter((line) => line.quantity > 0)
                            .map(
                              (line) =>
                                `${line.quantity} × ${line.label || labelOf(DELIVERABLE_KINDS, line.kind)}`,
                            )
                            .join(", ") || "nothing yet"
                        }. Change the numbers to match the contract, then add each piece as it starts.`
                      : "A client manager starts each month. From the 25th, next month starts on its own for active engagements."}
                  </EmptyState>
                </Card>
              )}
            </section>
          ) : (
            <Card className="mb-8">
              <EmptyState
                icon={<Briefcase size={20} />}
                title="No engagements yet"
                action={addEngagement}
              >
                {manager
                  ? "An engagement is one stream of work for this client, like their blogs or a DevRel retainer. Each month it gets a plan (say, 4 blogs) and you add each piece as it starts."
                  : "A client manager adds this client's engagements."}
              </EmptyState>
            </Card>
          )}
        </>
      ) : null}

      {tab === "week" ? weekSection : null}

      {tab === "partners" ? (
        engagement && devrelWork && !devrelMissing ? (
          <Partners
            engagementId={engagement.id}
            partners={partnerRows}
            viewer={{ email: staff.email, manager }}
            owners={owners}
            names={names}
          />
        ) : (
          <Notice>
            {devrelMissing
              ? "Partners show here once the DevRel tracker update has run in Supabase (supabase/migrations/20261116130000_devrel_tracker.sql)."
              : engagement
                ? "Partners are tracked for DevRel work, and this engagement isn't that kind."
                : "Add an engagement to start tracking partners."}
          </Notice>
        )
      ) : null}
      {tab === "milestones" ? (
        engagement && devrelWork && !devrelMissing ? (
          <div className="space-y-5">
            <KeyNumbers
              engagementId={engagement.id}
              milestones={milestoneRows}
            />
            <div className="max-w-3xl">
              <Milestones
                engagementId={engagement.id}
                milestones={milestoneRows}
                viewer={{ email: staff.email, manager }}
              />
            </div>
          </div>
        ) : (
          <Notice>
            {devrelMissing
              ? "Milestones show here once the DevRel tracker update has run in Supabase (supabase/migrations/20261116130000_devrel_tracker.sql)."
              : engagement
                ? "Milestones are tracked for DevRel work, and this engagement isn't that kind."
                : "Add an engagement to start tracking milestones."}
          </Notice>
        )
      ) : null}
      {tab === "docs" ? (
        <div className="max-w-3xl">
          <ClientDocs clientId={client.id} links={links} canEdit={manager} />
        </div>
      ) : null}
      {tab === "about" ? (
        <section aria-label="About">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">
              {engagement ? (
                <EngagementCard
                  engagement={engagement}
                  rhythm={template?.rhythm ?? ""}
                  names={names}
                  action={
                    <span className="flex items-center gap-1">
                      {manager ? (
                        <EngagementDialog
                          engagement={engagement}
                          clientId={client.id}
                          workspacePath={base}
                          owners={owners}
                          names={names}
                          trigger={
                            <button
                              type="button"
                              className={buttonClass("ghost", "sm")}
                            >
                              <PencilSimple size={13} /> Edit
                            </button>
                          }
                        />
                      ) : null}
                      {addEngagement}
                    </span>
                  }
                />
              ) : null}
            </div>
            <Card className="h-fit">
              <CardTitle>Client details</CardTitle>
              <div className="px-5 py-4">
                <Fields>
                  <Field label="Primary contact">
                    {client.contact_name || client.contact_email ? (
                      <span className="flex min-w-0 flex-col">
                        {client.contact_name ? (
                          <span>{client.contact_name}</span>
                        ) : null}
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
                  <Field label="Slack channel">
                    {client.slack_channel_id || null}
                  </Field>
                  <Field label="Website">
                    {client.website ? (
                      <ExternalLink href={client.website} />
                    ) : null}
                  </Field>
                  <Field label="Start date">
                    {client.started_on
                      ? formatDay(client.started_on, today)
                      : null}
                  </Field>
                  {client.notes ? (
                    <Field label="Notes" wide>
                      <span className="whitespace-pre-wrap break-words">
                        {client.notes}
                      </span>
                    </Field>
                  ) : null}
                </Fields>
              </div>
            </Card>
          </div>
          {engagement ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Activity
                events={eventRows}
                deliverables={here}
                names={names}
                hasCycle={Boolean(cycle)}
              />
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

function EngagementCard({
  engagement,
  rhythm,
  names,
  action,
}: {
  engagement: Engagement;
  rhythm: string;
  names: Readonly<Record<string, string>>;
  action: ReactNode;
}) {
  const today = todayKey();
  return (
    <Card>
      <CardTitle action={action}>{engagement.name}</CardTitle>
      <div className="px-5 py-4">
        <Fields>
          <Field label="Type">
            <OptionBadge list={ENGAGEMENT_TYPES} value={engagement.type} />
          </Field>
          <Field label="Status">
            <OptionBadge list={ENGAGEMENT_STATUSES} value={engagement.status} />
          </Field>
          <Field label="Account owner">
            {engagement.owner ? (
              <OwnerName email={engagement.owner} names={names} />
            ) : null}
          </Field>
          <Field label="Cadence">{labelOf(CADENCES, engagement.cadence)}</Field>
          <Field label="Dates">
            {engagement.starts_on || engagement.ends_on
              ? `${engagement.starts_on ? formatDay(engagement.starts_on, today) : "Open start"} – ${
                  engagement.ends_on
                    ? formatDay(engagement.ends_on, today)
                    : "ongoing"
                }`
              : null}
          </Field>
          <Field label="Weekly rhythm">{rhythm || null}</Field>
          <Field label="Client tracker">
            {engagement.client_tracker_url ? (
              <ExternalLink href={engagement.client_tracker_url}>
                Open their tracker
              </ExternalLink>
            ) : null}
          </Field>
          <Field label="Contract">
            {engagement.contract_url ? (
              <ExternalLink href={engagement.contract_url}>
                Open the contract
              </ExternalLink>
            ) : null}
          </Field>
          {engagement.notes ? (
            <Field label="Notes" wide>
              <span className="whitespace-pre-wrap break-words">
                {engagement.notes}
              </span>
            </Field>
          ) : null}
        </Fields>
      </div>
    </Card>
  );
}

/** Progress, health and reach in one line, for the summary strip. */
function MonthSummary({
  month,
  lines,
  deliverables,
  views,
}: {
  month: string;
  lines: Parameters<typeof cycleProgress>[0];
  deliverables: readonly Deliverable[];
  views: number;
}) {
  const progress = cycleProgress(lines, deliverables);
  const health = engagementHealth({ month, lines, deliverables });
  return (
    <span className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
      <span className="flex items-center gap-2.5">
        <Target size={15} aria-hidden className="text-[var(--i-muted)]" />
        <span className="tabular-nums">
          <span className="font-medium">{progress.done}</span>
          <span className="text-[var(--i-muted)]">
            {/* A month with nothing planned (a past month logged after the
                fact) counts what was done, not "of 0". */}
            {progress.planned > 0 ? ` of ${progress.planned} done` : " done"}
          </span>
        </span>
        {progress.planned > 0 ? (
          <span className="w-24">
            <Meter
              value={Math.min(progress.done, progress.planned)}
              max={progress.planned}
              label={`${progress.done} of ${progress.planned} done`}
            />
          </span>
        ) : null}
      </span>
      <HealthBadge level={health.level} reason={health.reason} />
      {views > 0 ? (
        <span className="flex items-center gap-1.5 tabular-nums text-[var(--i-muted)]">
          <Eye size={15} aria-hidden />
          <span className="font-medium text-[var(--i-ink)]">
            {views.toLocaleString("en-US")}
          </span>
          views
        </span>
      ) : null}
    </span>
  );
}

/** Who moved what in the month, newest first, with their comment. */
function Activity({
  events,
  deliverables,
  names,
  hasCycle,
}: {
  events: readonly StatusEvent[];
  deliverables: readonly Deliverable[];
  names: Readonly<Record<string, string>>;
  hasCycle: boolean;
}) {
  const titles = new Map(deliverables.map((item) => [item.id, item.title]));
  const shown = events.slice(0, 20);
  const kinds = new Map(deliverables.map((item) => [item.id, item.kind]));
  const status = (value: StatusEvent["to_status"], id: string) =>
    value ? statusLabel(value, kinds.get(id)) : "";
  return (
    <Card className="h-fit">
      <CardTitle>Activity this month</CardTitle>
      {shown.length ? (
        <ul className="divide-y divide-[var(--i-line)]">
          {shown.map((event) => {
            const who = personName(event.by, names) || "Someone";
            const title = titles.get(event.deliverable_id) ?? "a deliverable";
            const what =
              event.kind === "created"
                ? `added ${title}${event.to_status && event.to_status !== "planned" ? ` at ${status(event.to_status, event.deliverable_id)}` : ""}`
                : event.kind === "blocked"
                  ? `marked ${title} blocked`
                  : event.kind === "unblocked"
                    ? `unblocked ${title}`
                    : `moved ${title} from ${status(event.from_status, event.deliverable_id) || "—"} to ${status(event.to_status, event.deliverable_id) || "—"}`;
            return (
              <li key={event.id} className="px-5 py-2.5">
                <p className="text-[13px] leading-snug">
                  <span className="font-medium">{who}</span> {what}
                </p>
                {event.comment ? (
                  <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap break-words text-[12.5px] text-[var(--i-ink-2)]">
                    {event.comment}
                  </p>
                ) : null}
                <p
                  className="mt-0.5 text-[11.5px] text-[var(--i-faint)]"
                  title={formatDate(event.at)}
                >
                  {relativeDate(event.at)}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex items-center gap-2.5 px-5 py-6 text-[13px] text-[var(--i-muted)]">
          <ClockCounterClockwise size={16} className="shrink-0" />
          {hasCycle
            ? "Status changes and blocks on this month's deliverables show up here."
            : "Nothing yet. Activity shows once the month is started and has deliverables."}
        </div>
      )}
    </Card>
  );
}

/**
 * Every month of the engagement, newest first, with what got published
 * against the plan per kind ("Blogs 3 of 4"): the month-end answer.
 */
function MonthByMonth({
  cycles,
  lines,
  deliverables,
  month,
  current,
  href,
  reportHref,
}: {
  cycles: readonly Cycle[];
  lines: readonly ScopeLine[];
  deliverables: readonly Deliverable[];
  /** The month in view. */
  month: string;
  current: string;
  href: (month: string) => string;
  reportHref: (month: string) => string;
}) {
  const ordered = [...cycles].sort((a, b) => b.month.localeCompare(a.month));
  return (
    <Card className="h-fit">
      <CardTitle>
        Month by month{" "}
        <span className="font-normal text-[var(--i-faint)]">
          {cycles.length}
        </span>
      </CardTitle>
      {ordered.length ? (
        <ul className="divide-y divide-[var(--i-line)]">
          {ordered.map((item) => {
            const counts = plannedVsDelivered(
              lines.filter((line) => line.cycle_id === item.id),
              deliverables.filter(
                (deliverable) => deliverable.cycle_id === item.id,
              ),
            ).filter((row) => row.planned > 0 || row.done > 0);
            const on = item.month === month;
            return (
              <li
                key={item.id}
                className={on ? "bg-[var(--i-sunken)]" : undefined}
              >
                <div className="flex flex-wrap items-start gap-x-4 gap-y-1.5 px-5 py-3">
                  <div className="min-w-0 flex-1 basis-48">
                    <Link
                      href={href(item.month)}
                      aria-current={on ? "page" : undefined}
                      className="text-[13.5px] font-medium hover:text-[var(--i-accent-text)]"
                    >
                      {monthLabel(item.month)}
                    </Link>
                    <p className="mt-0.5 text-[12.5px] tabular-nums text-[var(--i-muted)]">
                      {counts.length
                        ? counts.map((row, index) => (
                            <span key={row.kind}>
                              {index ? " · " : ""}
                              {row.label}{" "}
                              <span
                                className={
                                  row.planned > 0 && row.done >= row.planned
                                    ? "font-medium text-emerald-700 dark:text-emerald-300"
                                    : "font-medium text-[var(--i-ink)]"
                                }
                              >
                                {row.planned > 0
                                  ? `${row.done} of ${row.planned}`
                                  : row.done}
                              </span>
                            </span>
                          ))
                        : "Nothing planned"}
                      {item.month === current ? " so far" : ""}
                    </p>
                  </div>
                  <span className="flex flex-wrap items-center gap-2">
                    <OptionBadge list={CYCLE_STATES} value={item.state} />
                    <OptionBadge
                      list={INVOICE_STATES}
                      value={item.invoice_state}
                    />
                    <Link
                      href={reportHref(item.month)}
                      className="text-[12.5px] text-[var(--i-muted)] underline decoration-[var(--i-line-strong)] underline-offset-[3px] hover:text-[var(--i-ink)]"
                    >
                      Report
                    </Link>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
          No months yet. Start {monthLabel(current)} to plan this
          engagement&apos;s work.
        </p>
      )}
    </Card>
  );
}
