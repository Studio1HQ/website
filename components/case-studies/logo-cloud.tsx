"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type CloudLogo = {
  slug: string;
  client: string;
  logo: StaticImageData;
};

/**
 * Laid out on a 1000 x 520 board: centre and diameter of each logo. A
 * `glide` logo slides in beside the one before it, and their white rims
 * melt into one shape as it lands.
 */
type Spot = { slug: string; x: number; y: number; size: number; glide?: true };
const SPOTS: Spot[] = [
  { slug: "memori", x: 230, y: 265, size: 112 },
  { slug: "nebius", x: 320, y: 168, size: 88, glide: true },
  { slug: "litellm", x: 150, y: 70, size: 70 },
  { slug: "brightdata", x: 560, y: 105, size: 88 },
  { slug: "permit", x: 649, y: 170, size: 70, glide: true },
  { slug: "scrapegraph", x: 480, y: 335, size: 112 },
  { slug: "ittybit", x: 585, y: 399, size: 70, glide: true },
  { slug: "entelligence-ai", x: 360, y: 430, size: 70 },
  { slug: "openlore", x: 800, y: 75, size: 88 },
  { slug: "tensorlake", x: 886, y: 145, size: 70, glide: true },
  { slug: "jozu", x: 790, y: 325, size: 88 },
  { slug: "corsair", x: 905, y: 430, size: 70 },
  { slug: "webcrumbs", x: 115, y: 420, size: 70 },
];
/** Marks drawn edge to edge in their square; shown a little smaller. */
const INSET: Record<string, { scale: number; bg: string }> = {
  openlore: { scale: 0.8, bg: "#574191" },
};
/** The white rim round each logo, on the 1000-wide board. */
const RIM = 14;

const pctX = (n: number) => `${(n / 10).toFixed(2)}%`;
const pctY = (n: number) => `${(n / 5.2).toFixed(2)}%`;

/** Places a piece on the board; pieces pop in one after another. */
function Piece({
  x,
  y,
  size,
  index,
  from,
  children,
  className,
}: {
  x: number;
  y: number;
  size: number;
  index: number;
  /** Start this far away (in % of the piece) and glide into place. */
  from?: { x: number; y: number };
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: pctX(x), top: pctY(y), width: pctX(size) }}
    >
      <motion.div
        className={cn("will-change-[transform,opacity]", className)}
        initial={
          reduceMotion
            ? false
            : {
                opacity: 0,
                scale: 0.85,
                x: `${from?.x ?? 0}%`,
                y: `${from?.y ?? 0}%`,
              }
        }
        whileInView={{ opacity: 1, scale: 1, x: "0%", y: "0%" }}
        viewport={{ once: true, margin: "-80px" }}
        // A long, soft ease: no bounce, so the joins settle calmly
        transition={{
          duration: 1.2,
          ease: [0.22, 1, 0.36, 1],
          delay: 0.1 + index * 0.07,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * The clients as a cluster of round logos in white rims. They pop
 * in one after another; paired logos glide together and their rims melt
 * into one, like liquid.
 */
export function LogoCloud({ logos }: { logos: CloudLogo[] }) {
  const reduceMotion = useReducedMotion();
  const bySlug = new Map(logos.map((logo) => [logo.slug, logo]));
  const spots = SPOTS.filter((spot) => bySlug.has(spot.slug));
  const [joining, setJoining] = useState(false);
  // A gliding logo comes in from beyond, away from its partner
  const arrival = spots.map((spot, i) => {
    const prev = spots[i - 1];
    if (!spot.glide || !prev) return undefined;
    const dx = spot.x - prev.x;
    const dy = spot.y - prev.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: (dx / length) * 35, y: (dy / length) * 35 };
  });

  return (
    <div className="relative mx-auto w-full max-w-[1040px]">
      <svg aria-hidden className="absolute size-0">
        <defs>
          <filter id="cloud-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
            />
          </filter>
        </defs>
      </svg>

      {/* Tablet and up: the cluster */}
      <div className="relative hidden aspect-[1000/520] w-full md:block">
        {/* White rims; partners share the filter and melt together */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            filter:
              "url(#cloud-goo) drop-shadow(0 0 0.5px rgba(20,20,20,0.3)) drop-shadow(0 12px 18px rgba(20,20,20,0.08))",
          }}
        >
          {spots.map((spot, i) => (
            <Piece
              key={spot.slug}
              {...spot}
              size={spot.size + RIM * 2}
              index={i}
              from={arrival[i]}
            >
              <span className="block aspect-square rounded-full bg-white" />
            </Piece>
          ))}
        </div>

        {/* The exact logos, crisp on top */}
        {spots.map((spot, i) => {
          const item = bySlug.get(spot.slug)!;
          const inset = INSET[spot.slug];
          return (
            <Piece
              key={spot.slug}
              {...spot}
              index={i}
              from={arrival[i]}
              className="group"
            >
              <Link
                href={`/case-studies/${item.slug}`}
                aria-label={`${item.client} case study`}
                className="relative block aspect-square overflow-hidden rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(20,20,20,0.05)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.05]"
                style={inset ? { background: inset.bg } : undefined}
              >
                <Image
                  src={item.logo}
                  alt=""
                  fill
                  sizes="112px"
                  className="object-cover"
                  style={
                    inset ? { transform: `scale(${inset.scale})` } : undefined
                  }
                />
              </Link>
              <span className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-[#141414] px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-[0_8px_18px_-8px_rgba(20,20,20,0.6)] transition-[opacity,transform] duration-300 group-hover:-translate-y-[calc(100%+4px)] group-hover:opacity-100">
                {item.client}
              </span>
            </Piece>
          );
        })}
      </div>

      {/* Phones: the same white rims, wrapped at a readable size */}
      <ul className="flex flex-wrap justify-center gap-3 md:hidden">
        {spots.map((spot, i) => {
          const item = bySlug.get(spot.slug)!;
          const inset = INSET[spot.slug];
          return (
            <motion.li
              key={spot.slug}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.9,
                ease: [0.22, 1, 0.36, 1],
                delay: i * 0.05,
              }}
            >
              <Link
                href={`/case-studies/${item.slug}`}
                aria-label={`${item.client} case study`}
                className="block size-[68px] rounded-full bg-white p-[6px] shadow-[0_12px_22px_-14px_rgba(20,20,20,0.35)] ring-1 ring-inset ring-[#141414]/[0.07]"
              >
                <span
                  className="relative block size-full overflow-hidden rounded-full bg-white"
                  style={inset ? { background: inset.bg } : undefined}
                >
                  <Image
                    src={item.logo}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                    style={
                      inset ? { transform: `scale(${inset.scale})` } : undefined
                    }
                  />
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ul>

      {/* Caption, and the way in for the next company */}
      <div className="mt-8 flex flex-col items-center gap-4 text-center md:mt-4">
        <p className="text-[13.5px] text-[#141414]/60 sm:text-[14.5px]">
          <span className="font-medium text-[#141414]">
            {spots.length} case studies
          </span>{" "}
          from the 35+ devtool and AI teams Studio1 has worked with.
        </p>
        <a
          href="https://cal.com/studio1/collab"
          target="_blank"
          rel="noopener noreferrer"
          onPointerEnter={() => setJoining(true)}
          onPointerLeave={() => setJoining(false)}
          onFocus={() => setJoining(true)}
          onBlur={() => setJoining(false)}
          className="group/cta inline-flex items-center gap-2.5 rounded-full bg-[#141414] py-1.5 pl-1.5 pr-4 text-[13px] font-medium text-white shadow-[0_14px_28px_-16px_rgba(20,20,20,0.7)] transition-colors hover:bg-[#262626]"
        >
          {/* Your seat and Studio1 slide together until they overlap */}
          <motion.span
            className="relative flex h-7 items-center"
            animate={{ width: joining ? 46 : 28 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <span className="relative z-[1] flex size-7 items-center justify-center rounded-full border border-dashed border-white/45 bg-[#141414]">
              <Plus weight="bold" className="size-3" />
            </span>
            <motion.span
              aria-hidden
              className="absolute left-0 z-[2] flex size-7 items-center justify-center rounded-full bg-white shadow-[0_0_0_2px_#141414]"
              initial={false}
              animate={
                joining
                  ? { x: 18, opacity: 1, scale: 1 }
                  : { x: reduceMotion ? 18 : 30, opacity: 0, scale: 0.6 }
              }
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <Image
                src="/assets/site/studio1-logo.svg"
                alt=""
                width={16}
                height={16}
                unoptimized
                className="size-4"
              />
            </motion.span>
          </motion.span>
          Your company next
          <ArrowUpRight
            weight="bold"
            className="size-3.5 transition-transform duration-300 group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5"
          />
        </a>
      </div>
    </div>
  );
}
