"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, CalendarBlank, Code, UsersThree } from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import { IndexBar, PaperSection } from "@/components/paper/paper-sections";
import { DiscordIcon } from "@/components/community/discord-icon";
import { DISCORD_URL, LUMA_URL } from "@/components/community/join";
import { LumaLogo } from "@/components/community/luma-logo";
import { PRINT } from "@/lib/paper";
import type { CommunityData } from "@/lib/community";
import { cn } from "@/lib/utils";

const HOST = `mailto:contact@studio1hq.com?subject=${encodeURIComponent("Host a Studio1 meetup")}`;
const P = (p: string) => `/assets/events/${p}.webp`;

/** The card's photo, still. */
function Turning({ photos, className }: { photos: string[]; offset?: number; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[6px] bg-[#e6e1d9]", className)}>
      <Image src={photos[0]} alt="" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
    </div>
  );
}

function Way({
  index,
  photos,
  icon,
  label,
  title,
  body,
  action,
  pills,
  mock,
}: {
  index: number;
  photos: string[];
  icon: ReactNode;
  label: string;
  title: ReactNode;
  body: string;
  action: ReactNode;
  pills?: [ReactNode, ReactNode, string][];
  mock?: ReactNode;
  flip?: boolean;
  extra?: ReactNode;
}) {
  const reduce = !!useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  return (
    <motion.article
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 50, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1.1, ease: EASE }}
      className="group relative isolate rounded-[10px] bg-[#fbf9f5] ring-1 ring-inset ring-[#141414]/[0.08] lg:min-h-[380px]"
    >
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-[10px]">
        {/* the photos, moving with the scroll, filling the right of the card */}
        <div className="absolute inset-x-0 top-0 h-[200px] sm:h-[260px] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[66%]">
          <Turning photos={photos} className="size-full rounded-none" />
        </div>
        {/* paper over the left of the photo, so the words sit on paper and the photo melts in */}
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(251,249,245,0)_0px,rgba(251,249,245,0)_150px,#fbf9f5_210px)] sm:bg-[linear-gradient(180deg,rgba(251,249,245,0)_0px,rgba(251,249,245,0)_200px,#fbf9f5_270px))] lg:bg-[linear-gradient(90deg,#fbf9f5_32%,rgba(251,249,245,0.88)_48%,rgba(251,249,245,0)_72%)]" />
      </div>

      <div className="relative flex flex-col justify-end gap-8 p-6 pt-[200px] sm:p-8 sm:pt-[260px] lg:min-h-[380px] lg:pt-10 lg:flex-row lg:items-end lg:justify-between lg:p-10">
        <div className="max-w-[460px]">
          <motion.p
            initial={reduce ? false : { opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
            className="flex items-center gap-2.5 text-[12px] font-medium uppercase tracking-[0.16em] text-[#141414]/55"
          >
            <span className="flex size-8 items-center justify-center bg-[#141414] text-[#f4efe7] transition-colors duration-500 group-hover:bg-[#f97316]">{icon}</span>
            {label}
          </motion.p>
          <h3 className="mt-5 text-[30px] font-medium leading-[1.06] tracking-[-0.04em] md:text-[40px]">{title}</h3>
          <p className="mt-3 text-[16px] leading-[1.6] text-[#141414]/65">{body}</p>
          <div className="mt-7">{action}</div>
        </div>
        {pills?.length ? (
          <ul className="flex flex-col items-start gap-2 lg:-mr-16 lg:items-end sm:flex-row sm:flex-wrap lg:flex-col">
            {pills.map(([icon, value, text], i) => (
              <motion.li
                key={text}
                initial={reduce ? false : { opacity: 0, x: 30, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.35 + i * 0.12 }}
                whileHover={reduce ? undefined : { x: -6 }}
                className="flex items-center gap-3 rounded-full bg-white/90 py-3 pl-5 pr-7 shadow-[0_18px_36px_-22px_rgba(20,20,20,0.6)] ring-1 ring-inset ring-[#141414]/[0.07] backdrop-blur-md"
              >
                <span className="text-[#141414]/55">{icon}</span>
                <span className="text-[19px] font-medium tabular-nums tracking-[-0.02em]">{value}</span>
                <span className="text-[14.5px] text-[#141414]/60">{text}</span>
              </motion.li>
            ))}
          </ul>
        ) : null}
        {mock}
      </div>
    </motion.article>
  );
}

const primary =
  "group inline-flex h-12 items-center gap-2 rounded-full bg-[#141414] px-6 text-[14.5px] font-medium text-white transition-colors duration-300 hover:bg-[#f97316]";
const arrow = <ArrowUpRight weight="bold" className="size-4 transition-transform duration-300 group-hover:rotate-45" />;

export function WaysIn({ data, index }: { data: CommunityData; index: number }) {
  const { totals } = data;
  const reduce = !!useReducedMotion();
  return (
    <PaperSection tone="paper">
      <Container>
        <IndexBar index={index} name="Get involved" />
        <motion.h2
          initial={reduce ? false : { opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.1, ease: EASE }}
          className="mt-6 max-w-[680px] text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]"
        >
          Ways to <span style={{ color: PRINT }}>get involved</span>
        </motion.h2>
        <div className="mt-10 flex flex-col gap-4">
          <Way
            index={0}
            photos={[P("ai-engineer-singapore/03"), P("synchronicity-s2/01"), P("cncf-taiwan/02")]}
            icon={<DiscordIcon className="size-4" />}
            label="Online"
            title={<>Our online <span style={{ color: PRINT }}>community</span></>}
            body="Chat, ask for help with your builds, and hear about every meetup and hackathon first. The people you met at the last event are already in there."
            pills={[
              [<CalendarBlank key="e" weight="bold" className="size-4" />, `${totals.events}+`, "Events so far"],
              [<span key="c" className="text-[16px] font-semibold">#</span>, totals.cities, "Cities"],
              [<UsersThree key="m" weight="bold" className="size-4" />, totals.meetups, "Meetups"],
              [<Code key="h" weight="bold" className="size-4" />, totals.hackathons, "Hackathons"],
            ]}
            action={
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className={primary}>
                <DiscordIcon className="size-4" /> Join the Discord {arrow}
              </a>
            }
          />
          <Way
            index={1}
            flip
            photos={[P("claude-code-delhi/02"), P("react-alicante/02"), P("bengaluru-cloud-ai/02")]}
            icon={<UsersThree weight="bold" className="size-4" />}
            label="In person"
            title={<>Meetups in <span style={{ color: PRINT }}>{totals.cities} cities</span></>}
            body="Evening talks and live demos, from Kolkata to Taipei. Real projects, honest questions, and food after. Run a club or a community? Bring one to your city."
            action={
              <a href={HOST} className={primary}>
                Host a meetup {arrow}
              </a>
            }
          />
          <Way
            index={2}
            photos={[P("aki-hacks/01"), P("hackspire-2/03"), P("scee-hackathon/02")]}
            icon={<Code weight="bold" className="size-4" />}
            label="Build weekends"
            title={<>Hackathons with <span style={{ color: PRINT }}>the tool teams</span></>}
            body="Build weekends with mentors and judges from the companies behind the tools. Ship something, demo it, win."
            action={
              <Link href="/hackathons" className={primary}>
                See hackathons {arrow}
              </Link>
            }
          />
          <Way
            index={3}
            flip
            photos={[P("coscup/03"), P("cityjs-athens/02"), P("ai-engineer-singapore/05")]}
            icon={<CalendarBlank weight="bold" className="size-4" />}
            label="Calendar"
            mock={
              <motion.div
                initial={reduce ? false : { opacity: 0, x: 40, rotate: 3 }}
                whileInView={{ opacity: 1, x: 0, rotate: 2 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: EASE, delay: 0.3 }}
                className="hidden w-[300px] shrink-0 rounded-[12px] bg-white p-4 shadow-[0_30px_60px_-30px_rgba(20,20,20,0.55)] ring-1 ring-[#141414]/[0.07] transition-transform duration-500 group-hover:rotate-0 lg:-mr-16 lg:block lg:-mr-20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold">Studio1</span>
                  <LumaLogo className="h-[12px] w-auto text-[#141414]/50" />
                </div>
                <ul className="mt-3 space-y-2">
                  {(
                    [
                      ["NOV", "26", "KubeCon NA co-located", "Atlanta"],
                      ["DEC", "06", "Kolkata Cloud & AI meetup", "Kolkata"],
                      ["JAN", "17", "Claude Code meetup", "New Delhi"],
                    ] as const
                  ).map(([m, d, name, city], i) => (
                    <motion.li
                      key={name}
                      initial={reduce ? false : { opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, ease: EASE, delay: 0.6 + i * 0.12 }}
                      className="flex items-center gap-3 rounded-[8px] bg-[#f6f3ee] p-2.5"
                    >
                      <span className="flex w-10 shrink-0 flex-col items-center rounded-[6px] bg-white py-1 ring-1 ring-[#141414]/[0.06]">
                        <span className="text-[9px] font-semibold tracking-[0.1em]" style={{ color: PRINT }}>{m}</span>
                        <span className="text-[15px] font-semibold leading-none">{d}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium">{name}</span>
                        <span className="block text-[11.5px] text-[#141414]/50">{city}</span>
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            }
            title={<>Every event, <span style={{ color: PRINT }}>in your calendar</span></>}
            body="Follow Studio1 on Luma and new meetups and hackathons land in your calendar the day they open."
            action={
              <a href={LUMA_URL} target="_blank" rel="noopener noreferrer" className={primary}>
                Follow on <LumaLogo className="h-[14px] w-auto -translate-y-px" /> {arrow}
              </a>
            }
          />
        </div>
      </Container>
    </PaperSection>
  );
}
