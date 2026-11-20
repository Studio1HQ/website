"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { EASE } from "@/components/home/ui";
import type { CommunityItem, CommunityKind } from "@/lib/community";
import { GRAIN, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const KIND_LABEL: Record<CommunityKind, string> = {
  meetup: "Meetup",
  hackathon: "Hackathon",
  workshop: "Workshop",
  conference: "Conference",
  online: "Online session",
};

/** "Nov 25" or "Nov 26–29", or the approximate wording when not exact. */
function when(item: CommunityItem) {
  if (item.approx) return item.approx;
  const [, m, d] = item.date.split("-").map(Number);
  const end = item.endDate ? Number(item.endDate.split("-")[2]) : null;
  return `${MONTHS[m - 1]} ${d}${end ? `–${end}` : ""}`;
}

function where(item: CommunityItem) {
  if (item.online) return "Online";
  return [item.venue, item.city].filter(Boolean).join(", ") || "To be announced";
}

function blurb(item: CommunityItem) {
  return item.summary ?? `${KIND_LABEL[item.kind]}${item.ours ? " hosted by Studio1" : " with the Studio1 team"}.`;
}

/** The event's photo, or a print-orange cover with its name when there is none. */
function Cover({ item, className }: { item: CommunityItem; className?: string }) {
  if (item.image) {
    return (
      <div className={cn("relative overflow-hidden bg-[#e6e1d9]", className)}>
        <Image src={item.image} alt={item.name} fill sizes="(min-width: 1024px) 400px, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
      </div>
    );
  }
  return (
    <div className={cn("relative isolate flex flex-col justify-between overflow-hidden p-3 text-white sm:p-4", className)} style={{ background: PRINT }}>
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18] mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
      {/* A big ring for depth, like a stage light */}
      <span aria-hidden className="absolute -right-10 -top-10 -z-10 size-28 rounded-full border-[10px] border-white/15" />
      <span className="text-[9.5px] font-medium uppercase tracking-[0.2em] text-white/80">{KIND_LABEL[item.kind]}</span>
      <span className="line-clamp-2 max-w-[95%] font-medium leading-[1.05] tracking-[-0.03em]">
        {item.name}
      </span>
    </div>
  );
}

function Wrap({ item, className, children }: { item: CommunityItem; className?: string; children: ReactNode }) {
  if (!item.href) return <div className={className}>{children}</div>;
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
  ) : (
    <Link href={item.href} className={className}>{children}</Link>
  );
}

function ListRow({ item }: { item: CommunityItem }) {
  return (
    <Wrap item={item} className="group flex items-center gap-4 rounded-[6px] bg-white/80 p-3 ring-1 ring-inset ring-[#141414]/10 transition-[background-color,box-shadow] duration-300 hover:bg-white hover:shadow-[0_18px_34px_-26px_rgba(20,20,20,0.45)] sm:gap-6 sm:p-4">
      <Cover item={item} className="aspect-[3/2] w-[104px] shrink-0 rounded-[4px] sm:w-[168px] [&>span:last-child]:text-[15px] sm:[&>span:last-child]:text-[19px]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11.5px] font-medium uppercase tracking-[0.16em] text-[#141414]/50">
          {where(item)} <span style={{ color: PRINT }}>//</span> {when(item)}
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-[18px] font-medium leading-[1.2] tracking-[-0.03em] sm:text-[22px]">{item.name}</h3>
        <p className="mt-1.5 hidden truncate text-[14.5px] text-[#141414]/55 md:block">{blurb(item)}</p>
      </div>
      <span className="hidden shrink-0 items-center gap-2 text-[14px] font-medium sm:flex">
        {item.cta}
        <span className="flex size-8 items-center justify-center rounded-full bg-[#141414] text-white transition-[transform,background-color] duration-300 group-hover:rotate-45 group-hover:bg-[#f97316]">
          <ArrowUpRight weight="bold" className="size-3.5" />
        </span>
      </span>
    </Wrap>
  );
}

/** Upcoming events, one after another, each linking to its page. */
export function UpcomingEvents({ items, heading }: { items: CommunityItem[]; heading: ReactNode }) {
  const reduce = !!useReducedMotion();
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        {heading}
        <Link href="/events" className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-medium ring-1 ring-inset ring-[#141414] transition-colors hover:bg-[#141414] hover:text-white">
          Check out all events <ArrowUpRight weight="bold" className="size-4" />
        </Link>
      </div>
      <ul className="mt-10 flex flex-col gap-3">
        {items.map((item, i) => (
          <motion.li
            key={item.id}
            className="min-w-0"
            initial={reduce ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 1, ease: EASE, delay: Math.min(i, 5) * 0.1 }}
          >
            <ListRow item={item} />
          </motion.li>
        ))}
      </ul>
    </>
  );
}

/**
 * A pill along the bottom of the screen when registrations are open for a
 * coming event, linking straight to them. Dismissed for the visit.
 */
export function RegistrationBar({ item }: { item: CommunityItem | null }) {
  const reduce = !!useReducedMotion();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!item) return;
    try {
      if (sessionStorage.getItem(`s1-reg-${item.id}`)) return;
    } catch {}
    const t = window.setTimeout(() => setOpen(true), 1800);
    return () => window.clearTimeout(t);
  }, [item]);
  if (!item?.href) return null;
  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(`s1-reg-${item.id}`, "1");
    } catch {}
  };
  const external = item.external;
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="status"
          className="fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4"
          initial={reduce ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="flex max-w-full items-center gap-3 rounded-full py-2 pl-5 pr-2 text-white shadow-[0_18px_40px_-16px_rgba(194,65,12,0.7)]" style={{ background: PRINT }}>
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/80 motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-white" />
            </span>
            <p className="min-w-0 truncate text-[14px] font-medium">Registrations for {item.name} are live</p>
            {external ? (
              <a href={item.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-[13.5px] font-medium text-[#141414] transition-colors hover:bg-[#141414] hover:text-white">
                Register <ArrowUpRight weight="bold" className="size-3.5" />
              </a>
            ) : (
              <Link href={item.href} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-[13.5px] font-medium text-[#141414] transition-colors hover:bg-[#141414] hover:text-white">
                Register <ArrowUpRight weight="bold" className="size-3.5" />
              </Link>
            )}
            <button type="button" onClick={close} aria-label="Dismiss" className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white">
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
