import Link from "next/link";
import { ArrowRight, CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import type { HackathonStats } from "@/lib/internal/data";
import { formatDay, formatEventDate, todayKey } from "@/lib/internal/community/schema";
import { SECTIONS, statusLabel } from "@/lib/internal/sections";
import { cn } from "@/lib/utils";
import { Card, Notice, StatusDot, buttonClass } from "@/components/internal/ui";

const PHASE: Record<HackathonStats["phase"], string> = {
  open: "Registration open",
  upcoming: "Registration closed",
  past: "Over",
  unlisted: "No longer on the site",
};

/** The list page's link for one hackathon (or all of them), every other filter cleared. */
export function hackathonListHref(slug?: string, status?: string) {
  const params = new URLSearchParams();
  if (slug) params.set("event", slug);
  if (status) params.set("status", status);
  const query = params.toString();
  return query ? `${SECTIONS.hackathons.path}?${query}` : SECTIONS.hackathons.path;
}

/**
 * One tab per hackathon above the registrations list, so each event reads
 * as its own list. The chosen one also gets a strip with its dates, its
 * numbers by status and a link to its event in Community.
 */
export function HackathonTabs({
  events,
  selected,
  eventPages,
}: {
  events: HackathonStats[];
  /** The `event` filter's values; a tab is active when it's the only one. */
  selected: string[];
  /** Community event id per hackathon slug, for "Event page". */
  eventPages: Record<string, string>;
}) {
  const active = selected.length === 1 ? selected[0] : null;
  const current = active ? events.find((event) => event.slug === active) : undefined;
  const total = events.reduce((sum, event) => sum + event.total, 0);
  const today = todayKey();

  return (
    <div className="mb-5 space-y-3">
      <nav aria-label="Hackathons" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        <Tab href={hackathonListHref()} active={selected.length === 0} label="All hackathons" count={total} />
        {events.map((event) => (
          <Tab
            key={event.slug}
            href={hackathonListHref(event.slug)}
            active={active === event.slug}
            label={event.name}
            count={event.total}
            fresh={event.byStatus.new ?? 0}
            muted={event.phase === "past" || event.phase === "unlisted"}
          />
        ))}
      </nav>

      {current ? (
        <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3.5">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12px] text-[var(--i-muted)]">
              <CalendarBlank size={13} aria-hidden />
              {PHASE[current.phase]}
              {current.phase === "open" && current.registrationCloses
                ? ` until ${formatDay(current.registrationCloses, today)}`
                : ""}
            </p>
            <p className="mt-0.5 text-[13.5px] font-medium">
              {current.startDate ? formatEventDate(current.startDate, current.endDate, today) : current.name}
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
            {Object.entries(current.byStatus)
              .filter(([, count]) => count > 0)
              .map(([status, count]) => (
                <li key={status}>
                  <Link
                    href={hackathonListHref(current.slug, status)}
                    className="inline-flex items-center gap-1.5 text-[var(--i-ink-2)] hover:text-[var(--i-ink)]"
                  >
                    <StatusDot status={status} />
                    <span className="tabular-nums font-medium">{count}</span> {statusLabel(status).toLowerCase()}
                  </Link>
                </li>
              ))}
            {current.total === 0 ? <li className="text-[var(--i-muted)]">No registrations yet</li> : null}
          </ul>
          <div className="ml-auto flex items-center gap-2">
            {eventPages[current.slug] ? (
              <Link href={`/internal/community/events/${eventPages[current.slug]}`} className={buttonClass("secondary", "sm")}>
                Event page <ArrowRight size={12} />
              </Link>
            ) : (
              <span className="text-[12px] text-[var(--i-muted)]">
                No Community event yet: add a hackathon event and pick this under &ldquo;Registrations from the site
                form&rdquo;
              </span>
            )}
          </div>
        </Card>
      ) : null}
      {current && current.overdue ? (
        <Notice tone="warning">
          {current.overdue} {current.overdue === 1 ? "registration has" : "registrations have"} been waiting over 5 days for
          a reply.
        </Notice>
      ) : null}
    </div>
  );
}

function Tab({
  href,
  active,
  label,
  count,
  fresh = 0,
  muted = false,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  fresh?: number;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={fresh ? `${fresh} new` : undefined}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-[13px] transition-colors",
        active
          ? "bg-[var(--i-panel)] font-medium text-[var(--i-ink)] shadow-[var(--i-shadow)] ring-1 ring-[var(--i-line)]"
          : cn(
              "hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]",
              muted ? "text-[var(--i-faint)]" : "text-[var(--i-muted)]",
            ),
      )}
    >
      {label}
      <span className="tabular-nums text-[12px] text-[var(--i-faint)]">{count}</span>
      {fresh ? <span className="size-1.5 rounded-full bg-[var(--i-accent)]" aria-label={`${fresh} new`} /> : null}
    </Link>
  );
}
