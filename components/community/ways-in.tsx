"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
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

/** Photos that take turns, each easing in from a soft blur and slowly zooming. */
function Turning({ photos, offset = 0, className }: { photos: string[]; offset?: number; className?: string }) {
  const reduce = !!useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce || photos.length < 2) return;
    let id = 0;
    const start = window.setTimeout(() => {
      setI((v) => (v + 1) % photos.length);
      id = window.setInterval(() => setI((v) => (v + 1) % photos.length), 4200);
    }, 4200 + offset);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(id);
    };
  }, [reduce, photos.length, offset]);
  return (
    <div className={cn("relative overflow-hidden rounded-[6px] bg-[#e6e1d9]", className)}>
      <AnimatePresence initial={false}>
        <motion.div
          key={photos[i]}
          className="absolute inset-0"
          initial={reduce ? false : { opacity: 0, filter: "blur(8px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: EASE, delay: 0.3 } }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1.08 }}
            animate={{ scale: reduce ? 1.08 : 1 }}
            transition={{ duration: 6, ease: "linear" }}
          >
            <Image src={photos[i]} alt="" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          </motion.div>
        </motion.div>
      </AnimatePresence>
      {/* which photo is showing */}
      <div className="absolute bottom-3 left-3 flex gap-1">
        {photos.map((p, k) => (
          <span key={p} className={cn("h-1 rounded-full bg-white transition-all duration-500", k === i ? "w-5 opacity-100" : "w-1.5 opacity-60")} />
        ))}
      </div>
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
}: {
  index: number;
  photos: string[];
  icon: ReactNode;
  label: string;
  title: ReactNode;
  body: string;
  action: ReactNode;
  pills?: [ReactNode, string][];
  flip?: boolean;
  extra?: ReactNode;
}) {
  const reduce = !!useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useSpring(useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]), { stiffness: 80, damping: 24 });
  return (
    <motion.article
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 50, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1.1, ease: EASE }}
      whileHover={reduce ? undefined : { y: -4 }}
      className="group relative isolate min-h-[420px] overflow-hidden rounded-[10px] bg-[#fbf9f5] ring-1 ring-inset ring-[#141414]/[0.08] transition-shadow duration-500 hover:shadow-[0_40px_70px_-45px_rgba(20,20,20,0.55)] md:min-h-[380px]"
    >
      {/* the photos, moving with the scroll, filling the right of the card */}
      <motion.div style={reduce ? undefined : { y }} className="absolute inset-y-[-10%] right-0 -z-20 w-full md:w-[66%]">
        <Turning photos={photos} offset={index * 900} className="size-full rounded-none transition-transform duration-[1.4s] ease-out group-hover:scale-[1.04]" />
      </motion.div>
      {/* paper over the left of the photo, so the words sit on paper and the photo melts in */}
      <span aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(251,249,245,0)_25%,rgba(251,249,245,0.92)_55%,#fbf9f5_70%)] md:bg-[linear-gradient(90deg,#fbf9f5_32%,rgba(251,249,245,0.88)_48%,rgba(251,249,245,0)_72%)]" />

      <div className="relative flex min-h-[420px] flex-col justify-end gap-8 p-6 md:min-h-[380px] md:flex-row md:items-end md:justify-between md:p-10">
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
          <ul className="flex flex-col items-start gap-2 md:items-end">
            {pills.map(([value, text], i) => (
              <motion.li
                key={text}
                initial={reduce ? false : { opacity: 0, x: 30, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.35 + i * 0.12 }}
                className="flex items-center gap-3 rounded-full bg-white/85 py-2.5 pl-5 pr-6 shadow-[0_12px_28px_-20px_rgba(20,20,20,0.6)] ring-1 ring-inset ring-[#141414]/[0.06] backdrop-blur-md"
              >
                <span className="size-1.5 rounded-full" style={{ background: PRINT }} />
                <span className="text-[19px] font-medium tabular-nums tracking-[-0.02em]">{value}</span>
                <span className="text-[14.5px] text-[#141414]/60">{text}</span>
              </motion.li>
            ))}
          </ul>
        ) : null}
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
              [`${totals.events}+`, "Events so far"],
              [totals.cities, "Cities"],
              [totals.meetups, "Meetups"],
              [totals.hackathons, "Hackathons"],
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
            photos={[P("aki-hacks/04"), P("hackspire-2/03"), P("scee-hackathon/02")]}
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
