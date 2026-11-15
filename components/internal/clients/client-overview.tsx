import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarBlank,
  CheckCircle,
  Eye,
  Handshake,
  Hourglass,
  Lightning,
  Package,
  Sparkle,
  Trophy,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import {
  cycleProgress,
  isLate,
  isWaitingOnClient,
} from "@/lib/internal/clients/rules";
import {
  CYCLE_STATES,
  DELIVERABLE_KINDS,
  formatDay,
  labelOf,
  monthLabel,
  todayKey,
  type Cycle,
  type Deliverable,
  type DeliverableKind,
  type Engagement,
  type Milestone,
  type Partner,
  type ScopeLine,
} from "@/lib/internal/clients/schema";
import { Card, CardTitle, ExternalLink } from "@/components/internal/ui";
import { Meter } from "@/components/internal/community/ui";
import { KindIcon } from "@/components/internal/clients/kind-icon";
import { KeyNumbers } from "@/components/internal/clients/key-numbers";
import { cn } from "@/lib/utils";
import { OptionBadge, StatusBadge } from "@/components/internal/clients/ui";

/**
 * A client's whole tracker at a glance, across every month and engagement:
 * what's live so far, the reach, what's with the client or still in the
 * works, the partners in play, then what we've delivered by kind, what
 * needs a look, each month in a line, and the latest wins. Server only (no
 * hooks); the monthly detail lives in the Monthly tab.
 */

const counts = new Intl.NumberFormat("en-US");

/** "Blogs", "Social posts", "Case studies"… */
function kindPlural(kind: DeliverableKind) {
  const label = labelOf(DELIVERABLE_KINDS, kind);
  if (label.endsWith("y")) return `${label.slice(0, -1)}ies`;
  if (/(outreach|Republish)$/.test(label)) return label;
  return `${label}s`;
}

const OPEN = new Set([
  "planned",
  "in_progress",
  "internal_review",
  "changes_requested",
]);

export function ClientOverview({
  engagementId,
  engagements,
  cycles,
  lines,
  deliverables,
  milestones,
  partners,
  monthHref,
  reportHref,
  tabHref,
}: {
  /** The engagement new readings go to (the one picked). */
  engagementId?: string;
  engagements: readonly Engagement[];
  cycles: readonly Cycle[];
  lines: readonly ScopeLine[];
  deliverables: readonly Deliverable[];
  milestones: readonly Milestone[];
  partners: readonly Partner[];
  /** The Monthly tab at this month of this engagement. */
  monthHref: (month: string, engagementId: string) => string;
  reportHref: (month: string, engagementId: string) => string;
  tabHref: (tab: "partners" | "milestones") => string;
}) {
  const today = todayKey();
  const live = deliverables.filter((item) => item.status === "published");
  const withClient = deliverables.filter(
    (item) => item.status === "client_review",
  );
  const approved = deliverables.filter((item) => item.status === "approved");
  const working = deliverables.filter((item) => OPEN.has(item.status));
  const reach = live.reduce((sum, item) => sum + (item.views ?? 0), 0);
  const withViews = live.filter((item) => (item.views ?? 0) > 0).length;
  const overdue = withClient.filter((item) => isWaitingOnClient(item, today));
  const months = [...new Set(cycles.map((cycle) => cycle.month))].sort();
  const cycleOf = new Map(cycles.map((cycle) => [cycle.id, cycle]));
  const engagementName = new Map(
    engagements.map((item) => [item.id, item.name]),
  );
  const several = engagements.length > 1;
  const inPlay = partners.filter((item) => item.status === "in_progress");

  // By kind, all months together.
  const kinds = new Map<
    DeliverableKind,
    {
      live: number;
      client: number;
      approved: number;
      working: number;
      views: number;
    }
  >();
  for (const item of deliverables) {
    const row = kinds.get(item.kind) ?? {
      live: 0,
      client: 0,
      approved: 0,
      working: 0,
      views: 0,
    };
    if (item.status === "published") {
      row.live++;
      row.views += item.views ?? 0;
    } else if (item.status === "client_review") row.client++;
    else if (item.status === "approved") row.approved++;
    else row.working++;
    kinds.set(item.kind, row);
  }
  const byKind = [...kinds.entries()].sort(
    (a, b) =>
      b[1].live - a[1].live ||
      b[1].client + b[1].working - (a[1].client + a[1].working),
  );

  // What needs a look: with the client past their date, blocked, late,
  // then everything else that's with the client.
  const attention = deliverables
    .filter(
      (item) =>
        item.status !== "published" &&
        (item.blocked ||
          isLate(item, today) ||
          item.status === "client_review" ||
          item.status === "approved"),
    )
    .map((item) => ({
      item,
      rank: item.blocked
        ? 0
        : isWaitingOnClient(item, today)
          ? 1
          : isLate(item, today)
            ? 2
            : item.status === "approved"
              ? 3
              : 4,
    }))
    .sort(
      (a, b) => a.rank - b.rank || a.item.title.localeCompare(b.item.title),
    );

  const monthRows = [...cycles].sort(
    (a, b) =>
      b.month.localeCompare(a.month) ||
      (engagementName.get(a.engagement_id) ?? "").localeCompare(
        engagementName.get(b.engagement_id) ?? "",
      ),
  );
  const monthViews = (cycleId: string) =>
    deliverables
      .filter(
        (item) => item.cycle_id === cycleId && item.status === "published",
      )
      .reduce((sum, item) => sum + (item.views ?? 0), 0);
  const topViews = Math.max(1, ...cycles.map((cycle) => monthViews(cycle.id)));

  if (!cycles.length)
    return (
      <Card>
        <p className="px-5 py-8 text-center text-[13px] text-[var(--i-muted)]">
          Nothing tracked yet. Start a month in the Monthly tab, and this page
          adds up everything done for the client.
        </p>
      </Card>
    );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Tile
          icon={<CheckCircle size={14} weight="bold" />}
          tone="emerald"
          label="Live so far"
          value={live.length}
          note={`since ${monthLabel(months[0], true)}`}
        />
        <Tile
          icon={<Eye size={14} weight="bold" />}
          tone="sky"
          label="Reach"
          value={reach ? counts.format(reach) : "—"}
          note={reach ? `views on ${withViews} pieces` : "No views logged yet"}
        />
        <Tile
          icon={<Hourglass size={14} weight="bold" />}
          tone="amber"
          label="With the client"
          value={withClient.length}
          note={
            overdue.length
              ? `${overdue.length} past their reply date`
              : "for approval"
          }
        />
        <Tile
          icon={<Lightning size={14} weight="bold" />}
          tone="violet"
          label="In the works"
          value={working.length + approved.length}
          note={
            approved.length
              ? `${approved.length} ready to go live`
              : "not live yet"
          }
        />
        <Tile
          icon={<Handshake size={14} weight="bold" />}
          tone="orange"
          label="Partners in play"
          value={inPlay.length}
          note={
            partners.length
              ? `of ${partners.length} reached out to`
              : "None yet"
          }
          href={tabHref("partners")}
        />
        <Tile
          icon={<Trophy size={14} weight="bold" />}
          tone="rose"
          label="Milestones"
          value={milestones.length}
          note={
            milestones[0]
              ? `latest ${formatDay(milestones[0].happened_on, today)}`
              : "None yet"
          }
          href={tabHref("milestones")}
        />
      </div>

      {engagementId ? (
        <KeyNumbers engagementId={engagementId} milestones={milestones} />
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card className="h-fit">
            <CardTitle>
              <TitleIcon icon={<Package size={15} />}>
                Delivered so far
              </TitleIcon>
            </CardTitle>
            {byKind.length ? (
              <ul className="divide-y divide-[var(--i-line)]">
                {byKind.map(([kind, row]) => (
                  <li
                    key={kind}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-5 py-2.5"
                  >
                    <span className="flex min-w-0 flex-1 basis-32 items-center gap-2 text-[13.5px]">
                      <KindIcon kind={kind} />
                      {kindPlural(kind)}
                    </span>
                    <span className="text-[13.5px] tabular-nums">
                      <span className="font-medium">{row.live}</span>
                      <span className="text-[var(--i-muted)]"> live</span>
                    </span>
                    <span className="w-full text-[12px] text-[var(--i-muted)] sm:w-auto sm:basis-56 sm:text-right">
                      {[
                        row.views ? `${counts.format(row.views)} views` : "",
                        row.client ? `${row.client} with the client` : "",
                        row.approved ? `${row.approved} approved` : "",
                        row.working ? `${row.working} in the works` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-5 text-[13px] text-[var(--i-muted)]">
                Nothing added yet.
              </p>
            )}
          </Card>
          <Card className="h-fit">
            <CardTitle>
              <TitleIcon icon={<CalendarBlank size={15} />}>
                Month by month
              </TitleIcon>
            </CardTitle>
            <ul className="divide-y divide-[var(--i-line)]">
              {monthRows.map((cycle) => {
                const progress = cycleProgress(
                  lines.filter((line) => line.cycle_id === cycle.id),
                  deliverables.filter((item) => item.cycle_id === cycle.id),
                );
                const views = monthViews(cycle.id);
                return (
                  <li
                    key={cycle.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-2.5"
                  >
                    <Link
                      href={monthHref(cycle.month, cycle.engagement_id)}
                      className="group min-w-0 flex-1 basis-36"
                    >
                      <span className="flex items-center gap-1 text-[13.5px] font-medium group-hover:text-[var(--i-accent-text)]">
                        {monthLabel(cycle.month)}
                        <ArrowRight
                          size={12}
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </span>
                      {several ? (
                        <span className="block truncate text-[12px] text-[var(--i-muted)]">
                          {engagementName.get(cycle.engagement_id)}
                        </span>
                      ) : null}
                    </Link>
                    <span className="w-28 text-[12.5px] tabular-nums text-[var(--i-muted)]">
                      {progress.planned > 0
                        ? `${progress.done} of ${progress.planned} done`
                        : `${progress.done} live`}
                    </span>
                    <span className="flex w-36 items-center gap-2">
                      <span className="w-14">
                        <Meter
                          value={views}
                          max={topViews}
                          label={`${counts.format(views)} views`}
                        />
                      </span>
                      <span className="text-[12px] tabular-nums text-[var(--i-muted)]">
                        {views ? `${counts.format(views)} views` : ""}
                      </span>
                    </span>
                    <OptionBadge list={CYCLE_STATES} value={cycle.state} />
                    <Link
                      href={reportHref(cycle.month, cycle.engagement_id)}
                      className="text-[12.5px] text-[var(--i-muted)] underline decoration-[var(--i-line-strong)] underline-offset-[3px] hover:text-[var(--i-ink)]"
                    >
                      Report
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="h-fit">
            <CardTitle>
              <TitleIcon icon={<WarningCircle size={15} />}>
                Needs a look
              </TitleIcon>{" "}
              <span className="font-normal text-[var(--i-faint)]">
                {attention.length}
              </span>
            </CardTitle>
            {attention.length ? (
              <ul className="divide-y divide-[var(--i-line)]">
                {attention.slice(0, 8).map(({ item }) => {
                  const cycle = cycleOf.get(item.cycle_id);
                  return (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5"
                    >
                      <KindIcon
                        kind={item.kind}
                        className="self-start mt-0.5"
                      />
                      <span className="min-w-0 flex-1 basis-56">
                        <Link
                          href={
                            cycle
                              ? monthHref(cycle.month, cycle.engagement_id)
                              : "#"
                          }
                          className="block truncate text-[13.5px] hover:text-[var(--i-accent-text)]"
                        >
                          {item.title}
                        </Link>
                        <span className="block truncate text-[12px] text-[var(--i-muted)]">
                          {[
                            kindPlural(item.kind).replace(/s$/, ""),
                            cycle ? monthLabel(cycle.month, true) : "",
                            item.blocked
                              ? `Blocked: ${item.block_reason}`
                              : isWaitingOnClient(item, today)
                                ? "Past the client's reply date"
                                : isLate(item, today)
                                  ? "Past its due date"
                                  : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <StatusBadge status={item.status} kind={item.kind} />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="flex items-center gap-2 px-5 py-5 text-[13px] text-[var(--i-muted)]">
                <CheckCircle size={16} className="shrink-0 text-emerald-600" />
                Nothing waiting on anyone.
              </p>
            )}
            {attention.length > 8 ? (
              <p className="border-t border-[var(--i-line)] px-5 py-2 text-[12px] text-[var(--i-muted)]">
                And {attention.length - 8} more in the Monthly tab.
              </p>
            ) : null}
          </Card>
          <Card className="h-fit">
            <CardTitle
              action={
                milestones.length ? (
                  <Link
                    href={tabHref("milestones")}
                    className="text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)]"
                  >
                    All {milestones.length}
                  </Link>
                ) : null
              }
            >
              <TitleIcon icon={<Sparkle size={15} />}>
                Latest achievements
              </TitleIcon>
            </CardTitle>
            {milestones.length ? (
              <ul className="divide-y divide-[var(--i-line)]">
                {milestones.slice(0, 6).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 px-5 py-2.5"
                  >
                    <Trophy
                      size={15}
                      className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px]">
                        {item.url ? (
                          <ExternalLink href={item.url}>
                            {item.title}
                          </ExternalLink>
                        ) : (
                          item.title
                        )}
                      </span>
                      {item.metric && item.value !== null ? (
                        <span className="block text-[12px] tabular-nums text-[var(--i-muted)]">
                          {counts.format(item.value)} {item.metric}
                        </span>
                      ) : item.notes ? (
                        <span className="block truncate text-[12px] text-[var(--i-muted)]">
                          {item.notes}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-[var(--i-muted)]">
                      {formatDay(item.happened_on, today)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-start gap-2.5 px-5 py-5 text-[13px] text-[var(--i-muted)]">
                <Trophy size={16} className="mt-0.5 shrink-0" />
                Achievements show here: star counts, a trending spot, a post
                that took off. Add them in Milestones.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const TILE_TONES = {
  emerald:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  violet:
    "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  orange:
    "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
} as const;

/** A number with its label, a small colored icon and a note. */
function Tile({
  icon,
  tone,
  label,
  value,
  note,
  href,
}: {
  icon: ReactNode;
  tone: keyof typeof TILE_TONES;
  label: string;
  value: ReactNode;
  note?: ReactNode;
  href?: string;
}) {
  const body = (
    <Card
      className={cn(
        "h-full px-4 py-3.5",
        href && "transition-colors hover:border-[var(--i-line-strong)]",
      )}
    >
      <p className="flex items-center gap-2 text-[12.5px] text-[var(--i-muted)]">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md",
            TILE_TONES[tone],
          )}
        >
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-3 truncate text-[24px] font-medium leading-none tabular-nums tracking-[-0.02em]">
        {value}
      </p>
      {note ? (
        <p className="mt-2 truncate text-[12px] text-[var(--i-faint)]">
          {note}
        </p>
      ) : null}
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/** A card title with its icon. */
function TitleIcon({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex text-[var(--i-muted)]">{icon}</span>
      {children}
    </span>
  );
}
