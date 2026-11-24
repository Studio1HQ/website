import Link from "next/link";
import { CheckCircle, Circle, MagnifyingGlass, UserCircle } from "@/components/internal/icons";
import { Card, EmptyState, Notice } from "@/components/internal/ui";
import { ForChip } from "@/components/internal/tasks/kit";
import { TonePill } from "@/components/internal/tasks/status-pill";
import { SearchScope } from "@/components/internal/tasks/task-search";
import { canSeeOthers } from "@/lib/internal/tasks/access";
import { earliestCardDay } from "@/lib/internal/tasks/calendar";
import { engagementLabels, listTasks, ownedDeliverables } from "@/lib/internal/tasks/data";
import { istDay } from "@/lib/internal/tasks/report";
import { findWork, markTerms, type SearchHit } from "@/lib/internal/tasks/search";
import { tasksHref } from "@/lib/internal/tasks/shared";
import { displayName } from "@/lib/internal/team/shared";
import { cn } from "@/lib/utils";
import type { ViewProps } from "./types";

const dayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Search results, in place of the view: the person's tasks (open ones and
 * every one done) and the client pieces on their week, matched by title,
 * note or what they're for. Founders and whoever sees the team can widen it
 * to everyone they may see. A result opens its week with the card ringed.
 */
export async function SearchView({ staff, viewer, person, own, people, params, today, query }: ViewProps & { query: string }) {
  const everyone = params.who === "all" && canSeeOthers(viewer) && people.length > 1;
  const emails = everyone ? people.map((item) => item.email.toLowerCase()) : [person.email.toLowerCase()];
  const visible = new Set(emails);
  const me = staff.email.toLowerCase();
  const names: Record<string, string> = Object.fromEntries(people.map((item) => [item.email.toLowerCase(), displayName(item)]));

  // Client pieces back to the 1st of last month, the furthest the week calendar goes.
  const since = earliestCardDay(today);
  const [tasks, pieces, engagements] = await Promise.all([
    listTasks({ emails }),
    Promise.all(emails.map((email) => ownedDeliverables(email, since))),
    engagementLabels(),
  ]);
  const result = findWork({
    query,
    tasks: tasks.ok ? tasks.rows : [],
    deliverables: pieces.flatMap((loaded) => (loaded.ok ? loaded.rows : [])),
    engagements,
    dayOf: istDay,
    today,
  });
  const shown = result.open.length + result.done.length;

  /** Whose week a result opens: in one person's search theirs; else its owner's, or the first one it's shared with that the viewer may see. */
  const whoseWeek = (hit: SearchHit) =>
    everyone ? ([hit.email, ...hit.with].find((email) => visible.has(email)) ?? me) : person.email.toLowerCase();
  const hrefOf = (hit: SearchHit) => {
    const whose = whoseWeek(hit);
    return tasksHref({ week: hit.day, person: whose === me ? null : whose, focus: `${hit.kind}:${hit.id}` });
  };

  const scopeHref = (who: string | null) =>
    tasksHref({ person: own ? null : person.email, view: params.view && params.view !== "week" ? params.view : null, who, q: query });
  const scope = canSeeOthers(viewer) && people.length > 1 ? (
    <SearchScope
      value={everyone ? "all" : "one"}
      options={[
        { value: "one", label: own ? "Your tasks" : `${displayName(person)}'s tasks`, href: scopeHref(null) },
        { value: "all", label: "Everyone's tasks", href: scopeHref("all") },
      ]}
    />
  ) : null;

  const failed = !tasks.ok ? tasks.message : pieces.find((loaded) => !loaded.ok);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--i-line)] px-5 py-3">
        <p className="min-w-0 flex-1 text-[13px] text-[var(--i-muted)]">
          <span className="font-medium tabular-nums text-[var(--i-ink)]">{result.total}</span>{" "}
          {result.total === 1 ? "match" : "matches"} for <span className="font-medium text-[var(--i-ink)]">“{query}”</span>
          {result.total > shown ? ` · the first ${shown} shown, add a word to narrow it` : ""}
        </p>
        {scope}
      </div>
      {failed ? (
        <div className="px-5 pt-3">
          <Notice tone="warning">Some tasks couldn&apos;t load just now, so a match may be missing.</Notice>
        </div>
      ) : null}
      {result.total ? (
        <>
          <ResultGroup title="Open" hits={result.open} query={query} hrefOf={hrefOf} owner={everyone ? (hit) => names[whoseWeek(hit)] : null} />
          <ResultGroup title="Done" hits={result.done} query={query} hrefOf={hrefOf} owner={everyone ? (hit) => names[whoseWeek(hit)] : null} />
        </>
      ) : (
        <EmptyState icon={<MagnifyingGlass size={20} />} title={`Nothing matches “${query}”`}>
          Try fewer words, or a client&apos;s name.
          {scope && !everyone ? " Or search everyone's tasks." : ""}
        </EmptyState>
      )}
    </Card>
  );
}

function ResultGroup({
  title,
  hits,
  query,
  hrefOf,
  owner,
}: {
  title: string;
  hits: SearchHit[];
  query: string;
  hrefOf: (hit: SearchHit) => string;
  /** Whose it is, when searching everyone. */
  owner: ((hit: SearchHit) => string | undefined) | null;
}) {
  if (!hits.length) return null;
  return (
    <section aria-label={title}>
      <h2 className="px-5 pb-1 pt-4 text-[12px] font-medium text-[var(--i-muted)]">
        {title} <span className="tabular-nums text-[var(--i-faint)]">· {hits.length}</span>
      </h2>
      <ul className="divide-y divide-[var(--i-line)] pb-2">
        {hits.map((hit) => {
          const name = owner?.(hit);
          return (
            <li key={`${hit.kind}:${hit.id}`}>
              <Link
                href={hrefOf(hit)}
                className="flex items-start gap-3 px-5 py-2.5 transition-colors hover:bg-[var(--i-hover)]"
              >
                <span className="mt-0.5 shrink-0">
                  {hit.done ? (
                    <CheckCircle size={15} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle size={15} className="text-[var(--i-faint)]" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium leading-snug">
                      {markTerms(hit.title, query).map((piece, index) =>
                        piece.hit ? (
                          <mark key={index} className="rounded-sm bg-amber-200/70 text-inherit dark:bg-amber-400/25">
                            {piece.text}
                          </mark>
                        ) : (
                          piece.text
                        ),
                      )}
                    </span>
                    {hit.note ? <span className="mt-0.5 block truncate text-[12px] text-[var(--i-muted)]">{hit.note}</span> : null}
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center gap-2 text-[12px] text-[var(--i-muted)]">
                    {hit.forLabel !== "Studio1" ? <ForChip label={hit.forLabel} client={hit.client} /> : null}
                    {hit.done ? null : <TonePill tone={hit.status.tone} label={hit.status.label} small />}
                    {name ? (
                      <span className="inline-flex items-center gap-1">
                        <UserCircle size={12} /> {name}
                      </span>
                    ) : null}
                    <span className={cn("tabular-nums sm:w-[5.5rem] sm:text-right", hit.late && "text-rose-600 dark:text-rose-400")}>
                      {hit.day ? dayFormat.format(new Date(`${hit.day}T00:00:00Z`)) : "No day yet"}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
