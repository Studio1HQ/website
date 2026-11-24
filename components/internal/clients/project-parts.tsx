import type { ReactNode } from "react";
import Link from "next/link";
import { CaretRight, ClockCounterClockwise, Eye } from "@/components/internal/icons";
import { cycleProgress, isLate, waitsOnClient } from "@/lib/internal/clients/rules";
import { projectPath, projectTitle } from "@/lib/internal/clients/projects";
import {
  CADENCES,
  CYCLE_STATES,
  ENGAGEMENT_STATUSES,
  engagementTypes,
  formatDay,
  labelOf,
  personName,
  plural,
  statusLabel,
  todayKey,
  type Cycle,
  type Deliverable,
  type Engagement,
  type Option,
  type ScopeLine,
  type StatusEvent,
} from "@/lib/internal/clients/schema";
import { Card, CardTitle, ExternalLink, Field, Fields, formatDate, relativeDate } from "@/components/internal/ui";
import { OptionBadge, OwnerName, ProgressMeter } from "@/components/internal/clients/ui";
import { cn } from "@/lib/utils";

/* Pieces of the company and project pages that need no browser code. */

const counts = new Intl.NumberFormat("en-US");

/** A quiet fold at the bottom of a page: a title, a count, and what's inside once opened. */
export function Fold({
  title,
  note,
  open = false,
  children,
  id,
}: {
  title: string;
  /** Quiet words after the title ("4", "notes, invoice"). */
  note?: ReactNode;
  open?: boolean;
  children: ReactNode;
  id?: string;
}) {
  return (
    <details id={id} open={open} className="group scroll-mt-20 rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-[13px] text-[var(--i-ink-2)] hover:text-[var(--i-ink)] [&::-webkit-details-marker]:hidden">
        <CaretRight size={12} aria-hidden className="text-[var(--i-muted)] transition-transform group-open:rotate-90" />
        <span className="font-medium">{title}</span>
        {note !== undefined && note !== "" ? <span className="text-[var(--i-faint)]">{note}</span> : null}
      </summary>
      <div className="border-t border-[var(--i-line)] px-5 py-4">{children}</div>
    </details>
  );
}

/** What a month's pieces add up to: done of planned, views, and what's held up. */
export function monthFacts(lines: readonly Pick<ScopeLine, "planned">[], pieces: readonly Deliverable[], today = todayKey()) {
  const progress = cycleProgress(lines, pieces);
  return {
    progress,
    views: pieces.filter((item) => item.status === "published").reduce((sum, item) => sum + (item.views ?? 0), 0),
    blocked: pieces.filter((item) => item.blocked && item.status !== "published").length,
    waiting: pieces.filter((item) => item.status !== "published" && waitsOnClient(item, today)).length,
    late: pieces.filter((item) => isLate(item, today)).length,
  };
}

/** "2 blocked · 1 waiting on the client · 1 late", or nothing when all is well. */
export function HeldUp({ blocked, waiting, late }: { blocked: number; waiting: number; late: number }) {
  const parts = [
    blocked ? { text: `${blocked} blocked`, tone: "text-rose-700 dark:text-rose-300" } : null,
    waiting ? { text: `${waiting} waiting on the client`, tone: "text-amber-700 dark:text-amber-300" } : null,
    late ? { text: `${late} late`, tone: "text-rose-700 dark:text-rose-300" } : null,
  ].filter((part): part is { text: string; tone: string } => part !== null);
  if (!parts.length) return null;
  return (
    <span className="text-[12px]">
      {parts.map((part, index) => (
        <span key={part.text}>
          {index ? <span className="text-[var(--i-faint)]"> · </span> : null}
          <span className={part.tone}>{part.text}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * A company's projects, newest month first: one row per engagement month
 * ("DevRel · November 2026"), with how far it got and what's held up.
 */
export function ProjectList({
  slug,
  company,
  engagements,
  cycles,
  lines,
  deliverables,
  types,
  several,
  today = todayKey(),
}: {
  slug: string;
  company: string;
  engagements: readonly Engagement[];
  cycles: readonly Cycle[];
  lines: readonly ScopeLine[];
  deliverables: readonly Deliverable[];
  types: readonly Option[];
  /** The company has more than one engagement: links say which. */
  several: boolean;
  today?: string;
}) {
  const byId = new Map(engagements.map((item) => [item.id, item]));
  const rows = [...cycles]
    .filter((cycle) => byId.has(cycle.engagement_id))
    .sort(
      (a, b) =>
        b.month.localeCompare(a.month) ||
        (byId.get(a.engagement_id)?.name ?? "").localeCompare(byId.get(b.engagement_id)?.name ?? ""),
    );
  return (
    <ul className="divide-y divide-[var(--i-line)]">
      {rows.map((cycle) => {
        const engagement = byId.get(cycle.engagement_id)!;
        const facts = monthFacts(
          lines.filter((line) => line.cycle_id === cycle.id),
          deliverables.filter((item) => item.cycle_id === cycle.id),
          today,
        );
        const href = projectPath(slug, cycle.month, { engagement: several ? engagement.id : null });
        return (
          <li key={cycle.id}>
            <Link
              href={href}
              className="group flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5 transition-colors hover:bg-[var(--i-hover)]"
            >
              <span className="min-w-0 flex-1 basis-56">
                <span className="block text-[14px] font-medium group-hover:text-[var(--i-accent-text)]">
                  {projectTitle(engagement, company, cycle.month, { types })}
                </span>
                <span className="mt-0.5 block">
                  <HeldUp blocked={facts.blocked} waiting={facts.waiting} late={facts.late} />
                </span>
              </span>
              <OptionBadge list={CYCLE_STATES} value={cycle.state} />
              <span className="w-44">
                <ProgressMeter done={facts.progress.done} planned={facts.progress.planned} approved={facts.progress.approved} compact />
              </span>
              <span className="flex w-28 items-center justify-end gap-1.5 text-[12.5px] tabular-nums text-[var(--i-muted)]">
                {facts.views ? (
                  <>
                    <Eye size={13} aria-hidden /> {counts.format(facts.views)}
                  </>
                ) : null}
              </span>
              <CaretRight size={14} aria-hidden className="hidden text-[var(--i-faint)] sm:block" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** An engagement's details: what the work is, who runs it, its dates and links. */
export function EngagementDetails({
  engagement,
  types,
  rhythm,
  names,
  action,
  money,
  manager,
}: {
  engagement: Engagement;
  types: ReturnType<typeof engagementTypes>;
  rhythm: string;
  names: Readonly<Record<string, string>>;
  action?: ReactNode;
  /** A founder: sees the contract link. */
  money: boolean;
  /** A client manager: sees the notes. */
  manager: boolean;
}) {
  const today = todayKey();
  return (
    <Card>
      <CardTitle action={action}>{engagement.name}</CardTitle>
      <div className="px-5 py-4">
        <Fields>
          <Field label="Type">
            <OptionBadge list={types} value={engagement.type} />
          </Field>
          <Field label="Status">
            <OptionBadge list={ENGAGEMENT_STATUSES} value={engagement.status} />
          </Field>
          <Field label="Account owner">{engagement.owner ? <OwnerName email={engagement.owner} names={names} /> : null}</Field>
          <Field label="Cadence">{labelOf(CADENCES, engagement.cadence)}</Field>
          <Field label="Dates">
            {engagement.starts_on || engagement.ends_on
              ? `${engagement.starts_on ? formatDay(engagement.starts_on, today) : "Open start"} – ${
                  engagement.ends_on ? formatDay(engagement.ends_on, today) : "ongoing"
                }`
              : null}
          </Field>
          <Field label="Weekly rhythm">{rhythm || null}</Field>
          <Field label="Client tracker">
            {engagement.client_tracker_url ? <ExternalLink href={engagement.client_tracker_url}>Open their tracker</ExternalLink> : null}
          </Field>
          {money ? (
            <Field label="Contract">
              {engagement.contract_url ? <ExternalLink href={engagement.contract_url}>Open the contract</ExternalLink> : null}
            </Field>
          ) : null}
          {manager && engagement.notes ? (
            <Field label="Notes" wide>
              <span className="whitespace-pre-wrap break-words">{engagement.notes}</span>
            </Field>
          ) : null}
        </Fields>
      </div>
    </Card>
  );
}

/** Who moved what in the month, newest first, with their comment. */
export function Activity({
  events,
  deliverables,
  names,
  className,
}: {
  events: readonly StatusEvent[];
  deliverables: readonly Deliverable[];
  names: Readonly<Record<string, string>>;
  className?: string;
}) {
  const titles = new Map(deliverables.map((item) => [item.id, item.title]));
  const kinds = new Map(deliverables.map((item) => [item.id, item.kind]));
  const shown = events.slice(0, 20);
  const status = (value: StatusEvent["to_status"], id: string) => (value ? statusLabel(value, kinds.get(id)) : "");
  if (!shown.length)
    return (
      <p className={cn("flex items-center gap-2.5 text-[13px] text-[var(--i-muted)]", className)}>
        <ClockCounterClockwise size={16} className="shrink-0" />
        Status changes and blocks on this month&apos;s pieces show up here.
      </p>
    );
  return (
    <ul className={cn("divide-y divide-[var(--i-line)]", className)}>
      {shown.map((event) => {
        const who = personName(event.by, names) || "Someone";
        const title = titles.get(event.deliverable_id) ?? "a piece";
        const what =
          event.kind === "created"
            ? `added ${title}${event.to_status && event.to_status !== "planned" ? ` at ${status(event.to_status, event.deliverable_id)}` : ""}`
            : event.kind === "blocked"
              ? `marked ${title} blocked`
              : event.kind === "unblocked"
                ? `unblocked ${title}`
                : `moved ${title} from ${status(event.from_status, event.deliverable_id) || "—"} to ${status(event.to_status, event.deliverable_id) || "—"}`;
        return (
          <li key={event.id} className="py-2.5 first:pt-0 last:pb-0">
            <p className="text-[13px] leading-snug">
              <span className="font-medium">{who}</span> {what}
            </p>
            {event.comment ? (
              <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap break-words text-[12.5px] text-[var(--i-ink-2)]">{event.comment}</p>
            ) : null}
            <p className="mt-0.5 text-[11.5px] text-[var(--i-faint)]" title={formatDate(event.at)}>
              {relativeDate(event.at)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/** "3 pieces" / "Nothing yet": a fold's quiet count. */
export function countNote(count: number, noun: string) {
  return count ? plural(count, noun) : "none yet";
}
