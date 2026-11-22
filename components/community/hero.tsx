"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { EASE } from "@/components/home/ui";
import type { CommunityItem } from "@/lib/community";
import { DiscordIcon } from "@/components/community/discord-icon";
import { DISCORD_URL, LUMA_URL } from "@/components/community/join";
import { LumaLogo } from "@/components/community/luma-logo";
import { PRINT } from "@/lib/paper";

/*
 * The community hero, cinematic: the KubeCon India main hall edge to edge in
 * a rounded frame, the line centred in white over it, and the numbers along
 * the bottom edge. The photo settles in with a slow zoom, then drifts as the
 * page scrolls.
 */

type Totals = { events: number; cities: number; meetups: number; hackathons: number };

export function CommunityHero({ totals }: { totals: Totals; next?: CommunityItem[] }) {
  const reduce = !!useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start start", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const enter = (delay: number) =>
    ({
      initial: reduce ? false : { opacity: 0, y: 18, filter: "blur(8px)" },
      animate: { opacity: 1, y: 0, filter: "blur(0px)" },
      transition: { duration: 1, ease: EASE, delay },
    }) as const;

  const stats: [string, string][] = [
    [`${totals.events}+`, "events"],
    [String(totals.cities), "cities"],
    [String(totals.hackathons), "hackathons"],
    [String(totals.meetups), "meetups"],
  ];

  return (
    <section className="px-3 pb-6 pt-[76px] md:px-4 md:pt-[84px]">
      <div
        ref={frame}
        className="relative isolate flex min-h-[calc(100svh-96px)] flex-col overflow-hidden rounded-[18px] bg-[#141414] text-white md:min-h-[calc(100svh-104px)] md:rounded-[22px]"
      >
        {/* the photo: a slow zoom in, then a drift with the scroll */}
        <motion.div style={reduce ? undefined : { y: drift }} className="absolute inset-[-6%] -z-20">
          <motion.div
            className="absolute inset-0"
            initial={reduce ? false : { scale: 1.14 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image
              src="/assets/events/kubecon-india-2026/01.webp"
              alt="The main hall at KubeCon India 2026"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            {/* a blurred copy over the middle, so the stage screen softens behind the words */}
            <Image
              src="/assets/events/kubecon-india-2026/01.webp"
              alt=""
              aria-hidden
              fill
              sizes="100vw"
              className="object-cover blur-[18px] [mask-image:linear-gradient(to_bottom,transparent_8%,black_30%,black_68%,transparent_88%)]"
            />
          </motion.div>
        </motion.div>
        {/* shade, so the words read: darker at the top and the foot, soft in the middle */}
        <span aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(10,10,10,0.72)_0%,rgba(10,10,10,0.38)_40%,rgba(10,10,10,0.45)_65%,rgba(10,10,10,0.85)_100%)]" />
        
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-16 text-center md:py-20">

          <motion.h1 {...enter(0.35)} className="text-[clamp(28px,8.6vw,34px)] font-medium leading-[1.06] tracking-[-0.045em] sm:text-[52px] lg:text-[68px]">
            <span className="block whitespace-nowrap">Where developers</span>
            <span className="block whitespace-nowrap">
            <span className="relative inline-block" style={{ color: PRINT }}>
              show up
              {/* a hand-drawn underline */}
              <svg aria-hidden viewBox="0 0 300 20" preserveAspectRatio="none" className="absolute -bottom-[0.12em] left-0 h-[0.16em] w-full">
                <motion.path
                  d="M3 13 C 60 5, 130 4, 200 9 S 280 14, 297 7"
                  fill="none"
                  stroke={PRINT}
                  strokeWidth="5"
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, ease: EASE, delay: 1.1 }}
                />
              </svg>
            </span>{" "}
            and build.
            </span>
          </motion.h1>

          <motion.p {...enter(0.5)} className="mt-6 max-w-[440px] text-[16px] leading-[1.6] text-white/75 md:text-[18px]">
            Meetups, hackathons and the people who build at them, in {totals.cities} cities and online.
          </motion.p>

          <motion.div {...enter(0.65)} className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] sm:h-12 sm:px-6 sm:text-[14.5px] font-medium text-[#141414] transition-colors duration-300 hover:bg-[#f4efe7]">
              <DiscordIcon className="size-4 text-[#5865F2]" /> Join the Discord
            </a>
            <a href={LUMA_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white/10 px-5 text-[14px] sm:h-12 sm:px-6 sm:text-[14.5px] font-medium ring-1 ring-inset ring-white/30 backdrop-blur-md transition-colors duration-300 hover:bg-white/20">
              Follow on <LumaLogo className="h-[14px] w-auto -translate-y-px" />
            </a>
          </motion.div>
        </div>

        {/* the numbers, along the bottom edge */}
        <motion.div {...enter(0.85)} className="border-t border-white/15 px-6 py-5 md:px-9">
          <div className="flex justify-center md:justify-start">
            <dl className="grid grid-cols-4 gap-4 md:flex md:gap-10">
              {stats.map(([v, l]) => (
                <div key={l} className="flex flex-col md:flex-row md:items-baseline md:gap-2">
                  <dd className="text-[26px] font-medium leading-none tracking-[-0.04em] md:text-[28px]">{v}</dd>
                  <dt className="mt-1 text-[12.5px] text-white/60 md:mt-0 md:text-[13.5px]">{l}</dt>
                </div>
              ))}
            </dl>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
