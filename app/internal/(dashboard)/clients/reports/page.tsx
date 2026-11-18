import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowSquareOut,
  DownloadSimple,
  FileText,
} from "@phosphor-icons/react/dist/ssr";
import { scopeWork } from "@/lib/internal/clients/scope";
import { requireClients } from "@/lib/internal/session";
import {
  loadClientWork,
  loadTypeOptions,
  loadMilestones,
  type ClientWork,
} from "@/lib/internal/clients/data";
import { isUuid } from "@/lib/internal/clients/clean";
import {
  buildClientReport,
  reportText,
} from "@/lib/internal/clients/report-text";
import { cycleProgress, slippedItems } from "@/lib/internal/clients/rules";
import {
  CYCLE_STATES,
  clientPath,
  isMonthKey,
  isOwnedBy,
  monthLabel,
  personName,
  plural,
  thisMonth,
} from "@/lib/internal/clients/schema";
import {
  Card,
  EmptyState,
  Notice,
  PageHeader,
  buttonClass,
} from "@/components/internal/ui";
import { PrintButton } from "@/components/internal/community/print-button";
import {
  ClientsLoadNotice,
  ClientsMigrationNotice,
  OptionBadge,
  ProgressMeter,
} from "@/components/internal/clients/ui";
import { ReportCopyButton } from "@/components/internal/clients/report-copy-button";
import {
  ReportMonthSwitcher,
  ReportView,
} from "@/components/internal/clients/report-view";

export const metadata: Metadata = { title: "Monthly report" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const BASE = "/clients/reports";

function reportsHref(month: string, engagement?: string | null) {
  const query = new URLSearchParams({ month });
  if (engagement) query.set("engagement", engagement);
  return `${BASE}?${query}`;
}

/**
 * The monthly report. Without `?engagement=` it lists every engagement that
 * has that month; with one it's the client-ready report: planned against
 * delivered, live links, the status of everything else and what slipped.
 * Everyone in client work can read it and print it; the CSV and "Copy for
 * the client" are for client managers and the engagement's account owner
 * (they're the ones who send it), checked again by the CSV route.
 */
export default async function ClientsReportsPage({ searchParams }: Props) {
  const [staff, query] = await Promise.all([requireClients(), searchParams]);
  const month =
    typeof query.month === "string" && isMonthKey(query.month)
      ? query.month
      : thisMonth();
  const engagementId =
    typeof query.engagement === "string" && isUuid(query.engagement)
      ? query.engagement.toLowerCase()
      : null;

  // Client team members an admin gave specific clients see only theirs.
  const work = scopeWork(staff.clientScope, await loadClientWork(month));
  if (!work.ok) {
    return (
      <>
        <PageHeader eyebrow="Clients" title="Monthly report" />
        {work.missing ? (
          <ClientsMigrationNotice />
        ) : (
          <Notice tone="error">{work.message}</Notice>
        )}
      </>
    );
  }

  if (!engagementId)
    return (
      <ReportList work={work} month={month} types={await loadTypeOptions()} />
    );

  const engagement = work.engagements.find((item) => item.id === engagementId);
  const cycle = engagement
    ? work.cycles.find((item) => item.engagement_id === engagement.id)
    : undefined;
  const client = engagement
    ? (work.clients.find((item) => item.id === engagement.client_id) ?? null)
    : null;

  if (!engagement || !cycle) {
    return (
      <>
        <BackLink month={month} />
        <PageHeader
          eyebrow="Clients"
          title="Monthly report"
          actions={
            <ReportMonthSwitcher
              month={month}
              hrefFor={(next) => reportsHref(next, engagementId)}
            />
          }
        />
        <Notice>
          {engagement
            ? `${client?.name ? `${client.name} · ` : ""}${engagement.name} has no ${monthLabel(month)} yet, so there's nothing to report. Pick another month.`
            : "That engagement isn't there any more."}
        </Notice>
      </>
    );
  }

  const items = work.deliverables.filter((item) => item.cycle_id === cycle.id);
  const milestones = await loadMilestones([engagement.id]);
  const report = buildClientReport({
    client,
    engagement,
    cycle,
    lines: work.lines.filter((item) => item.cycle_id === cycle.id),
    deliverables: items,
    names: work.names,
    milestones: milestones.ok ? milestones.rows : [],
  });
  const canExport =
    staff.clients === "manager" || isOwnedBy(engagement.owner, staff.email);
  const exportQuery = new URLSearchParams({ engagement: engagement.id, month });

  return (
    <article className="mx-auto max-w-[960px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <BackLink month={month} inline />
        <div className="flex flex-wrap items-center gap-2">
          {client ? (
            <Link
              href={`${clientPath(client.slug)}?${exportQuery}`}
              className={buttonClass("ghost", "sm")}
            >
              <ArrowSquareOut size={13} /> Workspace
            </Link>
          ) : null}
          {canExport ? (
            <>
              <a
                href={`${BASE}/export?${exportQuery}`}
                className={buttonClass("secondary", "sm")}
              >
                <DownloadSimple size={13} /> Download CSV
              </a>
              <ReportCopyButton text={reportText(report)} />
            </>
          ) : null}
          <PrintButton label="Print / Save as PDF" />
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <ReportMonthSwitcher
          month={month}
          hrefFor={(next) => reportsHref(next, engagement.id)}
        />
        {!canExport ? (
          <p className="text-[12.5px] text-[var(--i-muted)]">
            The CSV and the copy for the client are for client managers and{" "}
            {engagement.owner
              ? personName(engagement.owner, work.names)
              : "the account owner"}
            .
          </p>
        ) : null}
      </div>
      <div className="print:hidden">
        <ClientsLoadNotice show={work.truncated} />
      </div>
      <ReportView report={report} />
    </article>
  );
}

function BackLink({
  month,
  inline = false,
}: {
  month: string;
  inline?: boolean;
}) {
  const link = (
    <Link
      href={reportsHref(month)}
      className="inline-flex items-center gap-1 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
    >
      <ArrowLeft size={13} /> All reports
    </Link>
  );
  return inline ? link : <div className="mb-4 print:hidden">{link}</div>;
}

/** Every engagement with a cycle in the month: done of planned, live, slipped. */
function ReportList({
  work,
  month,
  types,
}: {
  types: Awaited<ReturnType<typeof loadTypeOptions>>;
  work: Extract<ClientWork, { ok: true }>;
  month: string;
}) {
  const engagements = new Map(work.engagements.map((item) => [item.id, item]));
  const clients = new Map(work.clients.map((item) => [item.id, item]));
  const rows = work.cycles
    .map((cycle) => {
      const engagement = engagements.get(cycle.engagement_id);
      if (!engagement) return null;
      const items = work.deliverables.filter(
        (item) => item.cycle_id === cycle.id,
      );
      return {
        cycle,
        engagement,
        client: clients.get(engagement.client_id) ?? null,
        progress: cycleProgress(
          work.lines.filter((item) => item.cycle_id === cycle.id),
          items,
        ),
        published: items.filter((item) => item.status === "published").length,
        slipped: slippedItems(cycle, items).length,
        href: reportsHref(month, engagement.id),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort(
      (a, b) =>
        (a.client?.name ?? "").localeCompare(b.client?.name ?? "") ||
        a.engagement.name.localeCompare(b.engagement.name),
    );

  return (
    <>
      <PageHeader
        eyebrow="Clients"
        title="Monthly report"
        description="Planned against delivered, live links and what slipped, per engagement. Open one to print it, download it or copy it for the client."
        actions={
          <ReportMonthSwitcher
            month={month}
            hrefFor={(next) => reportsHref(next)}
          />
        }
      />
      <ClientsLoadNotice show={work.truncated} />
      <Card>
        {rows.length ? (
          <>
            {/* Phones and tablets: a card per engagement. */}
            <ul className="divide-y divide-[var(--i-line)] lg:hidden">
              {rows.map((row) => (
                <li key={row.cycle.id}>
                  <Link
                    href={row.href}
                    className="block px-4 py-3.5 hover:bg-[var(--i-hover)]"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-medium">
                          {row.client?.name ?? "Unknown client"}
                        </span>
                        <span className="block truncate text-[12.5px] text-[var(--i-muted)]">
                          {row.engagement.name}
                        </span>
                      </span>
                      <OptionBadge
                        list={CYCLE_STATES}
                        value={row.cycle.state}
                      />
                    </span>
                    <ProgressMeter
                      className="mt-2.5"
                      done={row.progress.done}
                      planned={row.progress.planned}
                      approved={row.progress.approved}
                    />
                    <span className="mt-1.5 block text-[12px] text-[var(--i-muted)]">
                      {plural(row.published, "live link")} ·{" "}
                      {row.slipped
                        ? plural(row.slipped, "slipped item")
                        : "nothing slipped"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden lg:block">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--i-line)] text-[12px] text-[var(--i-muted)] [&>th]:whitespace-nowrap [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-normal first:[&>th]:pl-5 last:[&>th]:pr-5">
                    <th scope="col">Client and engagement</th>
                    <th scope="col">Type</th>
                    <th scope="col">Month</th>
                    <th scope="col" className="w-56">
                      Done of planned
                    </th>
                    <th scope="col">Published</th>
                    <th scope="col">Slipped</th>
                    <th scope="col">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="[&>tr]:border-b [&>tr]:border-[var(--i-line)] last:[&>tr]:border-0 [&>tr>td]:px-4 [&>tr>td]:py-3 first:[&>tr>td]:pl-5 last:[&>tr>td]:pr-5">
                  {rows.map((row) => (
                    <tr
                      key={row.cycle.id}
                      className="align-middle transition-colors hover:bg-[var(--i-hover)]"
                    >
                      <td className="min-w-0">
                        <Link href={row.href} className="group block min-w-0">
                          <span className="block truncate font-medium group-hover:text-[var(--i-accent-text)]">
                            {row.client?.name ?? "Unknown client"}
                          </span>
                          <span className="block truncate text-[12px] text-[var(--i-muted)]">
                            {row.engagement.name}
                          </span>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap">
                        <OptionBadge list={types} value={row.engagement.type} />
                      </td>
                      <td>
                        <OptionBadge
                          list={CYCLE_STATES}
                          value={row.cycle.state}
                        />
                      </td>
                      <td>
                        <ProgressMeter
                          done={row.progress.done}
                          planned={row.progress.planned}
                          approved={row.progress.approved}
                          compact
                        />
                      </td>
                      <td className="tabular-nums">{row.published}</td>
                      <td className="tabular-nums">
                        {row.slipped ? (
                          <span className="font-medium text-amber-700 dark:text-amber-300">
                            {row.slipped}
                          </span>
                        ) : (
                          <span className="text-[var(--i-faint)]">0</span>
                        )}
                      </td>
                      <td className="text-right">
                        <Link
                          href={row.href}
                          className={buttonClass("secondary", "sm")}
                        >
                          Open report
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<FileText size={20} />}
            title={`No engagements have ${monthLabel(month)}`}
          >
            A month shows here once it&apos;s been started for an engagement,
            from its workspace or by the monthly start on the 25th.
          </EmptyState>
        )}
      </Card>
    </>
  );
}
