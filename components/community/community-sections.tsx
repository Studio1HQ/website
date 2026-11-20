"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  ChatsCircle,
  Code,
  Lightbulb,
  MicrophoneStage,
  Rocket,
  Trophy,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import { IndexBar, PaperSection } from "@/components/paper/paper-sections";
import type { CommunityData, CommunityItem } from "@/lib/community";
import { PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

const rise = (reduce: boolean, delay = 0) =>
  ({
    initial: reduce ? false : { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.9, ease: EASE, delay },
  }) as const;

/** A photo from an event, with the event and city as its caption. */
type Shot = { src: string; event: string; place: string; href: string };

function shot(byId: Map<string, CommunityItem>, slug: string, src: string, place?: string): Shot | null {
  const item = byId.get(`s-${slug}`);
  if (!item) return null;
  return { src, event: item.name, place: place ?? item.city ?? "", href: item.href ?? "/events" };
}

function Caption({ s, className }: { s: Shot; className?: string }) {
  return (
    <p className={cn("text-[12.5px] leading-snug", className)}>
      <span className="block font-medium text-[#141414]">{s.event}</span>
      <span className="block text-[#141414]/45">{s.place}</span>
    </p>
  );
}

function Photo({ s, className, sizes }: { s: Shot; className?: string; sizes: string }) {
  return (
    <Link href={s.href} className={cn("group relative block overflow-hidden rounded-[6px] bg-[#e6e1d9]", className)}>
      <Image src={s.src} alt={s.event} fill sizes={sizes} className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
    </Link>
  );
}

/**
 * Where the community comes together: an editorial spread of event photos,
 * each captioned with the event and its city.
 */
export function TogetherSpread({ byId, index }: { byId: Map<string, CommunityItem>; index: number }) {
  const reduce = !!useReducedMotion();
  const small = shot(byId, "claude-code-delhi", "/assets/events/claude-code-delhi/02.webp", "IIIT Delhi, New Delhi");
  const right = shot(byId, "ai-engineer-singapore", "/assets/events/ai-engineer-singapore/04.webp");
  const big = shot(byId, "aki-hacks", "/assets/events/aki-hacks/03.webp", "Hacktoberfest hackathon");
  const corner = shot(byId, "kubecon-india-2026", "/assets/events/kubecon-india-2026/01.webp", "India");
  if (!small || !right || !big || !corner) return null;

  return (
    <PaperSection tone="paper">
      <Container>
        <IndexBar index={index} name="In the room" aside={<Link href="/events" className="underline decoration-[#141414]/25 underline-offset-4 hover:decoration-[#f97316]">All events</Link>} />
        <motion.div {...rise(reduce)} className="mt-8 rounded-[6px] bg-[#fbf9f5] p-6 ring-1 ring-inset ring-[#141414]/[0.07] md:p-10">
          <div className="grid gap-x-6 gap-y-8 md:grid-cols-12">
            {/* Heading, top left */}
            <div className="md:col-span-5">
              <h2 className="text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[44px]">
                Where the community <span style={{ color: PRINT }}>comes together</span>
              </h2>
              <p className="mt-4 max-w-[420px] text-[15.5px] leading-[1.6] text-[#141414]/60">
                From Delhi and Kolkata to Singapore and Athens, we bring developers into the same room to build, talk and ship.
              </p>
            </div>
            {/* Small photo, top middle */}
            <div className="md:col-span-3">
              <Photo s={small} className="aspect-[3/2]" sizes="(min-width: 768px) 24vw, 100vw" />
              <Caption s={small} className="mt-2.5" />
            </div>
            {/* Larger photo, top right */}
            <div className="md:col-span-4">
              <Photo s={right} className="aspect-[3/2]" sizes="(min-width: 768px) 32vw, 100vw" />
              <Caption s={right} className="mt-2.5" />
            </div>
            {/* Big photo, bottom left, caption beside it */}
            <div className="md:col-span-8 md:flex md:items-end md:gap-4">
              <Photo s={big} className="aspect-[3/2] md:w-[78%] md:shrink-0" sizes="(min-width: 768px) 52vw, 100vw" />
              <Caption s={big} className="mt-2.5 md:mt-0" />
            </div>
            {/* Small photo, bottom right, caption beside it */}
            <div className="md:col-span-4 md:flex md:items-end md:gap-3 md:self-end">
              <Photo s={corner} className="aspect-[4/3] md:w-[70%] md:shrink-0" sizes="(min-width: 768px) 24vw, 100vw" />
              <Caption s={corner} className="mt-2.5 md:mt-0 md:self-start" />
            </div>
          </div>
        </motion.div>
      </Container>
    </PaperSection>
  );
}

/** "Together, we build": event photos scattered around one line, each tagged. */
const SCATTER: { src: string; label: string; icon: Icon; tint: string; pos: string; rot: number }[] = [
  { src: "/assets/events/hackspire-2/01.webp", label: "Give a talk", icon: MicrophoneStage, tint: "#ffe2c7", pos: "left-[4%] top-[14%]", rot: -4 },
  { src: "/assets/events/aki-hacks/02.webp", label: "Ship a demo", icon: Rocket, tint: "#fde4ec", pos: "left-[27%] top-[2%]", rot: 3 },
  { src: "/assets/events/react-alicante/02.webp", label: "Learn something new", icon: Lightbulb, tint: "#e4f1e2", pos: "right-[22%] top-[0%]", rot: -2 },
  { src: "/assets/events/synchronicity-s2/01.webp", label: "Win a hackathon", icon: Trophy, tint: "#fff1c2", pos: "right-[3%] top-[22%]", rot: 4 },
  { src: "/assets/events/claude-code-delhi/01.webp", label: "Find your people", icon: UsersThree, tint: "#e3ecfb", pos: "left-[8%] bottom-[6%]", rot: 3 },
  { src: "/assets/events/coscup/01.webp", label: "Ask anything", icon: ChatsCircle, tint: "#efe4fb", pos: "left-[38%] bottom-[0%]", rot: -3 },
  { src: "/assets/events/bengaluru-cloud-ai/01.webp", label: "Build in public", icon: Code, tint: "#ffe2c7", pos: "right-[6%] bottom-[4%]", rot: 2 },
];

function Tile({ t, reduce, i, className }: { t: (typeof SCATTER)[number]; reduce: boolean; i: number; className?: string }) {
  return (
    <motion.figure
      className={cn("w-[180px] md:w-[200px]", className)}
      style={{ rotate: t.rot }}
      initial={reduce ? false : { opacity: 0, y: 30, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.07 }}
      whileHover={reduce ? undefined : { rotate: 0, scale: 1.04, transition: { duration: 0.3 } }}
    >
      <span className="relative block aspect-[4/3] overflow-hidden rounded-[6px] bg-[#e6e1d9] shadow-[0_18px_34px_-22px_rgba(20,20,20,0.55)]">
        <Image src={t.src} alt="" fill sizes="200px" className="object-cover" />
      </span>
      <figcaption
        className="relative -mt-4 ml-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-[#141414] shadow-[0_6px_16px_-10px_rgba(20,20,20,0.5)]"
        style={{ background: t.tint }}
      >
        <t.icon weight="fill" className="size-3.5" style={{ color: PRINT }} />
        {t.label}
      </figcaption>
    </motion.figure>
  );
}

export function TogetherWeBuild() {
  const reduce = !!useReducedMotion();
  return (
    <PaperSection tone="paper">
      <Container>
        {/* Desktop: photos float around the line */}
        <div className="relative hidden h-[600px] lg:block">
          {SCATTER.map((t, i) => (
            <div key={t.label} className={cn("absolute", t.pos)}>
              <Tile t={t} reduce={reduce} i={i} />
            </div>
          ))}
          {/* Centred by its wrapper, so the entrance animation's transform
              does not undo the centring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.h2
              {...rise(reduce, 0.2)}
              className="text-center text-[64px] font-medium leading-[0.98] tracking-[-0.055em]"
            >
              Together,
              <br />
              <span style={{ color: PRINT }}>we build.</span>
            </motion.h2>
          </div>
        </div>
        {/* Phones and tablets: the line, then the photos in a grid */}
        <div className="lg:hidden">
          <h2 className="text-center text-[44px] font-medium leading-[1] tracking-[-0.05em]">
            Together, <span style={{ color: PRINT }}>we build.</span>
          </h2>
          <div className="mt-10 grid grid-cols-2 justify-items-center gap-x-3 gap-y-8 sm:grid-cols-3">
            {SCATTER.slice(0, 6).map((t, i) => (
              <Tile key={t.label} t={t} reduce={reduce} i={i} className="w-full max-w-[200px]" />
            ))}
          </div>
        </div>
      </Container>
    </PaperSection>
  );
}

/** Bento: the people, the count, the communities we show up with. */
const FACES = [
  "arindam-majumder", "amitesh-anand", "shivay-lamba", "kathank-raithatha",
  "nancy-garg", "shivam-katare", "indrajit-ari", "piuli-biswas",
];
const PARTNERS: [string, string][] = [
  ["CNCF", "cncf.svg"], ["Kubernetes", "kubernetes.svg"], ["GDG", "gdg.png"], ["MLH", "mlh.svg"],
  ["PyTorch", "pytorch.svg"], ["PyData", "pydata.png"], ["ACM", "acm.svg"], ["React", "react.svg"],
  ["GitHub", "github.svg"], ["Claude", "claude.svg"], ["Hackspire", "hackspire.png"], ["HackByte", "hackbyte.png"],
];

export function CommunityBento({ data, index }: { data: CommunityData; index: number }) {
  const reduce = !!useReducedMotion();
  // Holes in the face grid, so it reads as a wall of seats still filling up
  const seats = [null, 0, null, 1, 2, null, 3, null, null, 4, 5, null, 6, null, 7, null];
  return (
    <PaperSection tone="paper">
      <Container>
        <IndexBar index={index} name="People" />
        <h2 className="mt-6 text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]">
          Built by people who <span style={{ color: PRINT }}>show up</span>
        </h2>
        <div className="mt-10 grid gap-3 lg:grid-cols-3">
          {/* Faces */}
          <motion.div {...rise(reduce)} className="flex flex-col justify-between gap-8 rounded-[6px] bg-white/80 p-6 ring-1 ring-inset ring-[#141414]/10 lg:row-span-2">
            <div className="grid grid-cols-4 gap-2.5">
              {seats.map((s, i) => (
                <span
                  key={i}
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-[6px]",
                    s === null ? "bg-[#f4efe7] shadow-[inset_0_1px_2px_rgba(20,20,20,0.06)]" : "bg-[#e6e3de] shadow-[0_8px_16px_-12px_rgba(20,20,20,0.6)] ring-1 ring-inset ring-white",
                  )}
                >
                  {s !== null ? (
                    <Image src={`/assets/team/${FACES[s]}.webp?v=13`} alt="" fill sizes="80px" className="object-cover object-top" />
                  ) : null}
                </span>
              ))}
            </div>
            <div>
              <p className="text-[17px] font-medium tracking-[-0.02em]">Meet the team behind the events</p>
              <Link href="/team" className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-[#141414] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#f97316]">
                Meet the team <ArrowUpRight weight="bold" className="size-4" />
              </Link>
            </div>
          </motion.div>

          {/* The count */}
          <motion.div {...rise(reduce, 0.06)} className="flex flex-col justify-between gap-10 rounded-[6px] bg-white/80 p-7 ring-1 ring-inset ring-[#141414]/10 lg:row-span-2">
            <div>
              <p className="text-[88px] font-medium leading-[0.9] tracking-[-0.06em] tabular-nums md:text-[104px]">
                {data.totals.events}
                <span style={{ color: PRINT }}>+</span>
              </p>
              <p className="mt-3 text-[16px] text-[#141414]/55">Events run, spoken at or joined</p>
            </div>
            <p className="max-w-[340px] text-[15px] leading-[1.6] text-[#141414]/60">
              Talks, workshops, booths and hackathons across {data.totals.cities} cities, plus streams and podcasts online.
            </p>
          </motion.div>

          {/* Communities we show up with */}
          <motion.div {...rise(reduce, 0.12)} className="overflow-hidden rounded-[6px] bg-white/80 py-6 ring-1 ring-inset ring-[#141414]/10">
            <p className="px-6 text-[13px] font-medium text-[#141414]/50">Communities we show up with</p>
            <div className="mt-5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
              <motion.div
                className="flex w-max gap-3"
                animate={reduce ? undefined : { x: ["0%", "-50%"] }}
                transition={{ duration: 30, ease: "linear", repeat: Infinity }}
              >
                {[...PARTNERS, ...PARTNERS].map(([name, file], i) => (
                  <span key={i} className="flex h-12 shrink-0 items-center gap-2 rounded-[6px] bg-white px-3.5 text-[14px] font-medium shadow-[0_6px_14px_-10px_rgba(20,20,20,0.45)] ring-1 ring-inset ring-[#141414]/[0.06]">
                    <Image src={`/assets/logos/events/${file}`} alt="" width={22} height={22} className="size-[22px] object-contain" />
                    {name}
                  </span>
                ))}
              </motion.div>
            </div>
          </motion.div>

          {/* Cities */}
          <motion.div {...rise(reduce, 0.18)} className="flex flex-col justify-between gap-6 rounded-[6px] p-6 text-white" style={{ background: PRINT }}>
            <p className="text-[13px] font-medium text-white/80">Cities so far</p>
            <p className="text-[15px] leading-[1.7]">
              {data.cities.map((c) => c.city).join(" · ")}
            </p>
          </motion.div>
        </div>
      </Container>
    </PaperSection>
  );
}
