"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowUpRight,
  Package,
  type Icon,
} from "@phosphor-icons/react";
import { EASE } from "@/components/home/ui";
import {
  PaperEyebrow,
  PaperPageHeader,
} from "@/components/paper/paper-page-header";
import { GlassTab, Icon3D } from "@/components/about-us/hero-arrows";
import { INK, PAPER, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

export type ServiceHeroStat = { value: string; label: string };
export type ServiceHeroDecor = {
  tiles: Icon[];
  tabs: { icon: Icon; label: string }[];
};

/**
 * Service page hero on the paper sheet (cream, grain, ink type, print
 * orange); all copy comes from the page. Kept under its old name so every
 * service hero picks it up unchanged.
 */
export function ServiceNightHero({
  badge,
  titleAccent,
  titleRest,
  description,
  primaryCta,
  secondaryCta,
  stats = [],
  decor,
}: {
  badge: string;
  titleAccent: string;
  titleRest: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  stats?: ServiceHeroStat[];
  /** Two 3D icon tiles and up to four glass tabs flanking the headline. */
  decor?: ServiceHeroDecor;
}) {
  const reduceMotion = useReducedMotion();
  const enter = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1, ease: EASE, delay },
  });

  return (
    <PaperPageHeader className="scroll-mt-28 pb-16 pt-36 md:pb-24 md:pt-44">
      {/* Faint ruled lines behind the headline, like the sheet underneath */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(to_bottom,rgba(20,20,20,0.06)_1px,transparent_1px)] [background-size:100%_48px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_70%,transparent)]"
      />

      {/* Mirrored decorations (lg+): a 3D tile and two glass tabs per side */}
      {decor ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-[1] mx-auto hidden max-w-[1440px] lg:block"
        >
          {[
            {
              kind: "tile",
              n: 0,
              spot: "left-[7%] top-[20%] w-14 -rotate-[8deg]",
            },
            { kind: "tab", n: 0, spot: "left-[13%] top-[40%] rotate-[4deg]" },
            { kind: "tab", n: 1, spot: "left-[3%] top-[62%] -rotate-[5deg]" },
            {
              kind: "tile",
              n: 1,
              spot: "right-[4%] top-[46%] w-12 rotate-[9deg]",
            },
            { kind: "tab", n: 2, spot: "right-[10%] top-[18%] -rotate-[4deg]" },
            { kind: "tab", n: 3, spot: "right-[12%] top-[66%] rotate-[3deg]" },
          ].map((item, k) => {
            const tab = decor.tabs[item.n];
            const tile = decor.tiles[item.n];
            if (item.kind === "tab" && !tab) return null;
            if (item.kind === "tile" && !tile) return null;
            return (
              <motion.div
                key={k}
                className={cn("absolute", item.spot)}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: EASE, delay: 0.4 + k * 0.12 }}
              >
                {item.kind === "tile" ? (
                  <Icon3D icon={tile} className="w-full" />
                ) : (
                  <GlassTab
                    icon={tab.icon}
                    label={tab.label}
                    ink={item.n % 2 === 0}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      ) : null}

      <div
        id="overview"
        className="mx-auto flex max-w-[1300px] flex-col items-center px-4 text-center sm:px-6 lg:px-8"
      >
        <motion.div {...enter(0)}>
          <PaperEyebrow icon={<Package weight="duotone" className="size-4" />}>
            {badge}
          </PaperEyebrow>
        </motion.div>

        <motion.h1
          {...enter(0.1)}
          className="mt-7 max-w-[980px] text-balance text-[40px] font-medium leading-[1.04] tracking-[-0.055em] sm:text-[60px] lg:text-[76px]"
        >
          <span>
            <span style={{ color: PRINT }}>{titleAccent}</span>
          </span>{" "}
          {titleRest}
        </motion.h1>

        <motion.p
          {...enter(0.2)}
          className="mt-6 max-w-[640px] text-balance text-[16px] leading-[1.6] text-[#141414]/65 sm:text-[18px]"
        >
          {description}
        </motion.p>

        <motion.div
          {...enter(0.3)}
          className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row sm:gap-7"
        >
          <a
            href="https://cal.com/studio1/collab"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex h-12 items-center gap-3 whitespace-nowrap rounded-full py-1.5 pl-6 pr-1.5 text-[15px] font-medium shadow-[0_14px_30px_-16px_rgba(20,20,20,0.6)] transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
            style={{ background: INK, color: PAPER }}
          >
            {primaryCta}
            <span
              className="flex size-9 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45"
              style={{ background: PRINT }}
            >
              <ArrowUpRight weight="bold" className="size-4" />
            </span>
          </a>
          <a
            href="#work"
            className="group inline-flex items-center gap-1.5 text-[15px] font-medium underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]"
          >
            {secondaryCta}
            <ArrowDown
              weight="bold"
              className="size-4 transition-transform duration-300 group-hover:translate-y-0.5"
            />
          </a>
        </motion.div>

        {stats.length ? (
          <motion.ul
            {...enter(0.45)}
            role="list"
            className={cn(
              "mt-14 grid w-full max-w-[1000px] gap-2 md:mt-20",
              stats.length === 3 ? "grid-cols-3" : "grid-cols-2",
              stats.length >= 4 && "lg:grid-cols-4",
            )}
          >
            {stats.map((stat, index) => (
              <li
                key={stat.label}
                className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-[6px] bg-white/80 px-3 py-5 ring-1 ring-inset ring-[#141414]/10 md:px-6 md:py-8"
              >
                <span
                  className="whitespace-nowrap text-[24px] font-medium leading-none tabular-nums tracking-[-0.05em] sm:text-[34px] md:text-[42px]"
                  style={index === 0 ? { color: PRINT } : undefined}
                >
                  {stat.value}
                </span>
                <span className="text-center text-[12px] leading-snug text-[#141414]/60 md:text-[13px]">
                  {stat.label}
                </span>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </div>
    </PaperPageHeader>
  );
}
