import Link from "next/link";
import { CaretRight, Warning } from "@phosphor-icons/react/dist/ssr";
import { sizePoints, type OwnerLoad } from "@/lib/internal/clients/rules";
import {
  clientPath,
  formatDay,
  plural,
  pointsLabel,
  type Deliverable,
} from "@/lib/internal/clients/schema";
import { cn } from "@/lib/utils";
import { Avatar, Card } from "@/components/internal/ui";
import { Meter, Pill } from "@/components/internal/community/ui";
import {
  DeliverableFlags,
  SizeTag,
  StatusBadge,
} from "@/components/internal/clients/ui";

/*
 * One person's load for a week on the load page: points due against their
 * weekly capacity, the counts that need a look, and the deliverables behind
 * the number (open with a tap). Server-rendered; <details> does the opening.
 */

/** A deliverable with its client and engagement, for the lists. */
export type LoadItem = {
  deliverable: Deliverable;
  clientName?: string;
  clientSlug?: string;
  engagementName?: string;
};

function Count({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "rose" | "amber";
}) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span
        className={cn(
          "font-medium tabular-nums",
          !value && "text-[var(--i-faint)]",
          value > 0 && tone === "rose" && "text-rose-700 dark:text-rose-300",
          value > 0 && tone === "amber" && "text-amber-700 dark:text-amber-300",
        )}
      >
        {value}
      </span>
      <span className="text-[var(--i-muted)]">{label}</span>
    </span>
  );
}

/** One line per deliverable: title and client, status, size, due day. */
export function LoadItemList({
  items,
  today,
}: {
  items: readonly LoadItem[];
  today: string;
}) {
  return (
    <ul className="divide-y divide-[var(--i-line)]">
      {items.map(({ deliverable, clientName, clientSlug, engagementName }) => (
        <li
          key={deliverable.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2"
        >
          <span className="min-w-0 flex-1 basis-[12rem]">
            {clientSlug ? (
              <Link
                href={`${clientPath(clientSlug)}?tab=work&engagement=${deliverable.engagement_id}`}
                className="block truncate text-[13px] font-medium text-[var(--i-ink)] hover:text-[var(--i-accent-text)]"
              >
                {deliverable.title}
              </Link>
            ) : (
              <span className="block truncate text-[13px] font-medium">
                {deliverable.title}
              </span>
            )}
            <span className="block truncate text-[12px] text-[var(--i-muted)]">
              {[clientName, engagementName].filter(Boolean).join(" · ") ||
                "No client"}
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={deliverable.status} />
            <DeliverableFlags deliverable={deliverable} today={today} />
          </span>
          <span className="flex items-center gap-2 text-[12.5px] text-[var(--i-muted)]">
            <span className="whitespace-nowrap tabular-nums">
              {deliverable.due_on
                ? `Due ${formatDay(deliverable.due_on, today)}`
                : "No due date"}
            </span>
            <SizeTag size={deliverable.size} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Group({
  title,
  items,
  today,
}: {
  title: string;
  items: readonly LoadItem[];
  today: string;
}) {
  if (!items.length) return null;
  return (
    <div className="mt-2 first:mt-0">
      <p className="text-[12px] font-medium text-[var(--i-muted)]">{title}</p>
      <LoadItemList items={items} today={today} />
    </div>
  );
}

export function LoadPerson({
  load,
  due,
  late,
  toReview,
  manager,
  today,
  weekWords,
}: {
  load: OwnerLoad;
  /** Their open items due this week: the points. */
  due: readonly LoadItem[];
  /** Their other late items (past due today, not in `due`). */
  late: readonly LoadItem[];
  /** Items in internal review waiting for them. */
  toReview: readonly LoadItem[];
  manager: boolean;
  today: string;
  /** "this week", "next week"…, for the list heading. */
  weekWords: string;
}) {
  const { capacity, points } = load;
  const over = load.over && capacity !== null;
  const items = due.length + late.length + toReview.length;
  return (
    <Card
      className={cn("p-4", over && "border-rose-200 dark:border-rose-500/30")}
    >
      <div className="flex items-start gap-3">
        <Avatar name={load.name} email={load.email} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-[14px] font-medium" title={load.email}>
              {load.name}
            </h3>
            {over ? (
              <Pill tone="rose">
                Over capacity by {pointsLabel(points - (capacity as number))}
              </Pill>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12.5px] text-[var(--i-muted)]">
            {plural(load.due, "item")} due · {pointsLabel(points)}
            {capacity !== null ? ` of ${capacity}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-3">
        {capacity !== null ? (
          <Meter
            value={points}
            max={capacity}
            label={`${pointsLabel(points)} of ${capacity} capacity`}
          />
        ) : (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-amber-800 dark:text-amber-200">
            <Warning size={13} aria-hidden /> Capacity not set
            {manager ? (
              <Link
                href="/internal/clients/templates"
                className="text-[var(--i-accent-text)] underline decoration-[var(--i-line-strong)] underline-offset-[3px] hover:decoration-[var(--i-accent)]"
              >
                Set it
              </Link>
            ) : (
              <span className="text-[var(--i-muted)]">
                Ask a manager to set it.
              </span>
            )}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
        <Count label="in review" value={load.inReview} />
        <Count label="to review" value={load.toReview} tone="amber" />
        <Count label="blocked" value={load.blocked} tone="rose" />
        <Count label="late" value={load.late} tone="rose" />
      </div>

      {items ? (
        <details className="group mt-3 border-t border-[var(--i-line)] pt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-[12.5px] text-[var(--i-muted)] hover:text-[var(--i-ink)] [&::-webkit-details-marker]:hidden">
            <CaretRight
              size={12}
              className="transition-transform group-open:rotate-90"
              aria-hidden
            />
            Show the work ({plural(items, "item")})
          </summary>
          <div className="mt-2">
            <Group
              title={`Due ${weekWords} · ${pointsLabel(due.reduce((sum, item) => sum + sizePoints(item.deliverable), 0))}`}
              items={due}
              today={today}
            />
            <Group title="Also late" items={late} today={today} />
            <Group
              title="Waiting for their review"
              items={toReview}
              today={today}
            />
          </div>
        </details>
      ) : null}
    </Card>
  );
}
