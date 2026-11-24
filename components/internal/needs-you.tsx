import Link from "next/link";
import { ArrowRight, CheckCircle, Tray } from "@/components/internal/icons";
import { AREAS } from "@/components/internal/overview-areas";
import { Card, CardTitle } from "@/components/internal/ui";
import type { Attention } from "@/lib/internal/overview";
import { cn } from "@/lib/utils";

function Row({ item }: { item: Attention }) {
  const IconComponent = AREAS[item.area].icon;
  return (
    <li>
      <Link
        href={item.href}
        title={AREAS[item.area].name}
        className="group mx-2 flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
      >
        {/* The area's icon; an urgent row gets a small accent dot on it. */}
        <span className="relative flex shrink-0 text-[var(--i-muted)]">
          <IconComponent size={15} />
          {item.urgent ? (
            <span
              aria-label="Urgent"
              className="absolute -right-1 -top-1 size-1.5 rounded-full bg-[var(--i-accent)]"
            />
          ) : null}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13.5px]">
          {item.label}
          {item.detail ? <span className="text-[var(--i-muted)]"> · {item.detail}</span> : null}
        </span>
        <ArrowRight
          size={14}
          className="shrink-0 text-[var(--i-faint)] transition-colors group-hover:text-[var(--i-ink)]"
        />
      </Link>
    </li>
  );
}

/**
 * "Needs you" on the overview: every to-do from every area as one plain
 * list, most pressing first. A long day scrolls inside the card.
 */
export function NeedsYou({ items, className }: { items: Attention[]; className?: string }) {
  return (
    <Card className={cn("flex min-h-0 flex-col", className)}>
      <CardTitle
        action={
          items.length ? (
            <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[12px] font-medium tabular-nums text-[var(--i-ink-2)] dark:bg-white/[0.08]">
              {items.length}
            </span>
          ) : null
        }
      >
        <Tray size={15} />
        Needs you
      </CardTitle>

      {items.length === 0 ? (
        // Centred, so a card stretched beside a busy Today reads as calm, not blank.
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 pb-6 pt-2 text-center">
          <CheckCircle size={22} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
          <p className="text-[13.5px] text-[var(--i-muted)]">
            <span className="font-medium text-[var(--i-ink)]">All clear.</span> Nothing is waiting on you.
          </p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto pb-2 lg:max-h-[20rem]">
          {items.map((item) => (
            <Row key={`${item.area}-${item.label}`} item={item} />
          ))}
        </ul>
      )}
    </Card>
  );
}
