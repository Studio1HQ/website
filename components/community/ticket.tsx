"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "@phosphor-icons/react";
import Logo from "@/components/ui/svgs/logo";
import { EASE } from "@/components/home/ui";
import type { CommunityItem } from "@/lib/community";
import { imageUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type Panel = {
  key: string;
  title: string;
  /** The strip's label when folded. */
  short: string;
  /** Under the title when open. */
  line: string;
  /** Short mark at the foot of the strip when closed. */
  stamp: string;
  bg: string;
  ink: string;
  cta: string;
  href: string;
  external: boolean;
  /** The event's own mark; Studio1's when it has none. */
  logo?: string;
  brand?: string;
  /** The event's own full-colour logo. */
  wordmark?: string;
  /** A meetup being planned: no date yet, stamped "Coming soon". */
  soon?: boolean;
};

/** Meetups being planned: strips that say "soon", never a date until announced. */
const SOON: Omit<Panel, "key">[] = [
  {
    title: "Kolkata meetup",
    short: "Kolkata meetup",
    line: "Coming soon. Get told the day it opens.",
    stamp: "Soon",
    bg: "#ef6a2c",
    ink: "#1d1d1b",
    cta: "Get notified",
    href: "#join",
    external: false,
  },
  {
    title: "Bengaluru builders night",
    short: "Bengaluru builders night",
    line: "Coming soon. Get told the day it opens.",
    stamp: "Soon",
    bg: "#a8c21a",
    ink: "#1d1d1b",
    cta: "Get notified",
    href: "#join",
    external: false,
  },
  {
    title: "Delhi NCR meetup",
    short: "Delhi NCR meetup",
    line: "Coming soon. Get told the day it opens.",
    stamp: "Soon",
    bg: "#c7b6e3",
    ink: "#1d1d1b",
    cta: "Get notified",
    href: "#join",
    external: false,
  },
];

function Go({
  p,
  className,
  children,
}: {
  p: Panel;
  className: string;
  children: ReactNode;
}) {
  if (p.external)
    return (
      <a
        href={p.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  if (p.href.startsWith("#"))
    return (
      <a href={p.href} className={className}>
        {children}
      </a>
    );
  return (
    <Link href={p.href} className={className}>
      {children}
    </Link>
  );
}

function Mark({ p, className }: { p: Panel; className: string }) {
  return p.logo ? (
    <span
      aria-hidden
      className={cn("block", className)}
      style={{
        backgroundColor: p.brand ?? "#141414",
        WebkitMask: `url(${p.logo}) center / contain no-repeat`,
        mask: `url(${p.logo}) center / contain no-repeat`,
      }}
    />
  ) : (
    // on a coloured coming-soon strip, Studio1's mark is printed in the strip's ink
    <Logo
      knockout={p.soon}
      className={cn("rounded-[6px]", p.soon && "brightness-0", className)}
    />
  );
}

/** The announced meetup as the ticket's first, paper-coloured panel. */
function eventPanel(item: CommunityItem): Panel {
  const [, m, d] = item.date.split("-").map(Number);
  const y = Number(item.date.slice(0, 4));
  return {
    key: item.id,
    title: item.name,
    short: item.name.replace(/ \d{4}.*$/, ""),
    line: `${MONTHS[m - 1]} ${d}, ${y} · ${item.online ? "Online" : item.city}`,
    stamp: `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`,
    bg: "#fbf9f5",
    ink: "#16213a",
    cta: item.cta === "Register" ? "Get your tickets here" : "See the details",
    href: item.href ?? "/events",
    external: item.external,
    logo: item.logo,
    brand: item.brand,
    wordmark: item.wordmark,
  };
}

/**
 * The next meetup as a ticket, with tear-off strips for the meetups coming
 * up. Hovering (or tapping) a strip opens it into the full ticket while the
 * others fold into strips, like an accordion. With no meetup announced, the
 * coming-soon strips are the whole ticket, the first one open.
 */
export function EventTicket({ item }: { item: CommunityItem | null }) {
  const reduce = !!useReducedMotion();
  const panels: Panel[] = [
    ...(item ? [eventPanel(item)] : []),
    ...SOON.map((s, i) => ({ ...s, key: `soon-${i}`, soon: true })),
  ];
  const [open, setOpen] = useState(0);
  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 170, damping: 26, mass: 0.9 };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: EASE }}
      className="flex h-[400px] w-full flex-col gap-0 sm:h-[340px] sm:flex-row md:h-[360px]"
      onMouseLeave={() => setOpen(0)}
    >
      {panels.map((p, i) => {
        const isOpen = open === i;
        return (
          <motion.div
            key={p.key}
            layout
            onMouseEnter={() => setOpen(i)}
            onFocus={() => setOpen(i)}
            onClick={() => setOpen(i)}
            animate={{ flexGrow: isOpen ? 1 : 0 }}
            transition={spring}
            className={cn(
              "relative isolate min-h-[64px] min-w-0 shrink-0 basis-[64px] overflow-hidden sm:min-h-0 sm:basis-[64px] md:basis-[72px]",
              i === 0
                ? "rounded-t-[18px] sm:rounded-l-[18px] sm:rounded-tr-none"
                : "",
              i === panels.length - 1
                ? "rounded-b-[18px] sm:rounded-r-[18px] sm:rounded-bl-none"
                : "",
              i === 0 && item && "ring-1 ring-inset ring-[#141414]/15",
              i === 0
                ? "s1-bite-r"
                : i === panels.length - 1
                  ? "s1-bite-l"
                  : "s1-bite-lr",
            )}
            style={{ background: p.bg, color: p.ink }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {isOpen ? (
                <motion.div
                  key="open"
                  initial={reduce ? false : { opacity: 0, x: 12 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { duration: 0.45, ease: EASE, delay: 0.12 },
                  }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  className="absolute inset-0 flex flex-col justify-between p-6 md:p-9"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <h3 className="max-w-[560px] text-[30px] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-[38px] md:text-[46px]">
                        {p.title}
                      </h3>
                      <p className="mt-3 flex items-center gap-2 text-[15px] font-medium opacity-75">
                        {p.wordmark ? null : <Mark p={p} className="size-5" />}
                        {p.line}
                      </p>
                    </div>
                    {p.wordmark ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl({ src: p.wordmark, width: 640 })}
                        alt=""
                        className="hidden h-[88px] w-auto shrink-0 sm:block md:h-[104px]"
                      />
                    ) : null}
                  </div>
                  <Go
                    p={p}
                    className="group/cta inline-flex h-11 w-fit items-center gap-2 border border-current bg-transparent px-4 text-[14px] font-medium transition-colors duration-300 hover:bg-[#141414] hover:text-white"
                  >
                    {p.cta}
                    <ArrowUpRight
                      weight="bold"
                      className="size-4 transition-transform duration-300 group-hover/cta:rotate-45"
                    />
                  </Go>
                  {p.soon ? (
                    <span
                      aria-hidden
                      className="absolute bottom-6 right-6 rotate-[-6deg] rounded-[6px] border-2 border-current px-3 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.2em] opacity-70 md:bottom-9 md:right-9 md:px-4 md:py-2 md:text-[14px]"
                    >
                      Coming soon
                    </span>
                  ) : null}
                </motion.div>
              ) : (
                <motion.div
                  key="closed"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: { duration: 0.35, delay: 0.15 },
                  }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="absolute inset-0 flex cursor-pointer items-center justify-between px-5 sm:flex-col sm:px-0 sm:py-5"
                >
                  <span className="truncate text-[15px] font-extrabold tracking-[-0.02em] sm:max-h-[82%] sm:[transform:rotate(180deg)] sm:text-[16px] sm:[writing-mode:vertical-rl]">
                    {p.short}
                  </span>
                  <span className="shrink-0 text-[12px] font-semibold tabular-nums opacity-80">
                    {p.stamp}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
