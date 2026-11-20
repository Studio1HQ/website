"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, CalendarBlank, Code, UsersThree } from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import { IndexBar, PaperSection } from "@/components/paper/paper-sections";
import { DiscordIcon } from "@/components/community/discord-icon";
import { DISCORD_URL, LUMA_URL } from "@/components/community/join";
import { PRINT } from "@/lib/paper";
import type { CommunityData } from "@/lib/community";

const HOST = `mailto:contact@studio1hq.com?subject=${encodeURIComponent("Host a Studio1 meetup")}`;

const cta =
  "inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-medium text-white transition-[background-color,gap] duration-300 hover:gap-3";

/** One way in: a photo behind, the words on the left, a button. */
function WayCard({
  photo,
  icon,
  title,
  children,
  action,
  aside,
  index,
}: {
  photo: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action: ReactNode;
  aside?: ReactNode;
  index: number;
}) {
  const reduce = !!useReducedMotion();
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1, ease: EASE, delay: index * 0.05 }}
      className="group relative isolate overflow-hidden rounded-[10px] bg-[#141414] text-white"
    >
      <Image src={photo} alt="" fill sizes="(min-width: 1280px) 1240px, 100vw" className="-z-20 object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-[1.04]" />
      <span aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(20,20,20,0.92)_0%,rgba(20,20,20,0.78)_45%,rgba(20,20,20,0.35)_100%)]" />
      <div className="flex flex-col gap-8 p-7 md:p-10 lg:flex-row lg:items-center lg:justify-between lg:p-12">
        <div className="max-w-[640px]">
          <h3 className="flex items-center gap-4 text-[30px] font-medium leading-[1.05] tracking-[-0.04em] md:text-[44px]">
            {icon}
            {title}
          </h3>
          <div className="mt-4 space-y-3 text-[16px] leading-[1.6] text-white/80 md:text-[18px]">{children}</div>
          <div className="mt-7">{action}</div>
        </div>
        {aside}
      </div>
    </motion.article>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon: ReactNode }) {
  return (
    <li className="flex items-center gap-4 rounded-full bg-[#141414]/80 px-6 py-3.5 ring-1 ring-inset ring-white/10 backdrop-blur-sm">
      <span className="text-white/60">{icon}</span>
      <span className="text-[22px] font-medium tabular-nums tracking-[-0.02em]">{value}</span>
      <span className="text-[16px] text-white/75">{label}</span>
    </li>
  );
}

const iconTile = "flex size-12 shrink-0 items-center justify-center rounded-[10px] md:size-14";

export function WaysIn({ data, index }: { data: CommunityData; index: number }) {
  const { totals } = data;
  return (
    <PaperSection tone="paper">
      <Container>
        <IndexBar index={index} name="Get involved" />
        <h2 className="mt-6 max-w-[680px] text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]">
          Ways to <span style={{ color: PRINT }}>get involved</span>
        </h2>
        <div className="mt-10 flex flex-col gap-5">
          <WayCard
            index={0}
            photo="/assets/events/ai-engineer-singapore/03.webp"
            icon={
              <span className={iconTile} style={{ background: "#5865F2" }}>
                <DiscordIcon className="size-7 md:size-8" />
              </span>
            }
            title="Our online community"
            action={
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className={cta} style={{ background: PRINT }}>
                Join the Discord <ArrowRight weight="bold" className="size-4" />
              </a>
            }
            aside={
              <ul className="flex flex-col items-start gap-2.5 lg:items-end">
                <Stat value={`${totals.events}+`} label="Events so far" icon={<CalendarBlank weight="bold" className="size-5" />} />
                <Stat value={String(totals.cities)} label="Cities" icon={<span className="text-[18px] font-semibold">#</span>} />
                <Stat value={String(totals.meetups)} label="Meetups" icon={<UsersThree weight="bold" className="size-5" />} />
                <Stat value={String(totals.hackathons)} label="Hackathons" icon={<Code weight="bold" className="size-5" />} />
              </ul>
            }
          >
            <p>Chat, ask for help with your builds, and hear about every meetup and hackathon first. The people you met at the last event are already in there.</p>
          </WayCard>

          <WayCard
            index={1}
            photo="/assets/events/claude-code-delhi/02.webp"
            icon={
              <span className={iconTile} style={{ background: PRINT }}>
                <UsersThree weight="fill" className="size-7 md:size-8" />
              </span>
            }
            title={`Meetups in ${totals.cities} cities`}
            action={
              <a href={HOST} className={`${cta} bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur-sm hover:bg-white/25`}>
                Host a meetup <ArrowRight weight="bold" className="size-4" />
              </a>
            }
          >
            <p>Evening talks and live demos, from Kolkata to Taipei. Real projects, honest questions, and food after.</p>
            <p>Run a college club or a community? Bring one to your city.</p>
          </WayCard>

          <WayCard
            index={2}
            photo="/assets/events/aki-hacks/04.webp"
            icon={
              <span className={iconTile} style={{ background: "#17a55b" }}>
                <Code weight="bold" className="size-7 md:size-8" />
              </span>
            }
            title="Hackathons with the tool teams"
            action={
              <Link href="/hackathons" className={`${cta} bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur-sm hover:bg-white/25`}>
                See hackathons <ArrowRight weight="bold" className="size-4" />
              </Link>
            }
          >
            <p>Build weekends with mentors and judges from the companies behind the tools. Ship something, demo it, win.</p>
          </WayCard>

          <WayCard
            index={3}
            photo="/assets/events/cncf-taiwan/01.webp"
            icon={
              <span className={iconTile} style={{ background: "#f6bf1d", color: "#141414" }}>
                <CalendarBlank weight="bold" className="size-7 md:size-8" />
              </span>
            }
            title="Every event, in your calendar"
            action={
              <a href={LUMA_URL} target="_blank" rel="noopener noreferrer" className={`${cta} bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur-sm hover:bg-white/25`}>
                Follow on Luma <ArrowRight weight="bold" className="size-4" />
              </a>
            }
          >
            <p>Follow Studio1 on Luma and new meetups and hackathons land in your calendar the day they open.</p>
          </WayCard>
        </div>
      </Container>
    </PaperSection>
  );
}
