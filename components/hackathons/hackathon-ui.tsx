"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarBlank,
  MapPin,
  Plus,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HackathonCover } from "@/components/hackathons/hackathon-cover";
import { CELL, MUTED } from "@/components/paper/paper-sections";
import type { HackathonFaq } from "@/data/hackathons";
import {
  FORMAT_LABEL,
  STATUS_LABEL,
  type HackathonCard,
  type HackathonStatus,
} from "@/lib/hackathons";
import { INK, PAPER, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

export const pad = (value: number) => String(value).padStart(2, "0");

/** Grain + ruled lines behind a paper hero. */
export const RULED_LINES =
  "pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(to_bottom,rgba(20,20,20,0.06)_1px,transparent_1px)] [background-size:100%_48px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_70%,transparent)]";

/** Small square status chip, printed like the careers chips. */
export function StatusChip({
  status,
  className,
}: {
  status: HackathonStatus;
  className?: string;
}) {
  if (status === "live") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-1.5 py-[3px] text-[11px] font-medium leading-none text-white",
          className,
        )}
        style={{ background: PRINT }}
      >
        <span className="relative flex size-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/80 motion-reduce:hidden" />
          <span className="relative size-1.5 rounded-full bg-white" />
        </span>
        {STATUS_LABEL.live}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-[3px] text-[11px] font-medium leading-none ring-1 ring-inset",
        status === "upcoming"
          ? "text-[#141414] ring-[#141414]/30"
          : "text-[#141414]/45 ring-[#141414]/15",
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Ink pill with the orange arrow dot, the site's primary action. */
export function InkPill({
  href,
  children,
  external = false,
  tone = "ink",
  className,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
  /** "paper" for use on a night band. */
  tone?: "ink" | "paper";
  className?: string;
}) {
  const style: CSSProperties =
    tone === "ink"
      ? { background: INK, color: PAPER }
      : { background: PAPER, color: INK };
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "group inline-flex h-12 items-center justify-between gap-3 rounded-full py-1.5 pl-6 pr-1.5 text-[15px] font-medium transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none",
        className,
      )}
      style={style}
    >
      {children}
      <span
        className="flex size-9 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45"
        style={{ background: PRINT }}
      >
        <ArrowUpRight weight="bold" className="size-4" />
      </span>
    </a>
  );
}

/** A word underlined by a hand-drawn orange stroke that draws in once. */
export function Underlined({ children }: { children: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <span className="relative inline-block">
      {children}
      <svg
        aria-hidden
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-[0.08em] left-0 h-[0.22em] w-full overflow-visible"
      >
        <motion.path
          d="M2 8 C 40 3, 90 3, 120 6 S 175 10, 198 4"
          fill="none"
          stroke={PRINT}
          strokeWidth="5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: 0.4 }}
        />
      </svg>
    </span>
  );
}

/** Listing card: poster cover, where and when, the prize line, status. */
export function HackathonCardLink({ card }: { card: HackathonCard }) {
  return (
    <Link
      href={`/hackathons/${card.slug}`}
      className={cn("group flex h-full flex-col p-2", CELL)}
    >
      <div className="overflow-hidden rounded-[3px]">
        <div className="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] motion-reduce:transform-none">
          <HackathonCover
            slug={card.slug}
            name={card.name}
            tone={card.cover.tone}
            pattern={card.cover.pattern}
            topRight={FORMAT_LABEL[card.format]}
            bottom={`${card.prizePool} prize pool`}
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-medium text-[#141414]/60">
          <span className="inline-flex items-center gap-1.5">
            <MapPin weight="bold" className="size-3.5 shrink-0" />
            {card.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarBlank weight="bold" className="size-3.5 shrink-0" />
            {card.dateRange}
          </span>
        </div>
        <h3 className="mt-3 text-[22px] font-medium leading-tight tracking-[-0.035em]">
          {card.name}
        </h3>
        <p className={cn("mt-1.5 text-[14.5px] leading-[1.55]", MUTED)}>
          {card.summary}
        </p>
        <div className="mt-auto pt-6">
          <div className="flex items-center justify-between gap-3 border-t border-[#141414]/10 pt-4">
            <span className="flex min-w-0 items-center gap-2.5">
              <StatusChip status={card.status} />
              <span className="truncate text-[13px] text-[#141414]/60">
                {card.countdown}
              </span>
            </span>
            <ArrowUpRight
              weight="bold"
              className="size-4 shrink-0 text-[#141414]/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#141414]"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Questions in one white card with hairline rows, as on the service pages. */
export function HackathonFaqList({ items }: { items: HackathonFaq[] }) {
  return (
    <div className="mt-10 min-w-0 rounded-[6px] bg-white/80 px-6 py-2 ring-1 ring-inset ring-[#141414]/10 sm:px-8">
      <Accordion type="single" collapsible className="w-full">
        {items.map((item, position) => (
          <AccordionItem
            key={item.question}
            value={`faq-${position}`}
            className="border-b border-[#141414]/10 last:border-b-0"
          >
            <AccordionTrigger
              className={cn(
                "group gap-5 py-5 text-left hover:no-underline sm:py-6",
                "[&>svg]:hidden",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2",
              )}
            >
              <span className="w-7 shrink-0 text-[13px] font-medium tabular-nums text-[#141414]/35 transition-colors group-data-[state=open]:text-[#f97316]">
                {pad(position + 1)}
              </span>
              <span className="min-w-0 flex-1 text-[16px] font-medium leading-snug tracking-[-0.02em] text-[#141414] transition-colors duration-200 group-hover:text-[#f97316] group-data-[state=open]:text-[#f97316] sm:text-[17px]">
                {item.question}
              </span>
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-[#f4efe7] ring-1 ring-inset ring-[#141414]/[0.08] text-[#141414]/55 transition-colors group-data-[state=open]:bg-[#f97316] group-data-[state=open]:text-white group-data-[state=open]:ring-0"
              >
                <Plus
                  weight="bold"
                  className="size-3.5 transition-transform duration-300 group-data-[state=open]:rotate-45"
                />
              </span>
            </AccordionTrigger>
            <AccordionContent
              className={cn(
                "max-w-[760px] pb-6 pl-12 pr-12 text-[15px] leading-[1.7]",
                MUTED,
              )}
            >
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
