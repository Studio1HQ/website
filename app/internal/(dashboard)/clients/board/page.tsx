import type { Metadata } from "next";
import Link from "next/link";
import { Buildings, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { scopeRows } from "@/lib/internal/clients/scope";
import { requireClients } from "@/lib/internal/session";
import {
  incomplete,
  loadClients,
  loadEngagements,
} from "@/lib/internal/clients/data";
import {
  WEEK_GROUPS,
  engagementsForWeek,
  recentDone,
  shortDay,
  weekCounts,
  type WeekLine,
} from "@/lib/internal/clients/week";
import { loadClientWeek } from "@/lib/internal/clients/week-data";
import {
  clientPath,
  personName,
  shiftWeek,
  todayKey,
  weekStart,
} from "@/lib/internal/clients/schema";
import { cn } from "@/lib/utils";
import {
  Card,
  EmptyState,
  Notice,
  PageHeader,
} from "@/components/internal/ui";
import {
  ClientsLoadNotice,
  ClientsMigrationNotice,
} from "@/components/internal/clients/ui";
import {
  WeekSwitcher,
  weekFromParam,
  weekPhrase,
} from "@/components/internal/clients/week-switcher";

export const metadata: Metadata = { title: "This week" };

const COUNT_TONE: Record<string, string> = {
  done: "text-emerald-700 dark:text-emerald-300",
  doing: "text-sky-700 dark:text-sky-300",
  next: "text-[var(--i-ink)]",
  blocked: "text-rose-700 dark:text-rose-300",
};

const COUNT_LABEL: Record<string, string> = {
  done: "Done",
  doing: "In progress",
  next: "Up next",
  blocked: "Blocked",
};

function href(week: string, current: string) {
  return `/internal/clients/board${week === current ? "" : `?week=${week}`}`;
}

/**
 * "This week": one card per active client with the week's counts (done, in
 * progress, up next, blocked or waiting) and the latest things done. Each
 * card opens that client's workspace for the same week, where the work and
 * the weekly update live. Nothing is moved from here.
 */
export default async function ClientsThisWeekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireClients();
  const query = await searchParams;
  const today = todayKey();
  const current = weekStart(today);
  const week = weekFromParam(query.week, today);

  const switcher = (
    <WeekSwitcher
      week={week}
      current={current}
      hrefFor={{
        previous: href(shiftWeek(week, -1), current),
        next: href(shiftWeek(week, 1), current),
        current: href(current, current),
      }}
    />
  );

  const [clients, engagements] = await Promise.all([
    loadClients(),
    loadEngagements(),
  ]);
  const failed = [clients, engagements].find((result) => !result.ok);
  if (failed && !failed.ok) {
    return (
      <>
        <PageHeader eyebrow="Clients" title="This week" />
        {failed.missing ? (
          <ClientsMigrationNotice message={failed.message} />
        ) : (
          <Notice tone="error">{failed.message}</Notice>
        )}
      </>
    );
  }
  if (!clients.ok || !engagements.ok) return null;

  // Client team members an admin gave specific clients see only those.
  const active = scopeRows(staff.clientScope, clients.rows).filter(
    (client) => client.status === "active" && !client.archived_at,
  );
  const activeIds = new Set(active.map((client) => client.id));
  const covered = engagementsForWeek(
    engagements.rows.filter((engagement) => activeIds.has(engagement.client_id)),
    week,
    today,
  );
  const clientOf = new Map(
    covered.map((engagement) => [engagement.id, engagement.client_id]),
  );

  const data = await loadClientWeek({
    engagementIds: covered.map((engagement) => engagement.id),
    week,
    staff,
  });

  const linesOf = new Map<string, WeekLine[]>();
  if (data.ok)
    for (const line of data.lines) {
      const clientId = line.engagementId
        ? clientOf.get(line.engagementId)
        : undefined;
      if (!clientId) continue;
      const list = linesOf.get(clientId) ?? [];
      list.push(line);
      linesOf.set(clientId, list);
    }

  return (
    <>
      <PageHeader
        eyebrow="Clients"
        title="This week"
        description={`What's being done for each client ${weekPhrase(week, current)}, from the team's tasks and the clients' deliverables. Open a client for the full list and its weekly update.`}
        actions={switcher}
      />
      <ClientsLoadNotice show={incomplete(clients, engagements)} />
      {!data.ok ? (
        data.missing ? (
          <ClientsMigrationNotice message={data.message} />
        ) : (
          <Notice tone="error">{data.message}</Notice>
        )
      ) : (
        <>
          {data.tasks !== "ready" ? (
            <p className="mb-4 text-[12.5px] leading-snug text-[var(--i-muted)]">
              {data.tasks === "missing"
                ? "Counting deliverables only. The team's tasks count here once the Team tasks area is switched on."
                : "Couldn't load the team's tasks just now, so these count deliverables only."}
            </p>
          ) : null}
          {active.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {active.map((client) => {
                const lines = linesOf.get(client.id) ?? [];
                const counts = weekCounts(lines);
                const done = recentDone(lines, 3);
                const target = `${clientPath(client.slug)}?tab=week${week === current ? "" : `&week=${week}`}`;
                return (
                  <Link
                    key={client.id}
                    href={target}
                    className="group block min-w-0"
                  >
                    <Card className="flex h-full flex-col px-4 py-3.5 transition-colors group-hover:border-[var(--i-line-strong)] sm:px-5 sm:py-4">
                      <p className="truncate text-[14px] font-medium group-hover:text-[var(--i-accent-text)]">
                        {client.name}
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 min-[400px]:grid-cols-4">
                        {WEEK_GROUPS.map((group) => (
                          <div key={group.value} className="min-w-0">
                            <dt
                              className="truncate text-[11.5px] text-[var(--i-muted)]"
                              title={group.label}
                            >
                              {COUNT_LABEL[group.value]}
                            </dt>
                            <dd
                              className={cn(
                                "mt-0.5 text-[20px] font-medium leading-none tabular-nums",
                                counts[group.value]
                                  ? COUNT_TONE[group.value]
                                  : "text-[var(--i-faint)]",
                              )}
                            >
                              {counts[group.value]}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <div className="mt-3 border-t border-[var(--i-line)] pt-3">
                        {done.length ? (
                          <ul className="space-y-1.5">
                            {done.map((line) => (
                              <li
                                key={line.key}
                                className="flex min-w-0 items-start gap-1.5 text-[12.5px] leading-snug"
                              >
                                <CheckCircle
                                  size={13}
                                  weight="fill"
                                  className="mt-px shrink-0 text-emerald-600 dark:text-emerald-400"
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {line.title}
                                </span>
                                <span className="shrink-0 text-[var(--i-faint)]">
                                  {[
                                    personName(line.who, data.names).split(" ")[0],
                                    shortDay(line.day).split(" ")[0],
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[12.5px] text-[var(--i-faint)]">
                            Nothing done yet {weekPhrase(week, current)}.
                          </p>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card>
              <EmptyState icon={<Buildings size={20} />} title="No active clients">
                Clients with the status Active show here, one card each.
              </EmptyState>
            </Card>
          )}
        </>
      )}
    </>
  );
}
