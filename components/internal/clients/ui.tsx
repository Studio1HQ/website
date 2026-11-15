import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Avatar, Notice } from "@/components/internal/ui";
import { Meter, Pill } from "@/components/internal/community/ui";
import {
  blockedDays,
  isLate,
  isWaitingOnClient,
} from "@/lib/internal/clients/rules";
import {
  CLIENTS_MIGRATION_HINT,
  DELIVERABLE_STATUSES,
  HEALTH_LEVELS,
  SIZES,
  SIZE_POINTS,
  WAITS_ON,
  formatDay,
  labelOf,
  percentOf,
  personName,
  plural,
  statusLabel,
  todayKey,
  toneOf,
  type Deliverable,
  type DeliverableKind,
  type DeliverableStatus,
  type HealthLevel,
  type Option,
  type Size,
  type WaitsOn,
} from "@/lib/internal/clients/schema";

/*
 * Presentational pieces for the client work pages (no hooks, safe in server
 * and client components). Data comes in through props.
 */

/** A deliverable's status as a pill, named for its kind ("Writing" for a blog). */
export function StatusBadge({
  status,
  kind,
}: {
  status: DeliverableStatus;
  kind?: DeliverableKind | null;
}) {
  return (
    <Pill tone={toneOf(DELIVERABLE_STATUSES, status)}>
      {statusLabel(status, kind)}
    </Pill>
  );
}

/** Any option list's value as a pill: client status, cycle state, invoice… */
export function OptionBadge({
  list,
  value,
}: {
  list: readonly Option[];
  value: string | null | undefined;
}) {
  if (!value) return <span className="text-[var(--i-faint)]">—</span>;
  return <Pill tone={toneOf(list, value)}>{labelOf(list, value)}</Pill>;
}

/**
 * Red / amber / green with the reason: as a tooltip by default, or written
 * out under the pill with `showReason`.
 */
export function HealthBadge({
  level,
  reason,
  showReason = false,
  className,
}: {
  level: HealthLevel;
  reason: string;
  showReason?: boolean;
  className?: string;
}) {
  const pill = (
    <span
      title={reason}
      aria-label={`${labelOf(HEALTH_LEVELS, level)}: ${reason}`}
    >
      <Pill tone={toneOf(HEALTH_LEVELS, level)}>
        {labelOf(HEALTH_LEVELS, level)}
      </Pill>
    </span>
  );
  if (!showReason) return <span className={className}>{pill}</span>;
  return (
    <span
      className={cn(
        "inline-flex min-w-0 flex-col items-start gap-1",
        className,
      )}
    >
      {pill}
      <span className="text-[12px] leading-snug text-[var(--i-muted)]">
        {reason}
      </span>
    </span>
  );
}

/** "4 of 10 done" with a bar; approved-not-live shown beside it when there are any. */
export function ProgressMeter({
  done,
  planned,
  approved = 0,
  compact = false,
  className,
}: {
  done: number;
  planned: number;
  /** Approved, not yet live. */
  approved?: number;
  /** Just the numbers and the bar, no "done" word or approved note. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="flex items-baseline justify-between gap-2 text-[12.5px] tabular-nums">
        <span>
          <span className="font-medium text-[var(--i-ink)]">{done}</span>
          <span className="text-[var(--i-muted)]">
            {" "}
            of {planned}
            {compact ? "" : " done"}
          </span>
        </span>
        {planned > 0 ? (
          <span className="text-[var(--i-faint)]">
            {percentOf(done, planned)}%
          </span>
        ) : null}
      </span>
      <Meter value={done} max={planned} label={`${done} of ${planned} done`} />
      {!compact && approved > 0 ? (
        <span className="text-[11.5px] text-[var(--i-muted)]">
          + {approved} approved, not live yet
        </span>
      ) : null}
    </span>
  );
}

function Tag({
  tone,
  children,
  title,
}: {
  tone: "amber" | "rose" | "sky" | "stone";
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex max-w-full items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11.5px] font-medium",
        tone === "amber" &&
          "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200",
        tone === "rose" &&
          "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
        tone === "sky" &&
          "bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200",
        tone === "stone" && "bg-[var(--i-sunken)] text-[var(--i-ink-2)]",
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Client review past the reply date: the client's delay, not ours. */
export function WaitingOnClientTag({
  since,
  today = todayKey(),
}: {
  since?: string | null;
  today?: string;
}) {
  return (
    <Tag
      tone="sky"
      title={
        since
          ? `The client was to reply by ${formatDay(since, today)}`
          : undefined
      }
    >
      Waiting on client{since ? ` since ${formatDay(since, today)}` : ""}
    </Tag>
  );
}

/** The blocked flag, with who it waits on and the reason as a tooltip. */
export function BlockedTag({
  waitsOn,
  reason,
  days,
}: {
  waitsOn: WaitsOn | null;
  reason?: string;
  /** Days blocked, when known. */
  days?: number | null;
}) {
  const who = waitsOn ? labelOf(WAITS_ON, waitsOn).toLowerCase() : null;
  return (
    <Tag tone="rose" title={reason || undefined}>
      Blocked{who ? ` · ${who}` : ""}
      {days ? ` · ${plural(days, "day")}` : ""}
    </Tag>
  );
}

/** Past its due date and still ours. */
export function LateTag({
  due,
  today = todayKey(),
}: {
  due: string;
  today?: string;
}) {
  return <Tag tone="amber">Late · was due {formatDay(due, today)}</Tag>;
}

/**
 * The tags a deliverable earns today: blocked, waiting on the client, late.
 * Renders nothing when none apply.
 */
export function DeliverableFlags({
  deliverable,
  today = todayKey(),
  className,
}: {
  deliverable: Pick<
    Deliverable,
    | "status"
    | "due_on"
    | "client_due_on"
    | "blocked"
    | "block_reason"
    | "waits_on"
    | "blocked_at"
  >;
  today?: string;
  className?: string;
}) {
  const waiting = isWaitingOnClient(deliverable, today);
  const late = isLate(deliverable, today);
  if (!deliverable.blocked && !waiting && !late) return null;
  return (
    <span className={cn("flex flex-wrap items-center gap-1", className)}>
      {deliverable.blocked ? (
        <BlockedTag
          waitsOn={deliverable.waits_on}
          reason={deliverable.block_reason}
          days={blockedDays(deliverable, today)}
        />
      ) : null}
      {waiting ? (
        <WaitingOnClientTag since={deliverable.client_due_on} today={today} />
      ) : null}
      {late && deliverable.due_on ? (
        <LateTag due={deliverable.due_on} today={today} />
      ) : null}
    </span>
  );
}

/** S / M / L with its points. */
export function SizeTag({ size }: { size: Size }) {
  return (
    <span
      title={`${labelOf(SIZES, size)}: ${plural(SIZE_POINTS[size], "point")}`}
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-[var(--i-sunken)] text-[11px] font-medium text-[var(--i-ink-2)] ring-1 ring-inset ring-[var(--i-line)]"
    >
      {size}
    </span>
  );
}

/** An owner or reviewer: avatar and name (from the capacity list when set). */
export function OwnerName({
  email,
  names,
  size = 20,
  empty = "No owner",
  hideName = false,
}: {
  email: string | null | undefined;
  names?: Readonly<Record<string, string>>;
  size?: 20 | 24 | 28;
  /** Shown when there's nobody. */
  empty?: string;
  /** Avatar only (name in the tooltip). */
  hideName?: boolean;
}) {
  if (!email) return <span className="text-[var(--i-faint)]">{empty}</span>;
  const name = personName(email, names);
  return (
    <span
      className="inline-flex min-w-0 items-center gap-1.5"
      title={hideName ? `${name} (${email})` : email}
    >
      <Avatar name={name} email={email} size={size} />
      {hideName ? (
        <span className="sr-only">{name}</span>
      ) : (
        <span className="truncate">{name}</span>
      )}
    </span>
  );
}

/** Shown when the client work tables don't exist yet. */
export function ClientsMigrationNotice({
  message = CLIENTS_MIGRATION_HINT,
}: {
  message?: string;
}) {
  return <Notice tone="warning">{message}</Notice>;
}

/** Shown when part of a page's data didn't load or was cut short. */
export function ClientsLoadNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="mb-5">
      <Notice tone="warning">
        Some client work data couldn&apos;t be loaded, so lists and numbers on
        this page may be missing. Reload in a minute.
      </Notice>
    </div>
  );
}
