"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, Code, Package, PenNib } from "@phosphor-icons/react";
import { EASE, GlassIcon, PillLink } from "@/components/home/ui";
import { NightEyebrow, NightHeader } from "@/components/shared/night-header";
import { Num } from "@/components/ui/num";
import { cn } from "@/lib/utils";

export type ServiceHeroStat = { value: string; label: string };

/** Service page hero in the homepage's night style; all copy comes from the page. */
export function ServiceNightHero({
  badge,
  titleAccent,
  titleRest,
  description,
  primaryCta,
  secondaryCta,
  stats = [],
}: {
  badge: string;
  titleAccent: string;
  titleRest: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  stats?: ServiceHeroStat[];
}) {
  const reduceMotion = useReducedMotion();
  const enter = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1, ease: EASE, delay },
  });

  return (
    <NightHeader className="scroll-mt-28 pb-20 pt-40 md:pb-28 md:pt-48">
      {/* Floating icon tiles flanking the headline (lg+), as before */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 mx-auto hidden h-full w-full max-w-7xl px-4 lg:block">
        {[
          { icon: <Code weight="bold" />, className: "left-[3rem] top-[13rem] xl:left-[5rem]", delay: 0 },
          { icon: <PenNib weight="bold" />, className: "right-[3rem] top-[15rem] xl:right-[5rem]", delay: 1.2 },
        ].map((tile, index) => (
          <motion.div
            key={index}
            className={cn("absolute", tile.className)}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: [0, -12, 0] }}
            transition={{
              opacity: { duration: 0.8, delay: 0.4 },
              scale: { duration: 0.8, ease: EASE, delay: 0.4 },
              y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: tile.delay },
            }}
          >
            <GlassIcon className="size-14 text-white">{tile.icon}</GlassIcon>
          </motion.div>
        ))}
      </div>

      <div id="overview" className="mx-auto flex max-w-[1300px] flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        <motion.div {...enter(0)}>
          <NightEyebrow icon={<Package weight="duotone" className="size-4 text-[#fdba74]" />}>
            {badge}
          </NightEyebrow>
        </motion.div>

        <motion.h1
          {...enter(0.1)}
          className="mt-7 max-w-[1000px] text-[42px] font-medium leading-[1.04] tracking-[-0.05em] sm:text-[60px] lg:text-[76px]"
        >
          <span className="s1-accent-text">{titleAccent}</span> {titleRest}
        </motion.h1>

        <motion.p
          {...enter(0.2)}
          className="mt-6 max-w-[640px] text-balance text-[16px] leading-[1.6] text-white/60 sm:text-[18px]"
        >
          {description}
        </motion.p>

        <motion.div {...enter(0.3)} className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">
          <PillLink href="https://cal.com/studio1/collab" tone="brand" external>
            {primaryCta}
          </PillLink>
          <a
            href="#work"
            className="s1-glass-btn-light group inline-flex h-12 items-center gap-2 rounded-full px-6 text-[13px] font-medium uppercase tracking-[0.06em] text-white"
          >
            {secondaryCta}
            <ArrowDown weight="bold" className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" />
          </a>
        </motion.div>

        {stats.length ? (
          <motion.ul
            {...enter(0.45)}
            role="list"
            className={cn(
              "mt-14 grid w-full max-w-[1000px] gap-px overflow-hidden rounded-[22px] bg-white/10 shadow-[0_50px_120px_-40px_rgba(40,10,0,0.75)] ring-1 ring-white/10 md:mt-20",
              stats.length === 3 ? "grid-cols-3" : "grid-cols-2",
              stats.length >= 4 && "lg:grid-cols-4",
            )}
          >
            {stats.map((stat) => (
              <li key={stat.label} className="flex flex-col items-center justify-center gap-1.5 bg-[#0c0807] px-3 py-5 md:px-6 md:py-8">
                <Num className="text-[26px] font-medium leading-none tracking-[-0.04em] text-white sm:text-[34px] md:text-[42px]">
                  {stat.value}
                </Num>
                <span className="text-center text-[12px] leading-snug text-white/55 md:text-[13px]">{stat.label}</span>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </div>
    </NightHeader>
  );
}
