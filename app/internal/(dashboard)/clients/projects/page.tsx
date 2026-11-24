import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Briefcase, Rows, CalendarBlank } from "@/components/internal/icons";
import { requireClients } from "@/lib/internal/session";
import { loadPortfolio } from "@/lib/internal/clients/portfolio-data";
import { addCounts, doneOfPlanned, monthRange, projectRows } from "@/lib/internal/clients/portfolio";
import {
  CYCLE_STATES,
  isMonthKey,
  labelOf,
  monthLabel,
  percentOf,
  personName,
  plural,
  thisMonth,
  todayKey,
  type CycleState,
} from "@/lib/internal/clients/schema";
import { one } from "@/lib/internal/community/stats";
import { Card, EmptyState, Notice, PageHeader } from "@/components/internal/ui";
import { LinkTabs } from "@/components/internal/community/ui";
import { ClientsLoadNotice, ClientsMigrationNotice } from "@/components/internal/clients/ui";
import { PiecesBar, PiecesLegend, ProjectsTable, ProjectsTimeline } from "@/components/internal/clients/portfolio";
import { FilterDropdown } from "@/components/internal/influencers/filter-dropdown";

export const metadata: Metadata = { title: "Projects" };

const counts = new Intl.NumberFormat("en-US");

function Figure({ label, value, note, tone }: { label: string; value: ReactNode; note?: ReactNode; tone?: "alert" }) {
  return (
    <div className="min-w-[7rem]">
      <p className="text-[12px] text-[var(--i-muted)]">{label}</p>
      <p
        className={
          tone === "alert"
            ? "mt-1 text-[22px] font-medium leading-none tabular-nums tracking-[-0.02em] text-rose-700 dark:text-rose-300"
            : "mt-1 text-[22px] font-medium leading-none tabular-nums tracking-[-0.02em]"
        }
      >
        {value}
      </p>
      {note ? <p className="mt-1.5 text-[12px] text-[var(--i-faint)]">{note}</p> : null}
    </div>
  );
}

/**
 * Every company's projects in one place: a table of each month's work
 * (how far it got, what's held up, its reach and owner), or a timeline of
 * each project line across the months. Filters are dropdowns in the URL.
 */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [staff, params] = await Promise.all([requireClients(), searchParams]);
  const data = await loadPortfolio(staff.clientScope);
  const today = todayKey();
  const current = thisMonth();

  if (!data.ok) {
    return (
      <>
        <PageHeader title="Projects" />
        {data.missing ? <ClientsMigrationNotice message={data.message} /> : <Notice tone="error">{data.message}</Notice>}
      </>
    );
  }

  const all = projectRows({ ...data, today });
  const view = one(params.view) === "timeline" ? "timeline" : "table";
  const askedMonth = one(params.month);
  const month = view === "table" && isMonthKey(askedMonth) ? askedMonth : null;
  const state = view === "table" ? (CYCLE_STATES.find((item) => item.value === one(params.state))?.value ?? null) : null;
  const company = all.find((row) => row.client.slug === one(params.company))?.client.slug ?? null;
  const owner = all.find((row) => row.engagement.owner && row.engagement.owner === one(params.owner))?.engagement.owner ?? null;

  type Picks = { view: string; month: string | null; state: CycleState | null; company: string | null; owner: string | null };
  const picks: Picks = { view, month, state, company, owner };
  const href = (changes: Partial<Picks>) => {
    const next = { ...picks, ...changes };
    const query = new URLSearchParams();
    if (next.view === "timeline") query.set("view", "timeline");
    if (next.month && next.view !== "timeline") query.set("month", next.month);
    if (next.state && next.view !== "timeline") query.set("state", next.state);
    if (next.company) query.set("company", next.company);
    if (next.owner) query.set("owner", next.owner);
    return `/clients/projects${query.size ? `?${query}` : ""}`;
  };

  const rows = all.filter(
    (row) =>
      (!month || row.cycle.month === month) &&
      (!state || row.cycle.state === state) &&
      (!company || row.client.slug === company) &&
      (!owner || row.engagement.owner === owner),
  );
  const filtered = Boolean(month || state || company || owner);

  const header = (
    <PageHeader
      title="Projects"
      description="Every company's work, month by month: how much of the plan went live, what's held up, and the reach."
    />
  );

  if (!all.length) {
    return (
      <>
        {header}
        <ClientsLoadNotice show={data.truncated} />
        <Card>
          <EmptyState icon={<Briefcase size={20} />} title="No projects yet">
            A project is a company&apos;s work for one month, like DevRel · {monthLabel(current)}. Start one from a{" "}
            <Link href="/clients" className="underline underline-offset-[3px]">
              company&apos;s page
            </Link>
            .
          </EmptyState>
        </Card>
      </>
    );
  }

  // The filters' choices come from the projects there are.
  const months = [...new Set(all.map((row) => row.cycle.month))].sort().reverse();
  const companies = [...new Map(all.map((row) => [row.client.slug, row.client])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const owners = [...new Set(all.map((row) => row.engagement.owner).filter((email): email is string => Boolean(email)))].sort((a, b) =>
    personName(a, data.names).localeCompare(personName(b, data.names)),
  );
  const tally = (match: (row: (typeof all)[number]) => boolean) => String(all.filter(match).length);

  const total = addCounts(rows.map((row) => row.counts));
  const { done, planned } = doneOfPlanned(rows);
  const reach = rows.reduce((sum, row) => sum + row.views, 0);
  const held = rows.reduce((sum, row) => sum + row.blocked + row.waiting + row.late, 0);
  const running = rows.filter((row) => row.cycle.state !== "closed").length;
  const timelineMonths = monthRange(
    rows.map((row) => row.cycle.month).sort()[0] ?? null,
    [current, ...rows.map((row) => row.cycle.month)].sort().at(-1)!,
    12,
  );

  return (
    <>
      {header}
      <ClientsLoadNotice show={data.truncated} />

      <Card className="mb-5 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-10">
          <Figure label="Projects" value={rows.length} note={running ? `${running} open` : "all closed"} />
          <Figure label="Live of planned" value={`${done} / ${planned}`} note={planned ? `${percentOf(done, planned)}% of the plan` : "nothing planned"} />
          <Figure label="Reach" value={reach ? counts.format(reach) : "—"} note="views on live pieces" />
          <Figure
            label="Held up"
            value={held}
            tone={held ? "alert" : undefined}
            note={held ? "blocked, waiting on the client or late" : "nothing stuck"}
          />
        </div>
        <PiecesBar counts={total} className="mt-5 h-2.5" />
        <PiecesLegend counts={total} className="mt-2.5" />
      </Card>

      <div className="mb-3 flex flex-wrap items-center gap-2 [&>nav]:mb-0">
        <LinkTabs
          active={view}
          items={[
            { key: "table", label: "Table", href: href({ view: "table" }), icon: <Rows size={14} /> },
            { key: "timeline", label: "Timeline", href: href({ view: "timeline" }), icon: <CalendarBlank size={14} /> },
          ]}
        />
        <span className="mx-1 hidden h-5 w-px bg-[var(--i-line)] sm:block" aria-hidden />
        {view === "table" ? (
          <>
            <FilterDropdown
              label="Month"
              items={[
                { key: "all", label: "All months", href: href({ month: null }), on: !month, note: String(all.length) },
                ...months.map((value) => ({
                  key: value,
                  label: monthLabel(value),
                  href: href({ month: value }),
                  on: month === value,
                  note: tally((row) => row.cycle.month === value),
                })),
              ]}
            />
            <FilterDropdown
              label="State"
              items={[
                { key: "all", label: "Any state", href: href({ state: null }), on: !state },
                ...CYCLE_STATES.map((option) => ({
                  key: option.value,
                  label: option.label,
                  href: href({ state: option.value }),
                  on: state === option.value,
                  note: tally((row) => row.cycle.state === option.value),
                })),
              ]}
            />
          </>
        ) : null}
        <FilterDropdown
          label="Company"
          items={[
            { key: "all", label: "Every company", href: href({ company: null }), on: !company },
            ...companies.map((item) => ({
              key: item.slug,
              label: item.name,
              href: href({ company: item.slug }),
              on: company === item.slug,
              note: tally((row) => row.client.slug === item.slug),
            })),
          ]}
        />
        {owners.length ? (
          <FilterDropdown
            label="Owner"
            items={[
              { key: "all", label: "Anyone", href: href({ owner: null }), on: !owner },
              ...owners.map((email) => ({
                key: email,
                label: personName(email, data.names),
                href: href({ owner: email }),
                on: owner === email,
                note: tally((row) => row.engagement.owner === email),
              })),
            ]}
          />
        ) : null}
        <span className="text-[12.5px] text-[var(--i-muted)]">
          {plural(rows.length, "project")}
          {state ? ` · ${labelOf(CYCLE_STATES, state).toLowerCase()}` : ""}
        </span>
        {filtered ? (
          <Link href={href({ month: null, state: null, company: null, owner: null })} className="text-[12.5px] text-[var(--i-muted)] underline underline-offset-[3px] hover:text-[var(--i-ink)]">
            Clear
          </Link>
        ) : null}
      </div>

      <Card>
        {!rows.length ? (
          <EmptyState icon={<Briefcase size={20} />} title="No projects match">
            <Link href={href({ month: null, state: null, company: null, owner: null })} className="underline underline-offset-[3px]">
              Show every project
            </Link>
          </EmptyState>
        ) : view === "timeline" ? (
          <ProjectsTimeline rows={rows} months={timelineMonths} types={data.types} />
        ) : (
          <ProjectsTable rows={rows} types={data.types} names={data.names} />
        )}
      </Card>
    </>
  );
}
