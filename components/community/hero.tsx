"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { Container, EASE } from "@/components/home/ui";
import type { CommunityItem } from "@/lib/community";
import { DiscordIcon } from "@/components/community/discord-icon";
import { DISCORD_URL, LUMA_URL } from "@/components/community/join";
import { LumaLogo } from "@/components/community/luma-logo";
import { SketchDesk } from "@/components/community/sketch-desk";
import { GRAIN, INK, PAPER, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/*
 * The community hero, set like an editorial cover: the line in huge
 * staggered capitals, with small photos from our events tucked into the
 * gaps between the words. Photos here are ones used nowhere else on the page.
 */

const P = (slug: string) => `/assets/events/${slug}/01.webp`;

type Totals = { events: number; cities: number; meetups: number; hackathons: number };

/** A small photo set into a line of the headline. */
function Shot({ src, alt, className, delay, reduce }: { src: string; alt: string; className?: string; delay: number; reduce: boolean }) {
  return (
    <motion.span
      className={cn("relative block shrink-0 overflow-hidden bg-[#e6e1d9]", className)}
      initial={reduce ? false : { opacity: 0, scale: 0.9, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 1, ease: EASE, delay }}
    >
      <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 160px, 22vw" className="object-cover" priority={delay < 0.6} />
    </motion.span>
  );
}

/** One line of the headline, rising in. */
function Line({ children, className, delay, reduce }: { children: React.ReactNode; className?: string; delay: number; reduce: boolean }) {
  return (
    <motion.div
      className={cn("flex items-center", className)}
      initial={reduce ? false : { opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

export function CommunityHero({ totals }: { totals: Totals; next?: CommunityItem[] }) {
  const reduce = !!useReducedMotion();
  const word = "font-semibold uppercase leading-[0.86] tracking-[-0.055em] text-[min(13.5vw,8.5svh)] sm:text-[min(11.5vw,10svh)] lg:text-[min(9.4vw,11.5svh)] 2xl:text-[min(148px,11.5svh)]";
  const shot = "h-[min(11vw,7svh)] w-[min(8.4vw,5.4svh)] sm:h-[min(9.5vw,8.2svh)] sm:w-[min(7.2vw,6.3svh)] lg:h-[min(7.6vw,9.4svh)] lg:w-[min(5.8vw,7.2svh)] 2xl:h-[min(118px,9.4svh)] 2xl:w-[min(92px,7.2svh)]";

  return (
    <section className="relative isolate overflow-hidden" style={{ background: PAPER, color: INK }}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
      {/* the pencil sketch, faint behind everything */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-[8] opacity-[0.14]">
        <SketchDesk className="absolute inset-0 size-full" />
      </div>

      <Container className="relative flex min-h-[100svh] flex-col justify-center pb-10 pt-24 md:pb-12 md:pt-28">
        <h1 className="sr-only">Where developers show up and build: the Studio1 community</h1>
        <div aria-hidden className="flex flex-col gap-[1.2vw] 2xl:gap-4">
          <Line delay={0.15} reduce={reduce} className="gap-[2vw]">
            <span className={word}>Where</span>
            <Shot src={P("blr-tech-week")} alt="" className={shot} delay={0.5} reduce={reduce} />
            <span className="flex-1" />
            <Shot src={P("hacktropica")} alt="" className={cn(shot, "hidden sm:block")} delay={0.6} reduce={reduce} />
          </Line>
          <Line delay={0.25} reduce={reduce} className="gap-[2vw]">
            <Shot src={P("agentsnexus")} alt="" className={shot} delay={0.7} reduce={reduce} />
            <span className={cn(word, "ml-auto sm:ml-[6vw]")}>Developers</span>
          </Line>
          <Line delay={0.35} reduce={reduce} className="gap-[2vw] sm:pl-[10vw]">
            <span className={word} style={{ color: PRINT }}>Show up</span>
            <Shot src={P("kubernetes-india-red-hat")} alt="" className={shot} delay={0.8} reduce={reduce} />
          </Line>
          <Line delay={0.45} reduce={reduce} className="gap-[2vw]">
            <Shot src={P("rejekts-na-2024")} alt="" className={cn(shot, "hidden sm:block")} delay={0.9} reduce={reduce} />
            <span className={cn(word, "ml-auto")}>And build.</span>
          </Line>
        </div>

        <motion.div
          className="mt-[4svh] flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.7 }}
        >
          <p className="max-w-[460px] text-[17px] leading-[1.55] text-[#141414]/65 md:text-[18px]">
            The Studio1 community: meetups, hackathons and the people who build at them, in {totals.cities} cities and online.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#141414] px-6 text-[14.5px] font-medium text-white transition-colors duration-300 hover:bg-[#f97316]">
              <DiscordIcon className="size-4" /> Join the Discord
            </a>
            <a href={LUMA_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-1.5 rounded-full bg-white px-6 text-[14.5px] font-medium ring-1 ring-inset ring-[#141414]/[0.12] transition-colors duration-300 hover:bg-[#f6f3ee]">
              Follow on <LumaLogo className="h-[14px] w-auto -translate-y-px" />
            </a>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
