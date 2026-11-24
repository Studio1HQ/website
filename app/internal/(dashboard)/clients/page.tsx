import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Plus, Rows, SquaresFour } from "@/components/internal/icons";
import { scopeWork } from "@/lib/internal/clients/scope";
import { requireClients } from "@/lib/internal/session";
import { takesNewMonths } from "@/lib/internal/clients/cycles";
import { loadClientWork, loadCycles, loadTypeOptions } from "@/lib/internal/clients/data";
import type { EngagementRow } from "@/lib/internal/clients/rules";
import { companyTerm } from "@/lib/internal/clients/portfolio";
import { projectName, projectPath } from "@/lib/internal/clients/projects";
import {
  CLIENT_STATUSES,
  clientPath,
  daysBetween,
  formatDay,
  labelOf,
  monthLabel,
  plural,
  shiftMonth,
  thisMonth,
  todayKey,
  toneOf,
  type ClientAccount,
  type ClientStatus,
  type Engagement,
} from "@/lib/internal/clients/schema";
import { one } from "@/lib/internal/community/stats";
import { Card, EmptyState, Notice, PageHeader, buttonClass } from "@/components/internal/ui";
import { LinkTabs, TONES } from "@/components/internal/community/ui";
import { ClientsLoadNotice, ClientsMigrationNotice, OwnerName } from "@/components/internal/clients/ui";
import { ClientDialog } from "@/components/internal/clients/client-dialog";
import { ClientLogo } from "@/components/internal/clients/client-logo";
import { ClientsMenu } from "@/components/internal/clients/clients-menu";
import { ClientStatusMenu } from "@/components/internal/clients/client-status-menu";
import { CycleStartAllButton } from "@/components/internal/clients/cycle-controls";
import { ProgressLine, heldUpText } from "@/components/internal/clients/portfolio";
import { FilterDropdown } from "@/components/internal/influencers/filter-dropdown";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Companies" };

const STATUS_ORDER: readonly ClientStatus[] = ["active", "prospect", "paused", "ended"];
/** The board reads left to right like a pipeline: talking, working, paused, done. */
const BOARD_ORDER: readonly ClientStatus[] = ["prospect", "active", "paused", "ended"];
/** An end date this close shows as a heads-up. */
const ENDS_SOON_DAYS = 30;

/**
 * The companies: who we work with and who we're talking to. A table (status
 * you can change in place, the kind of work, since when and until when,
 * this month's projects, the account owner) or a board by status. A company
 * opens its page; a project opens its month.
 */
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requireClients(), searchParams]);
  const manager = staff.clients === "manager";
  const current = thisMonth();
  const next = shiftMonth(current, 1);
  const today = todayKey();
  const showArchived = one(params.archived) === "1";
  const asked = one(params.status);
  const view = one(params.view) === "board" ? "board" : "table";
  // The board shows every status as a column, so it has no status filter.
  const status = view === "table" ? (STATUS_ORDER.find((item) => item === asked) ?? null) : null;

  const [allWork, nextCycles, types] = await Promise.all([
    loadClientWork(current),
    manager ? loadCycles({ month: next }) : Promise.resolve(null),
    loadTypeOptions(),
  ]);
  // Client team members an admin gave specific clients see only those.
  const work = scopeWork(staff.clientScope, allWork);

  const href = (changes: { status?: ClientStatus | null; archived?: boolean; view?: "table" | "board" }) => {
    const query = new URLSearchParams();
    const pickedView = changes.view ?? view;
    const pickedStatus = changes.status === undefined ? status : changes.status;
    if (pickedView === "board") query.set("view", "board");
    if (pickedStatus && pickedView === "table") query.set("status", pickedStatus);
    if (changes.archived ?? showArchived) query.set("archived", "1");
    return `/clients${query.size ? `?${query}` : ""}`;
  };

  const denied =
    params.denied !== undefined ? (
      <div className="mb-5">
        <Notice tone="warning">You can see client work but not change that. Ask an admin for the Client manager role.</Notice>
      </div>
    ) : null;

  const addClient = manager ? (
    <ClientDialog
      trigger={
        <button type="button" className={buttonClass("accent")}>
          <Plus size={14} /> Add client
        </button>
      }
    />
  ) : null;

  if (!work.ok) {
    return (
      <>
        <PageHeader title="Companies" description="The companies we work with and talk to, and their projects." />
        {denied}
        {work.missing ? <ClientsMigrationNotice message={work.message} /> : <Notice tone="error">{work.message}</Notice>}
      </>
    );
  }

  // This month's projects, per company (engagements that are running or paused).
  const projectsOf = new Map<string, EngagementRow[]>();
  for (const row of work.rows) {
    if (row.engagement.status === "ended" || row.engagement.status === "planned") continue;
    projectsOf.set(row.engagement.client_id, [...(projectsOf.get(row.engagement.client_id) ?? []), row]);
  }
  const engagementsOf = new Map<string, Engagement[]>();
  for (const engagement of work.engagements)
    engagementsOf.set(engagement.client_id, [...(engagementsOf.get(engagement.client_id) ?? []), engagement]);

  const archivedCount = work.clients.filter((client) => client.archived_at).length;
  const visible = work.clients.filter((client) => showArchived || !client.archived_at);
  const countOf = (value: ClientStatus) => visible.filter((client) => client.status === value).length;
  const byName = (a: ClientAccount, b: ClientAccount) =>
    Number(Boolean(a.archived_at)) - Number(Boolean(b.archived_at)) || a.name.localeCompare(b.name);
  const companies = visible
    .filter((client) => !status || client.status === status)
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || byName(a, b));

  // Near the month's end: start next month's projects in one go. Only the
  // ones the button would start: not a paused, ended or archived client's.
  const startable = new Set(work.clients.filter(takesNewMonths).map((client) => client.id));
  const running = work.engagements.filter((engagement) => engagement.status === "active" && startable.has(engagement.client_id));
  const nextHas = new Set(nextCycles?.ok ? nextCycles.rows.map((cycle) => cycle.engagement_id) : []);
  const missingNext = nextCycles?.ok ? running.filter((engagement) => !nextHas.has(engagement.id)).length : 0;
  const showStartNext = manager && missingNext > 0 && Number(today.slice(8)) >= 25;

  const header = (
    <PageHeader
      title="Companies"
      description="Who we work with and who we're talking to: their status, the kind of work, how long it runs, and this month's projects."
      actions={
        <>
          {showStartNext ? <CycleStartAllButton month={next} label={`Start ${monthLabel(next, true)}`} /> : null}
          <ClientsMenu
            items={[
              ...(manager ? [{ label: "Templates", href: "/clients/templates" }] : []),
              ...(archivedCount || showArchived
                ? [{ label: showArchived ? "Hide archived" : `Show archived (${archivedCount})`, href: href({ archived: !showArchived }) }]
                : []),
            ]}
          />
          {addClient}
        </>
      }
    />
  );

  if (!work.clients.length) {
    return (
      <>
        {header}
        {denied}
        <ClientsLoadNotice show={work.truncated} />
        <Card>
          <EmptyState icon={<Briefcase size={20} />} title="No clients yet" action={addClient}>
            {manager
              ? "Add a company with its status and point of contact. On its page, add a project (like DevRel); each month of it gets a page for its pieces, links and report."
              : "Companies a client manager adds show up here, with their projects."}
          </EmptyState>
        </Card>
      </>
    );
  }

  const dash = <span className="text-[var(--i-faint)]">—</span>;

  /** Each running project's month on one line: name, a thin bar, done of planned, a dot if held up. */
  const thisMonthCell = (client: ClientAccount) => {
    const rows = projectsOf.get(client.id) ?? [];
    if (!rows.length) return dash;
    const several = (engagementsOf.get(client.id)?.length ?? 0) > 1;
    return (
      <span className="flex flex-col gap-1">
        {rows.map((row) => (
          <ProgressLine
            key={row.engagement.id}
            href={projectPath(client.slug, current, { engagement: several ? row.engagement.id : null })}
            label={`${projectName(row.engagement, client.name, types)}${row.engagement.status === "paused" ? " · paused" : ""}`}
            done={row.progress.done}
            planned={row.progress.planned}
            held={heldUpText(row.blocked, row.waitingOnClient, row.late)}
            note={row.cycle ? undefined : `${monthLabel(current, true)} not started`}
          />
        ))}
      </span>
    );
  };

  /** The kind of work: each project not yet ended, by its type ("DevRel retainer"). */
  const workText = (client: ClientAccount) => {
    const own = (engagementsOf.get(client.id) ?? []).filter((item) => item.status !== "ended");
    return [...new Set(own.map((item) => labelOf(types, item.type)))].join(" · ");
  };

  /** "1 Nov – ongoing", "18 Nov – 25 Nov · today" (an end inside a month is flagged), "Ended 15 Oct". */
  const termOf = (client: ClientAccount) => {
    const term = companyTerm(client, engagementsOf.get(client.id) ?? []);
    const left = term.ends && !term.ended ? daysBetween(today, term.ends) : null;
    const soon = left !== null && left >= 0 && left <= ENDS_SOON_DAYS;
    const since = term.since ? formatDay(term.since, today) : null;
    const text = term.ended
      ? term.ends
        ? `Ended ${formatDay(term.ends, today)}`
        : "Ended"
      : term.ongoing
        ? since
          ? `${since} – ongoing`
          : "Ongoing"
        : term.ends
          ? since
            ? `${since} – ${formatDay(term.ends, today)}`
            : `Ends ${formatDay(term.ends, today)}`
          : since
            ? `Since ${since}`
            : "";
    return { text, soon, when: soon ? (left === 0 ? "today" : `in ${plural(left!, "day")}`) : "" };
  };
  const termCell = (client: ClientAccount) => {
    const term = termOf(client);
    if (!term.text) return dash;
    return (
      <span
        className={cn("block truncate text-[12.5px]", term.soon ? "font-medium text-amber-700 dark:text-amber-300" : "text-[var(--i-ink-2)]")}
        title={term.soon ? `Ends ${term.when}` : undefined}
      >
        {term.text}
        {term.soon ? <span className="font-normal"> · {term.when}</span> : null}
      </span>
    );
  };
  const ownerOf = (client: ClientAccount) => {
    const owner =
      (projectsOf.get(client.id) ?? []).find((row) => row.engagement.owner)?.engagement.owner ??
      (engagementsOf.get(client.id) ?? []).find((item) => item.owner && item.status !== "ended")?.owner;
    return owner ? <OwnerName email={owner} names={work.names} /> : dash;
  };
  /** Logo and name; the point of contact (or "Archived") under it. */
  const nameOf = (client: ClientAccount) => (
    <Link href={clientPath(client.slug)} className="group flex min-w-0 items-center gap-2.5">
      <ClientLogo slug={client.slug} name={client.name} website={client.website} size={24} />
      <span className="min-w-0">
        <span className="block truncate font-medium leading-tight group-hover:text-[var(--i-accent-text)]">{client.name}</span>
        <span className="block truncate text-[12px] leading-tight text-[var(--i-muted)]">
          {client.archived_at ? "Archived" : client.contact_name || client.contact_email || "No point of contact"}
        </span>
      </span>
    </Link>
  );
  const statusOf = (client: ClientAccount) => (
    <ClientStatusMenu clientId={client.id} name={client.name} status={client.status} canEdit={manager && !client.archived_at} />
  );
  /** The kind of work and dates, as one quiet line. */
  const metaLine = (client: ClientAccount) => {
    const term = termOf(client);
    const work = workText(client);
    if (!work && !term.text) return null;
    return (
      <p className="truncate text-[12px] text-[var(--i-muted)]">
        {work}
        {work && term.text ? " · " : ""}
        {term.soon ? (
          <span className="font-medium text-amber-700 dark:text-amber-300">
            {term.text} · {term.when}
          </span>
        ) : (
          term.text
        )}
      </p>
    );
  };

  const table = (
    <Card>
      {companies.length ? (
        <>
          {/* Phones and tablets: a compact row per company. */}
          <ul className="divide-y divide-[var(--i-line)] lg:hidden">
            {companies.map((client) => (
              <li key={client.id} className="space-y-1.5 px-4 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  {nameOf(client)}
                  {statusOf(client)}
                </div>
                {metaLine(client)}
                {projectsOf.get(client.id)?.length ? thisMonthCell(client) : null}
              </li>
            ))}
          </ul>
          <div className="hidden lg:block">
            <table className="w-full table-fixed border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--i-line)] text-[12px] text-[var(--i-muted)] [&>th]:px-3 [&>th]:py-2 [&>th]:font-normal first:[&>th]:pl-5 last:[&>th]:pr-5">
                  <th scope="col" className="w-[22%]">Company</th>
                  <th scope="col" className="w-[11%]">Status</th>
                  <th scope="col" className="w-[15%]">Work</th>
                  <th scope="col" className="w-[15%]">Dates</th>
                  <th scope="col" className="w-[23%]">{monthLabel(current)}</th>
                  <th scope="col" className="w-[14%]">Account owner</th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-b [&>tr]:border-[var(--i-line)] last:[&>tr]:border-0 [&>tr>td]:px-3 [&>tr>td]:py-2 first:[&>tr>td]:pl-5 last:[&>tr>td]:pr-5">
                {companies.map((client) => (
                  <tr key={client.id} className="transition-colors hover:bg-[var(--i-hover)]">
                    <td>{nameOf(client)}</td>
                    <td>{statusOf(client)}</td>
                    <td>
                      <span className="block truncate text-[12.5px] text-[var(--i-ink-2)]">{workText(client) || dash}</span>
                    </td>
                    <td>{termCell(client)}</td>
                    <td>{thisMonthCell(client)}</td>
                    <td>
                      <span className="flex">{ownerOf(client)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <EmptyState icon={<Briefcase size={20} />} title={`No ${status ? labelOf(CLIENT_STATUSES, status).toLowerCase() : ""} companies`}>
          <Link href={href({ status: null })} className="underline underline-offset-[3px]">
            Show every company
          </Link>
        </EmptyState>
      )}
    </Card>
  );

  const board = (
    <div className="internal-scroll -mx-1 overflow-x-auto px-1 pb-2">
      <div className="grid min-w-[880px] grid-cols-4 gap-3">
        {BOARD_ORDER.map((column) => {
          const items = visible.filter((client) => client.status === column).sort(byName);
          return (
            <section key={column} aria-label={labelOf(CLIENT_STATUSES, column)} className="min-w-0 rounded-xl bg-black/[0.03] p-1.5 dark:bg-white/[0.03]">
              <h2 className="flex items-center gap-2 px-2 pb-1.5 pt-1 text-[12.5px] font-medium">
                <span aria-hidden className={cn("size-2 rounded-full", TONES[toneOf(CLIENT_STATUSES, column)].dot)} />
                {labelOf(CLIENT_STATUSES, column)}
                <span className="font-normal tabular-nums text-[var(--i-faint)]">{items.length}</span>
              </h2>
              <ul className="space-y-1.5">
                {items.map((client) => (
                  <li key={client.id} className="space-y-1.5 rounded-lg border border-[var(--i-line)] bg-[var(--i-panel)] px-2.5 py-2 shadow-[var(--i-shadow-sm)]">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={clientPath(client.slug)} className="group flex min-w-0 items-center gap-2">
                        <ClientLogo slug={client.slug} name={client.name} website={client.website} size={20} />
                        <span className="truncate text-[13px] font-medium group-hover:text-[var(--i-accent-text)]">{client.name}</span>
                      </Link>
                      {statusOf(client)}
                    </div>
                    {metaLine(client)}
                    {projectsOf.get(client.id)?.length ? thisMonthCell(client) : null}
                  </li>
                ))}
                {!items.length ? <li className="px-2 py-2 text-[12.5px] text-[var(--i-faint)]">None</li> : null}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {header}
      {denied}
      <ClientsLoadNotice show={work.truncated} />

      <div className="mb-3 flex flex-wrap items-center gap-2 [&>nav]:mb-0">
        <LinkTabs
          active={view}
          items={[
            { key: "table", label: "Table", href: href({ view: "table" }), icon: <Rows size={14} /> },
            { key: "board", label: "Board", href: href({ view: "board" }), icon: <SquaresFour size={14} /> },
          ]}
        />
        {view === "table" ? (
          <>
            <span className="mx-1 hidden h-5 w-px bg-[var(--i-line)] sm:block" aria-hidden />
            <FilterDropdown
              label="Status"
              items={[
                { key: "all", label: "All", href: href({ status: null }), on: !status, note: String(visible.length) },
                ...STATUS_ORDER.map((value) => ({
                  key: value,
                  label: labelOf(CLIENT_STATUSES, value),
                  href: href({ status: value }),
                  on: status === value,
                  note: String(countOf(value)),
                })),
              ]}
            />
          </>
        ) : null}
        <span className="text-[12.5px] text-[var(--i-muted)]">
          {plural(view === "table" ? companies.length : visible.length, "company", "companies")}
        </span>
      </div>

      {view === "board" ? board : table}
    </>
  );
}
