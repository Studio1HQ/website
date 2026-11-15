import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Briefcase, Kanban, Plus, Rows } from "@phosphor-icons/react/dist/ssr";
import { requireClients } from "@/lib/internal/session";
import { cleanMonth } from "@/lib/internal/clients/clean";
import {
  CLIENTS_VIEW_COOKIE,
  asClientsView,
  type ClientsView,
} from "@/lib/internal/clients/overview-view";
import { loadClientWork, loadCycles } from "@/lib/internal/clients/data";
import type { EngagementRow } from "@/lib/internal/clients/rules";
import {
  CLIENT_STATUSES,
  CYCLE_STATES,
  ENGAGEMENT_STATUSES,
  ENGAGEMENT_TYPES,
  clientPath,
  labelOf,
  monthLabel,
  plural,
  shiftMonth,
  thisMonth,
  todayKey,
  type ClientAccount,
  type Engagement,
} from "@/lib/internal/clients/schema";
import { one } from "@/lib/internal/community/stats";
import {
  Card,
  CardTitle,
  EmptyState,
  Notice,
  PageHeader,
  buttonClass,
  relativeDate,
} from "@/components/internal/ui";
import {
  LinkTabs,
  Muted,
  Pill,
  RowLink,
  Stat,
  Table,
  rowClass,
} from "@/components/internal/community/ui";
import {
  ClientsLoadNotice,
  ClientsMigrationNotice,
  HealthBadge,
  OptionBadge,
  OwnerName,
  ProgressMeter,
} from "@/components/internal/clients/ui";
import { ClientDialog } from "@/components/internal/clients/client-dialog";
import { ClientLogo } from "@/components/internal/clients/client-logo";
import {
  ClientBoard,
  RememberClientsView,
  type BoardClient,
} from "@/components/internal/clients/client-board";
import { CycleStartAllButton } from "@/components/internal/clients/cycle-controls";
import { CycleMonthNav } from "@/components/internal/clients/cycle-month-nav";

export const metadata: Metadata = { title: "Clients" };

type View = ClientsView;
const asView = asClientsView;

/** The overview: every active engagement this month with its health, then everyone else. */
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params, jar] = await Promise.all([
    requireClients(),
    searchParams,
    cookies(),
  ]);
  const manager = staff.clients === "manager";
  // Table or Board: the one asked for, else the one this person last picked.
  const picked = asView(one(params.view));
  const view: View =
    picked ?? asView(jar.get(CLIENTS_VIEW_COOKIE)?.value) ?? "table";
  const current = thisMonth();
  const month = cleanMonth(one(params.month)) ?? current;
  const showArchived = one(params.archived) === "1";
  const next = shiftMonth(current, 1);
  const today = todayKey();

  const [work, nextCycles] = await Promise.all([
    loadClientWork(month),
    manager ? loadCycles({ month: next }) : Promise.resolve(null),
  ]);

  const href = (changes: {
    month?: string;
    archived?: boolean;
    view?: View;
  }) => {
    const query = new URLSearchParams();
    const pickedMonth = changes.month ?? month;
    if (pickedMonth !== current) query.set("month", pickedMonth);
    if (changes.archived ?? showArchived) query.set("archived", "1");
    const pickedView = changes.view ?? (view === "board" ? view : undefined);
    if (pickedView) query.set("view", pickedView);
    return `/internal/clients${query.size ? `?${query}` : ""}`;
  };

  const denied =
    params.denied !== undefined ? (
      <div className="mb-5">
        <Notice tone="warning">
          You can see client work but not change that. Ask an admin for the
          Client manager role.
        </Notice>
      </div>
    ) : null;

  if (!work.ok) {
    return (
      <>
        <PageHeader
          title="Clients"
          description="Every active engagement, its month so far and its health."
        />
        {denied}
        {work.missing ? (
          <ClientsMigrationNotice message={work.message} />
        ) : (
          <Notice tone="error">{work.message}</Notice>
        )}
      </>
    );
  }

  // Archived clients only ever show in the second group, behind the toggle.
  const isArchived = (client: ClientAccount | null) =>
    Boolean(client?.archived_at);
  const active = work.rows.filter(
    (row) =>
      row.engagement.status === "active" &&
      row.client &&
      !isArchived(row.client),
  );
  const activeClientIds = new Set(
    active.map((row) => row.engagement.client_id),
  );
  const engagementsOf = new Map<string, Engagement[]>();
  for (const engagement of work.engagements)
    engagementsOf.set(engagement.client_id, [
      ...(engagementsOf.get(engagement.client_id) ?? []),
      engagement,
    ]);
  const archivedCount = work.clients.filter(
    (client) => client.archived_at,
  ).length;
  const quiet = work.clients
    .filter((client) => showArchived || !client.archived_at)
    .filter(
      (client) =>
        client.status !== "active" ||
        !activeClientIds.has(client.id) ||
        client.archived_at,
    )
    .sort(
      (a, b) =>
        Number(Boolean(a.archived_at)) - Number(Boolean(b.archived_at)) ||
        CLIENT_STATUSES.findIndex((option) => option.value === a.status) -
          CLIENT_STATUSES.findIndex((option) => option.value === b.status) ||
        a.name.localeCompare(b.name),
    );

  // Active engagements still without a month: next month's, and the one in view.
  const activeEngagements = work.engagements.filter(
    (engagement) =>
      engagement.status === "active" &&
      !work.clients.find((client) => client.id === engagement.client_id)
        ?.archived_at,
  );
  const nextHas = new Set(
    nextCycles?.ok ? nextCycles.rows.map((cycle) => cycle.engagement_id) : [],
  );
  const missingNext = nextCycles?.ok
    ? activeEngagements.filter((engagement) => !nextHas.has(engagement.id))
        .length
    : 0;
  const missingHere =
    month >= current ? active.filter((row) => !row.cycle).length : 0;
  const showStartNext =
    manager &&
    nextCycles?.ok &&
    (Number(today.slice(8)) >= 25 || missingNext > 0);

  const red = active.filter((row) => row.health.level === "red").length;
  const amber = active.filter((row) => row.health.level === "amber").length;
  const inReview = active.reduce((sum, row) => sum + row.inClientReview, 0);
  const waiting = active.reduce((sum, row) => sum + row.waitingOnClient, 0);
  const blocked = active.reduce((sum, row) => sum + row.blocked, 0);
  const blockedOn = active.filter((row) => row.blocked > 0).length;

  const addClient = manager ? (
    <ClientDialog
      trigger={
        <button type="button" className={buttonClass("accent")}>
          <Plus size={14} /> Add client
        </button>
      }
    />
  ) : null;

  const header = (
    <PageHeader
      title="Clients"
      description={`Every active engagement in ${monthLabel(month)}: how far along it is, what's with the client, what's stuck.`}
      actionsClassName="max-sm:w-full"
      actions={
        // Phones: the month on a row of its own, the buttons sharing the
        // next one. Wider: all on one line.
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <CycleMonthNav
            month={month}
            href={(target) => href({ month: target })}
            className="w-full sm:w-auto"
          />
          {showStartNext || addClient ? (
            <div className="flex gap-2 *:flex-1 sm:*:flex-none">
              {showStartNext ? (
                <CycleStartAllButton
                  month={next}
                  label={`Start ${monthLabel(next, true)}`}
                  variant={
                    missingNext > 0 && Number(today.slice(8)) >= 25
                      ? "accent"
                      : "secondary"
                  }
                />
              ) : null}
              {addClient}
            </div>
          ) : null}
        </div>
      }
    />
  );

  // A brand-new area: say what to do first.
  if (!work.clients.length) {
    return (
      <>
        {header}
        {denied}
        <ClientsLoadNotice show={work.truncated} />
        <Card>
          <EmptyState
            icon={<Briefcase size={20} />}
            title="No clients yet"
            action={addClient}
          >
            {manager
              ? "Client work runs here: who we work for, what's due each month, and what's stuck."
              : "Clients a client manager adds show up here, with each engagement's month and health."}
          </EmptyState>
          {manager ? (
            <ol className="mx-auto grid max-w-3xl gap-3 px-5 pb-10 sm:grid-cols-3">
              {[
                [
                  "Add a client",
                  "Name, status, primary contact and the shared Slack channel.",
                ],
                [
                  "Add an engagement",
                  "On the client's page: the type of work, the account owner, and links to the contract and their tracker.",
                ],
                [
                  "Start the month",
                  "The engagement's template fills in the scope. Adjust the numbers, add deliverables, then move the month to Active.",
                ],
              ].map(([title, body], index) => (
                <li
                  key={title}
                  className="rounded-xl border border-[var(--i-line)] bg-[var(--i-sunken)] px-4 py-3.5"
                >
                  <p className="text-[12px] tabular-nums text-[var(--i-faint)]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-1 text-[13.5px] font-medium">{title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--i-muted)]">
                    {body}
                  </p>
                </li>
              ))}
            </ol>
          ) : null}
        </Card>
      </>
    );
  }

  const workspaceHref = (row: EngagementRow) => {
    if (!row.client) return null;
    const query = new URLSearchParams({ engagement: row.engagement.id });
    if (month !== current) query.set("month", month);
    return `${clientPath(row.client.slug)}?${query}`;
  };

  // The board: every client (archived ones behind the toggle) by status,
  // each with its active engagements this month.
  const boardClients: BoardClient[] = work.clients
    .filter((client) => showArchived || !client.archived_at)
    .map((client) => ({
      id: client.id,
      slug: client.slug,
      name: client.name,
      website: client.website,
      status: client.status,
      archived: Boolean(client.archived_at),
      contact: client.contact_name,
      href: clientPath(client.slug),
      engagements: active
        .filter((row) => row.engagement.client_id === client.id)
        .map((row) => ({
          id: row.engagement.id,
          name: row.engagement.name,
          href: workspaceHref(row) ?? clientPath(client.slug),
          health: { level: row.health.level, reason: row.health.reason },
          progress: row.cycle
            ? { done: row.progress.done, planned: row.progress.planned }
            : null,
          stage:
            row.cycle && row.cycle.state !== "active"
              ? labelOf(CYCLE_STATES, row.cycle.state)
              : null,
          blocked: row.blocked,
          waiting: row.waitingOnClient,
        })),
      summary: engagementSummary(engagementsOf.get(client.id) ?? []),
    }));

  return (
    <>
      {header}
      {denied}
      <ClientsLoadNotice show={work.truncated} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Active engagements"
          value={active.length}
          note={plural(activeClientIds.size, "client")}
        />
        <Stat
          label="At risk"
          value={red}
          accent={red > 0}
          note={
            amber
              ? `${amber} more ${amber === 1 ? "needs" : "need"} a look`
              : "Nothing else needs a look"
          }
        />
        <Stat
          label="With clients for review"
          value={inReview}
          note={
            waiting
              ? `${waiting} waiting on the client`
              : "None held up by the client"
          }
        />
        <Stat
          label="Blocked"
          value={blocked}
          accent={blocked > 0}
          note={
            blocked
              ? `on ${plural(blockedOn, "engagement")}`
              : "Nothing blocked"
          }
        />
      </div>

      {picked ? <RememberClientsView view={picked} /> : null}

      {missingHere > 0 && manager ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--i-line)] bg-[var(--i-panel)] px-4 py-3">
          <p className="text-[13px] text-[var(--i-muted)]">
            {plural(missingHere, "active engagement")}{" "}
            {missingHere === 1 ? "hasn't" : "haven't"} started{" "}
            {monthLabel(month)} yet.
          </p>
          <CycleStartAllButton
            month={month}
            label={`Start ${monthLabel(month, true)} for them`}
            variant="accent"
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-x-3">
        <LinkTabs
          active={view}
          items={[
            {
              key: "table",
              label: "Table",
              href: href({ view: "table" }),
              icon: <Rows size={14} />,
            },
            {
              key: "board",
              label: "Board",
              href: href({ view: "board" }),
              icon: <Kanban size={14} />,
            },
          ]}
        />
        {view === "board" && (archivedCount || showArchived) ? (
          <Link
            href={href({ archived: !showArchived })}
            className="inline-flex h-8 items-center text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
          >
            {showArchived
              ? "Hide archived"
              : `Show archived (${archivedCount})`}
          </Link>
        ) : null}
      </div>

      {view === "board" ? (
        <ClientBoard clients={boardClients} canMove={manager} />
      ) : (
        <>
          <Card className="mb-6">
            <CardTitle>
              Active engagements{" "}
              <span className="font-normal text-[var(--i-faint)]">
                {active.length}
              </span>
            </CardTitle>
            {active.length ? (
              <>
                <Table
                  className="max-lg:hidden"
                  head={
                    <>
                      <th>Client</th>
                      <th>Type</th>
                      <th>Account owner</th>
                      <th>{monthLabel(month, true)}</th>
                      <th>Client review</th>
                      <th>Blocked</th>
                      <th>Last update</th>
                      <th>Health</th>
                    </>
                  }
                >
                  {active.map((row) => {
                    const link = workspaceHref(row);
                    return (
                      <tr key={row.engagement.id} className={rowClass}>
                        <td className="max-w-[16rem]">
                          {link && row.client ? (
                            <span className="flex items-center gap-2.5">
                              <ClientLogo
                                slug={row.client.slug}
                                name={row.client.name}
                                website={row.client.website}
                                size={28}
                              />
                              <RowLink href={link} sub={row.engagement.name}>
                                {row.client.name}
                              </RowLink>
                            </span>
                          ) : (
                            <Muted>{row.engagement.name}</Muted>
                          )}
                        </td>
                        <td>
                          <OptionBadge
                            list={ENGAGEMENT_TYPES}
                            value={row.engagement.type}
                          />
                        </td>
                        <td className="max-w-[10rem] text-[12.5px]">
                          <OwnerName
                            email={row.engagement.owner}
                            names={work.names}
                          />
                        </td>
                        <td className="w-40 min-w-[9rem]">
                          <MonthCell row={row} />
                        </td>
                        <td className="whitespace-nowrap">
                          <ReviewCell row={row} />
                        </td>
                        <td className="tabular-nums">
                          {row.blocked ? (
                            <span className="font-medium text-rose-700 dark:text-rose-300">
                              {row.blocked}
                            </span>
                          ) : (
                            <Muted>0</Muted>
                          )}
                        </td>
                        <td className="whitespace-nowrap text-[12.5px] text-[var(--i-muted)]">
                          {row.lastUpdate ? relativeDate(row.lastUpdate) : "—"}
                        </td>
                        <td className="min-w-[12rem] max-w-[16rem]">
                          <HealthBadge
                            level={row.health.level}
                            reason={row.health.reason}
                            showReason
                          />
                        </td>
                      </tr>
                    );
                  })}
                </Table>
                <ul className="divide-y divide-[var(--i-line)] lg:hidden">
                  {active.map((row) => {
                    const link = workspaceHref(row);
                    const body = (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            {row.client ? (
                              <ClientLogo
                                slug={row.client.slug}
                                name={row.client.name}
                                website={row.client.website}
                                size={28}
                              />
                            ) : null}
                            <div className="min-w-0">
                              <p className="truncate text-[13.5px] font-medium">
                                {row.client?.name}
                              </p>
                              <p className="truncate text-[12px] text-[var(--i-muted)]">
                                {row.engagement.name} ·{" "}
                                {labelOf(ENGAGEMENT_TYPES, row.engagement.type)}
                              </p>
                            </div>
                          </div>
                          <HealthBadge
                            level={row.health.level}
                            reason={row.health.reason}
                          />
                        </div>
                        <p className="mt-1 text-[12px] leading-snug text-[var(--i-muted)]">
                          {row.health.reason}
                        </p>
                        <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
                          <MonthCell row={row} />
                          <span className="flex flex-col gap-1">
                            <ReviewCell row={row} />
                            {row.blocked ? (
                              <span className="text-rose-700 dark:text-rose-300">
                                {row.blocked} blocked
                              </span>
                            ) : null}
                          </span>
                          <OwnerName
                            email={row.engagement.owner}
                            names={work.names}
                          />
                          <span className="text-right text-[var(--i-muted)]">
                            {row.lastUpdate
                              ? `Updated ${relativeDate(row.lastUpdate)}`
                              : "No updates yet"}
                          </span>
                        </div>
                      </>
                    );
                    return (
                      <li key={row.engagement.id}>
                        {link ? (
                          <Link
                            href={link}
                            className="block px-4 py-3.5 active:bg-[var(--i-hover)]"
                          >
                            {body}
                          </Link>
                        ) : (
                          <div className="px-4 py-3.5">{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <EmptyState
                icon={<Briefcase size={20} />}
                title="No active engagements"
              >
                {manager
                  ? "Open a client below and add an engagement, or set one to Active. Each one gets a month with its scope from the template."
                  : "Engagements a client manager sets to Active show up here."}
              </EmptyState>
            )}
          </Card>

          <Card>
            <CardTitle
              action={
                archivedCount || showArchived ? (
                  <Link
                    href={href({ archived: !showArchived })}
                    className="text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
                  >
                    {showArchived
                      ? "Hide archived"
                      : `Show archived (${archivedCount})`}
                  </Link>
                ) : null
              }
            >
              Pipeline and quiet{" "}
              <span className="font-normal text-[var(--i-faint)]">
                {quiet.length}
              </span>
            </CardTitle>
            {quiet.length ? (
              <>
                <Table
                  className="max-lg:hidden"
                  head={
                    <>
                      <th>Client</th>
                      <th>Status</th>
                      <th>Engagements</th>
                      <th>Primary contact</th>
                      <th>Notes</th>
                    </>
                  }
                >
                  {quiet.map((client) => (
                    <tr key={client.id} className={rowClass}>
                      <td className="max-w-[16rem]">
                        <span className="flex items-center gap-2.5">
                          <ClientLogo
                            slug={client.slug}
                            name={client.name}
                            website={client.website}
                          />
                          <RowLink href={clientPath(client.slug)}>
                            {client.name}
                          </RowLink>
                        </span>
                      </td>
                      <td>
                        <span className="flex flex-wrap items-center gap-1">
                          <OptionBadge
                            list={CLIENT_STATUSES}
                            value={client.status}
                          />
                          {client.archived_at ? <Pill>Archived</Pill> : null}
                        </span>
                      </td>
                      <td className="max-w-[14rem] text-[12.5px] text-[var(--i-muted)]">
                        <span className="line-clamp-2">
                          {engagementSummary(
                            engagementsOf.get(client.id) ?? [],
                          )}
                        </span>
                      </td>
                      <td className="max-w-[10rem] truncate text-[12.5px]">
                        {client.contact_name || <Muted>—</Muted>}
                      </td>
                      <td className="max-w-[20rem] text-[12.5px] text-[var(--i-muted)]">
                        <span className="line-clamp-2">
                          {client.notes || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </Table>
                <ul className="divide-y divide-[var(--i-line)] lg:hidden">
                  {quiet.map((client) => (
                    <li key={client.id}>
                      <Link
                        href={clientPath(client.slug)}
                        className="block px-4 py-3 active:bg-[var(--i-hover)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="flex min-w-0 items-center gap-2 text-[13.5px] font-medium">
                            <ClientLogo
                              slug={client.slug}
                              name={client.name}
                              website={client.website}
                              size={20}
                            />
                            <span className="truncate">{client.name}</span>
                          </p>
                          <span className="flex shrink-0 flex-wrap justify-end gap-1">
                            <OptionBadge
                              list={CLIENT_STATUSES}
                              value={client.status}
                            />
                            {client.archived_at ? <Pill>Archived</Pill> : null}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-[var(--i-muted)]">
                          {engagementSummary(
                            engagementsOf.get(client.id) ?? [],
                          )}
                        </p>
                        {client.notes ? (
                          <p className="mt-1 line-clamp-2 text-[12.5px] text-[var(--i-ink-2)]">
                            {client.notes}
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
                Prospects, paused and ended clients show up here, and any client
                without an active engagement.
              </p>
            )}
          </Card>
        </>
      )}
    </>
  );
}

/** "2 engagements: Token Factory content (Paused) …" or "No engagements yet". */
function engagementSummary(engagements: readonly Engagement[]) {
  if (!engagements.length) return "No engagements yet";
  return engagements
    .map(
      (engagement) =>
        `${engagement.name} (${labelOf(ENGAGEMENT_STATUSES, engagement.status)})`,
    )
    .join(", ");
}

/** This month's progress, or that the month hasn't started. */
function MonthCell({ row }: { row: EngagementRow }) {
  if (!row.cycle)
    return (
      <span className="text-[12.5px] text-[var(--i-faint)]">
        Month not started
      </span>
    );
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <ProgressMeter
        done={row.progress.done}
        planned={row.progress.planned}
        compact
      />
      {row.cycle.state !== "active" ? (
        <span className="text-[11.5px] text-[var(--i-muted)]">
          {labelOf(CYCLE_STATES, row.cycle.state)}
        </span>
      ) : null}
    </span>
  );
}

/** Items with the client, and how many are past their reply date. */
function ReviewCell({ row }: { row: EngagementRow }) {
  if (!row.inClientReview && !row.waitingOnClient) return <Muted>None</Muted>;
  return (
    <span className="flex flex-col gap-0.5 text-[12.5px]">
      {row.inClientReview ? (
        <span className="tabular-nums">
          {plural(row.inClientReview, "item")}
        </span>
      ) : null}
      {row.waitingOnClient ? (
        <span className="text-sky-800 dark:text-sky-200">
          {row.waitingOnClient} waiting on client
        </span>
      ) : null}
    </span>
  );
}
