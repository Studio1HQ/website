"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Broadcast, Code, MicrophoneStage, UsersThree, Wrench, type Icon } from "@phosphor-icons/react";
import Logo from "@/components/ui/svgs/logo";
import { SketchDesk } from "@/components/community/sketch-desk";
import { EventTicket } from "@/components/community/ticket";
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
      <span className="max-w-[95%] font-medium leading-[1.1] tracking-[-0.02em]">
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

const KIND_ICON: Record<CommunityKind, Icon> = {
  meetup: UsersThree,
  hackathon: Code,
  workshop: Wrench,
  conference: MicrophoneStage,
  online: Broadcast,
};

/** A tall card: badge, title, tags, when and where, the photo, then the action. */
function EventCard({ item }: { item: CommunityItem }) {
  const KindIcon = KIND_ICON[item.kind];
  const [, m, d] = item.date.split("-").map(Number);
  return (
    <Wrap
      item={item}
      className="group flex h-full flex-col rounded-[14px] bg-white/85 p-4 ring-1 ring-inset ring-[#141414]/[0.09] transition-[background-color,box-shadow] duration-300 hover:bg-white hover:ring-[#141414]/20"
    >
      {/* the event's mark, or its type, beside the date */}
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-11 items-center justify-center rounded-[10px] bg-white ring-1 ring-inset ring-[#141414]/[0.1]">
          <KindIcon weight="regular" className="size-5" style={{ color: PRINT }} />
        </span>
        <span className="flex w-11 flex-col items-center overflow-hidden rounded-[8px] ring-1 ring-inset ring-[#141414]/[0.1]">
          <span className="w-full py-0.5 text-center text-[9.5px] font-semibold uppercase tracking-[0.12em] text-white" style={{ background: PRINT }}>{MONTHS[m - 1]}</span>
          <span className="py-1 text-[16px] font-medium leading-none">{String(d).padStart(2, "0")}</span>
        </span>
      </div>

      <h3 className="mt-4 line-clamp-3 min-h-[3.6em] text-[19px] font-semibold leading-[1.2] tracking-[-0.02em]">{item.name}</h3>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-[#141414]/70 ring-1 ring-inset ring-[#141414]/[0.12]">
          <KindIcon weight="regular" className="size-3.5" style={{ color: PRINT }} />
          {KIND_LABEL[item.kind]}
        </span>
        <span className="rounded-full px-2.5 py-1 text-[12px] text-[#141414]/70 ring-1 ring-inset ring-[#141414]/[0.12]">{where(item)}</span>
      </div>

      {item.image ? (
        <Cover item={item} className="mt-4 aspect-[16/10] w-full rounded-[10px]" />
      ) : (
        /* no photo yet: a cover in the event's colour, sketch behind, its mark in white */
        <div
          className="relative isolate mt-4 flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-[10px]"
          style={{ background: `radial-gradient(120% 90% at 20% 10%, ${item.brand ?? PRINT}, color-mix(in oklab, ${item.brand ?? PRINT} 70%, #0b1020))` }}
        >
          <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.22] [filter:brightness(0)_invert(1)]">
            <SketchDesk className="absolute inset-0 size-full" />
          </span>
          <span aria-hidden className="absolute -right-10 -top-10 size-36 rounded-full border-[14px] border-white/10" />
          <span className="absolute bottom-2.5 left-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/80">{KIND_LABEL[item.kind]}</span>
        </div>
      )}

      {item.summary ? <p className="mt-3 line-clamp-2 text-[13.5px] leading-[1.5] text-[#141414]/55">{item.summary}</p> : null}

      <div className="mt-auto flex items-center justify-between pt-4 text-[14px]">
        <span className="font-medium">{item.cta}</span>
        <span className="flex size-9 items-center justify-center rounded-full bg-white text-[#141414] ring-1 ring-inset ring-[#141414]/[0.15] transition-[transform,background-color,color] duration-300 group-hover:rotate-45 group-hover:bg-[#f97316] group-hover:text-white group-hover:ring-[#f97316]">
          <ArrowUpRight weight="bold" className="size-4" />
        </span>
      </div>
    </Wrap>
  );
}

/** One or two events: a compact row each. */
function ListRow({ item }: { item: CommunityItem }) {
  const [, m, d] = item.date.split("-").map(Number);
  const KindIcon = KIND_ICON[item.kind];
  const line =
    item.summary ??
    (item.kind === "hackathon"
      ? "A build weekend with the teams behind the tools."
      : item.kind === "meetup"
        ? "Talks, demos and the people building in your city."
        : `Find the Studio1 team at ${item.name.replace(/ \d{4}.*$/, "")}.`);
  return (
    <Wrap
      item={item}
      className="group flex items-center gap-5 rounded-[10px] bg-white/85 p-3 pr-5 ring-1 ring-inset ring-[#141414]/[0.09] transition-[background-color,box-shadow] duration-300 hover:bg-white hover:ring-[#141414]/20 sm:gap-7 sm:p-4 sm:pr-7"
    >
      {item.logo ? (
        /* the event's own mark */
        <span className="flex size-[76px] shrink-0 items-center justify-center rounded-[8px] bg-white ring-1 ring-inset ring-[#141414]/[0.1] sm:size-[92px]">
          <span
            aria-hidden
            className="block size-[46px] sm:size-[54px]"
            style={{
              backgroundColor: item.brand ?? "#141414",
              WebkitMask: `url(${item.logo}) center / contain no-repeat`,
              mask: `url(${item.logo}) center / contain no-repeat`,
            }}
          />
        </span>
      ) : item.image ? (
        <Cover item={item} className="aspect-[4/3] w-[96px] shrink-0 rounded-[6px] sm:w-[168px]" />
      ) : (
        /* no mark or photo: a calendar tile */
        <span className="flex w-[76px] shrink-0 flex-col items-center overflow-hidden rounded-[8px] bg-white ring-1 ring-inset ring-[#141414]/[0.1] sm:w-[92px]">
          <span className="w-full py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white" style={{ background: PRINT }}>
            {MONTHS[m - 1]}
          </span>
          <span className="py-2.5 text-[30px] font-medium leading-none tracking-[-0.04em] sm:text-[36px]">{String(d).padStart(2, "0")}</span>
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-3 text-[12.5px] font-medium text-[#141414]/80 ring-1 ring-inset ring-[#141414]/[0.12]">
            <KindIcon weight="regular" className="size-3.5" style={{ color: PRINT }} />
            {KIND_LABEL[item.kind]}
          </span>
          <span className="inline-flex h-7 items-center rounded-full bg-[#f97316]/10 px-3 text-[12.5px] font-medium text-[#c2410c] ring-1 ring-inset ring-[#f97316]/25">
            {when(item)}
          </span>
          <span className="inline-flex h-7 items-center rounded-full bg-white px-3 text-[12.5px] font-medium text-[#141414]/70 ring-1 ring-inset ring-[#141414]/[0.12]">
            {where(item)}
          </span>
        </p>
        <h3 className="mt-2.5 line-clamp-2 text-[19px] font-medium leading-[1.2] tracking-[-0.025em] sm:text-[23px]">{item.name}</h3>
        <p className="mt-1.5 hidden truncate text-[14.5px] text-[#141414]/55 sm:block">{line}</p>
      </div>
      <span className="hidden h-11 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-medium text-[#141414] ring-1 ring-inset ring-[#141414]/[0.15] transition-colors duration-300 group-hover:bg-[#f97316] group-hover:text-white group-hover:ring-[#f97316] sm:inline-flex">
        {item.cta}
        <ArrowUpRight weight="bold" className="size-4 transition-transform duration-300 group-hover:rotate-45" />
      </span>
    </Wrap>
  );
}

export function UpcomingEvents({
  items,
  heading,
  href,
  label,
  empty,
  ticket = false,
}: {
  items: CommunityItem[];
  heading: ReactNode;
  href: string;
  label: string;
  empty: ReactNode;
  /** Show the first event as a ticket with tear-off stubs. */
  ticket?: boolean;
}) {
  const reduce = !!useReducedMotion();
  // one or two events read better as wide cards; more go into the grid
  const wide = false;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        {heading}
        <Link href={href} className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-medium ring-1 ring-inset ring-[#141414] transition-colors hover:bg-[#141414] hover:text-white">
          {label} <ArrowUpRight weight="bold" className="size-4" />
        </Link>
      </div>
      {ticket && items.length ? (
        <div className="mt-10">
          <EventTicket item={items[0]} />
        </div>
      ) : items.length ? (
        <ul className={wide ? "mt-10 flex flex-col gap-3" : "mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"}>
          {items.map((item, i) => (
            <motion.li
              key={item.id}
              className="min-w-0 h-full"
              initial={reduce ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 1, ease: EASE, delay: Math.min(i, 5) * 0.1 }}
            >
              {wide ? <ListRow item={item} /> : <EventCard item={item} />}
            </motion.li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-[6px] bg-white/80 p-6 ring-1 ring-inset ring-[#141414]/10 sm:flex-row sm:items-center md:p-8">
          {empty}
        </div>
      )}
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
    const t = window.setTimeout(() => setOpen(true), 1600);
    return () => window.clearTimeout(t);
  }, [item]);
  if (!item?.href) return null;
  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(`s1-reg-${item.id}`, "1");
    } catch {}
  };
  const live = item.cta === "Register";
  const action = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[6px] bg-white px-4 text-[13.5px] font-semibold text-[#141414] transition-colors duration-300 hover:bg-[#141414] hover:text-white";
  const label = (
    <>
      {live ? "Register" : "Details"}
    </>
  );
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-3 sm:bottom-6"
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 16, scale: 0.98, filter: "blur(8px)" }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <div
            className="pointer-events-auto relative isolate flex w-full max-w-[680px] items-center gap-3 overflow-hidden rounded-[8px] py-2.5 pl-4 pr-2.5 text-white shadow-[0_22px_48px_-18px_rgba(194,65,12,0.65)] sm:w-auto sm:pl-5"
            style={{ background: PRINT }}
          >
            <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.16] mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
            <Logo knockout className="pointer-events-none absolute -right-6 top-1/2 -z-10 size-28 -translate-y-1/2 rotate-[-8deg] opacity-[0.14] brightness-0 invert" />
            <p className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug sm:text-[14.5px]">
              {live ? `Registrations for ${item.name} are live!` : `Up next: ${item.name}`}
            </p>
            {item.external ? (
              <a href={item.href} target="_blank" rel="noopener noreferrer" className={action}>{label}</a>
            ) : (
              <Link href={item.href} className={action}>{label}</Link>
            )}
            <button type="button" onClick={close} aria-label="Dismiss" className="flex size-8 shrink-0 items-center justify-center rounded-[6px] text-white/85 transition-colors hover:bg-white/15 hover:text-white">
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
