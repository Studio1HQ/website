import Link from "next/link";
import { Card } from "@/components/internal/ui";
import { SiteLogo } from "@/components/internal/site-logo";
import { ageLabel } from "@/lib/internal/inbound/board";
import type { LeadCard } from "@/lib/internal/inbound/schema";
import {
  FIT_LABELS,
  fitOf,
  sourceLabel,
  statusLine,
} from "@/lib/internal/inbound/wording";
import { cn } from "@/lib/utils";

/** A lead's mark: its website's icon in the house style (Outreach's, but for Inbound people). */
export function LeadLogo({
  lead,
  size = 28,
}: {
  lead: LeadCard["org"];
  size?: number;
}) {
  return (
    <SiteLogo
      path={`/inbound/${lead.id}/logo`}
      name={lead.name}
      website={lead.website}
      size={size}
    />
  );
}

/** A small neutral tag with the fit the research gave, when it gave one. */
export function FitTag({ whyFit }: { whyFit: string }) {
  const fit = fitOf(whyFit);
  if (!fit) return null;
  return (
    <span
      title={fit.reasons || undefined}
      className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[var(--i-sunken)] px-2 py-0.5 text-[11.5px] text-[var(--i-ink-2)] ring-1 ring-inset ring-[var(--i-line)]"
    >
      {FIT_LABELS[fit.level]}
    </span>
  );
}

/** The one line on a card: what the agent is doing or waiting for. */
export function StatusText({
  card,
  className,
}: {
  card: LeadCard;
  className?: string;
}) {
  const failed = card.latest?.status === "failed";
  return (
    <span
      className={cn(
        failed ? "text-rose-700 dark:text-rose-300" : "text-[var(--i-ink-2)]",
        className,
      )}
    >
      {statusLine(card.latest, card.org.stage)}
    </span>
  );
}

/** "Call · 3 days ago". */
export function sourceAndAge(card: LeadCard, now: Date) {
  return [sourceLabel(card.org.source), ageLabel(card.org.created_at, now)]
    .filter(Boolean)
    .join(" · ");
}

/** One lead on the board. */
export function BoardCard({ card, now }: { card: LeadCard; now: Date }) {
  return (
    <Card className="px-3.5 py-3">
      <Link
        href={`/inbound/${card.org.id}`}
        className="group flex min-w-0 items-start gap-2.5"
      >
        <LeadLogo lead={card.org} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium group-hover:text-[var(--i-accent-text)]">
            {card.org.name}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-[var(--i-muted)]">
            {sourceAndAge(card, now)}
          </span>
        </span>
      </Link>
      {card.primaryContact ? (
        <p className="mt-2 truncate text-[12px] text-[var(--i-muted)]">
          {card.primaryContact.name || card.primaryContact.email}
        </p>
      ) : null}
      <div className="mt-2 flex items-start justify-between gap-2">
        <StatusText
          card={card}
          className="line-clamp-2 min-w-0 text-[12.5px] leading-snug"
        />
        <FitTag whyFit={card.org.why_fit} />
      </div>
    </Card>
  );
}
