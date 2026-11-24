"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useAnimationFrame,
  useMotionValue,
  type MotionValue,
} from "motion/react";
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
import { TEAM } from "@/data/team";
import { SketchDesk } from "@/components/community/sketch-desk";
import { DotSilhouette } from "@/components/team/team-page";
import { PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

const rise = (reduce: boolean, delay = 0) =>
  ({
    initial: reduce ? false : { opacity: 0, y: 36 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 1.1, ease: EASE, delay },
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


/** Spread sets: four photos and a line about where they were taken. */
const SETS: { line: string; shots: [string, string, string?][] }[] = [
  {
    line: "From Delhi and Kolkata to Singapore, we bring developers into the same room to build, talk and ship.",
    shots: [
      ["claude-code-delhi", "/assets/events/claude-code-delhi/02.webp", "IIIT Delhi, New Delhi"],
      ["ai-engineer-singapore", "/assets/events/ai-engineer-singapore/04.webp"],
      ["aki-hacks", "/assets/events/aki-hacks/03.webp", "Hacktoberfest hackathon"],
      ["kubecon-india-2026", "/assets/events/kubecon-india-2026/01.webp"],
    ],
  },
  {
    line: "On stage at the conferences developers care about, from Athens and Alicante to Taipei.",
    shots: [
      ["cityjs-athens", "/assets/events/cityjs-athens/01.webp"],
      ["react-alicante", "/assets/events/react-alicante/01.webp"],
      ["coscup", "/assets/events/coscup/01.webp"],
      ["kubecon-na-2025", "/assets/events/kubecon-na-2025/01.webp"],
    ],
  },
  {
    line: "On campus with the next wave of builders: hackathons, mentoring and late-night demos.",
    shots: [
      ["hackspire-2", "/assets/events/hackspire-2/01.webp"],
      ["synchronicity-s2", "/assets/events/synchronicity-s2/01.webp", "Jadavpur University, Kolkata"],
      ["aki-hacks", "/assets/events/aki-hacks/01.webp", "Hacktoberfest hackathon"],
      ["bengaluru-cloud-ai", "/assets/events/bengaluru-cloud-ai/01.webp"],
    ],
  },
];

const SWAP = 4200;

/** One photo slot: crossfades to the next set a beat after the slot before it. */
function SpreadSlot({ s, className, captionClass, sizes, delay, reduce }: { s: Shot; className: string; captionClass?: string; sizes: string; delay: number; reduce: boolean }) {
  return (
    <>
      <div className={cn("relative overflow-hidden rounded-[6px] bg-[#e6e1d9]", className)}>
        <AnimatePresence initial={false}>
          <motion.div
            key={s.src}
            className="absolute inset-0"
            initial={reduce ? false : { opacity: 0, scale: 1.04, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, transition: { duration: 0.7, ease: EASE, delay: delay + 0.35 } }}
            transition={{ duration: 0.85, ease: EASE, delay }}
          >
            <Link href={s.href} className="relative block size-full">
              <Image src={s.src} alt={s.event} fill sizes={sizes} className="object-cover" />
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className={cn("relative min-h-[36px]", captionClass)}>
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={s.src}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE, delay: delay + 0.25 } }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.4, delay } }}
          >
            <Caption s={s} />
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

/**
 * Where the community comes together: an editorial spread of event photos
 * that turns over set by set, photos and captions changing one after another.
 */
export function TogetherSpread({ byId, index }: { byId: Map<string, CommunityItem>; index: number }) {
  const reduce = !!useReducedMotion();
  const sets = SETS.map((set) => ({
    line: set.line,
    shots: set.shots.map(([slug, src, place]) => shot(byId, slug, src, place)),
  })).filter((set) => set.shots.every(Boolean)) as { line: string; shots: Shot[] }[];
  const [n, setN] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (reduce || paused || sets.length < 2) return;
    const id = window.setInterval(() => setN((v) => (v + 1) % sets.length), SWAP);
    return () => window.clearInterval(id);
  }, [reduce, paused, sets.length]);
  if (!sets.length) return null;
  const active = n % sets.length;
  const set = sets[active];
  const [small, right, big, corner] = set.shots;

  return (
    <PaperSection tone="paper">
      <Container>
        <IndexBar index={index} name="In the room" aside={<Link href="/events" className="underline decoration-[#141414]/25 underline-offset-4 hover:decoration-[#f97316]">All events</Link>} />
        <motion.div
          {...rise(reduce)}
          className="mt-8 rounded-[6px] bg-[#fbf9f5] p-6 ring-1 ring-inset ring-[#141414]/[0.07] md:p-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-12">
            <div className="flex flex-col sm:col-span-2 lg:col-span-5">
              <h2 className="text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[44px]">
                Where the community <span style={{ color: PRINT }}>comes together</span>
              </h2>
              <div className="relative mt-4 min-h-[78px] max-w-[420px]">
                <AnimatePresence initial={false} mode="wait">
                  <motion.p
                    key={active}
                    className="text-[15.5px] leading-[1.6] text-[#141414]/60"
                    initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                    transition={{ duration: 0.55, ease: EASE }}
                  >
                    {set.line}
                  </motion.p>
                </AnimatePresence>
              </div>
              {/* Which set is showing; click to jump */}
              <div className="mt-6 flex items-center gap-2">
                {sets.map((_, k) => (
                  <button
                    key={k}
                    type="button"
                    aria-label={`Show set ${k + 1}`}
                    onClick={() => setN(k)}
                    className="relative h-1.5 w-10 overflow-hidden rounded-full bg-[#141414]/10"
                  >
                    {k === active ? (
                      <motion.span
                        key={`${active}-${paused}`}
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: PRINT }}
                        initial={{ width: reduce || paused ? "100%" : "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: reduce || paused ? 0 : SWAP / 1000, ease: "linear" }}
                      />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-3">
              <SpreadSlot s={small} className="aspect-[3/2]" captionClass="mt-2.5" sizes="(min-width: 768px) 24vw, 100vw" delay={0} reduce={reduce} />
            </div>
            <div className="lg:col-span-4">
              <SpreadSlot s={right} className="aspect-[3/2]" captionClass="mt-2.5" sizes="(min-width: 768px) 32vw, 100vw" delay={0.1} reduce={reduce} />
            </div>
            <div className="lg:col-span-8 lg:flex lg:items-end lg:gap-4">
              <SpreadSlot s={big} className="aspect-[3/2] lg:w-[78%] lg:shrink-0" captionClass="mt-2.5 lg:mt-0" sizes="(min-width: 768px) 52vw, 100vw" delay={0.2} reduce={reduce} />
            </div>
            <div className="lg:col-span-4 lg:flex lg:items-end lg:gap-3 lg:self-end">
              <SpreadSlot s={corner} className="aspect-[3/2] lg:aspect-[4/3] lg:w-[70%] lg:shrink-0" captionClass="mt-2.5 lg:mt-0 lg:self-start" sizes="(min-width: 768px) 24vw, 100vw" delay={0.3} reduce={reduce} />
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
      initial={reduce ? false : { opacity: 0, y: 30, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.07 }}
      whileHover={reduce ? undefined : { rotate: 0, scale: 1.04, transition: { duration: 0.3 } }}
    >
      <span className="relative block aspect-[4/3] overflow-hidden rounded-[6px] bg-[#e6e1d9] shadow-[0_18px_34px_-22px_rgba(20,20,20,0.55)]">
        <Image src={t.src} alt="" fill sizes="200px" className="object-cover" />
      </span>
      <figcaption className="relative -mt-3.5 ml-3 inline-flex items-center gap-2 bg-white px-3 py-1.5 text-[12.5px] font-medium tracking-[-0.01em] text-[#141414] shadow-[0_8px_18px_-12px_rgba(20,20,20,0.55)] ring-1 ring-inset ring-[#141414]/[0.08]">
        <span aria-hidden className="size-1.5 shrink-0" style={{ background: PRINT }} />
        {t.label}
      </figcaption>
    </motion.figure>
  );
}

/**
 * A photo on the orbit around the line. The whole ring turns slowly on its
 * own and a little further as you scroll, through one smoothed angle, so the
 * motion never stutters.
 */
function Orbit({ t, i, n, angle, reduce }: { t: (typeof SCATTER)[number]; i: number; n: number; angle: MotionValue<number>; reduce: boolean }) {
  const base = (i / n) * Math.PI * 2;
  const x = useTransform(angle, (a) => Math.cos(base + a) * 480);
  const y = useTransform(angle, (a) => Math.sin(base + a) * 228);
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 will-change-transform"
      style={reduce ? { x: Math.cos(base) * 480, y: Math.sin(base) * 228 } : { x, y }}
    >
      <div className="-translate-x-1/2 -translate-y-1/2" style={{ rotate: `${t.rot}deg` }}>
        <Tile t={t} reduce={reduce} i={i} />
      </div>
    </motion.div>
  );
}

export function TogetherWeBuild() {
  const reduce = !!useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  // One full turn every ~100s on its own...
  const drift = useMotionValue(0);
  useAnimationFrame((_, delta) => {
    if (!reduce) drift.set(drift.get() + (delta / 1000) * ((Math.PI * 2) / 100));
  });
  // ...plus up to a third of a turn across the scroll, smoothed
  const scrollTurn = useSpring(useTransform(scrollYProgress, [0, 1], [-1, 1]), { stiffness: 40, damping: 20, mass: 1 });
  const angle = useTransform([drift, scrollTurn], ([d, s2]: number[]) => d + s2);
  const headY = useSpring(useTransform(scrollYProgress, [0.15, 0.5], [50, 0]), { stiffness: 60, damping: 20 });
  const headOpacity = useTransform(scrollYProgress, [0.12, 0.35], [0, 1]);
  return (
    <PaperSection tone="paper" className="relative isolate overflow-hidden">
      {/* the pencil sketch behind, stronger at the edges, softer behind the headline */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.38] [mask-image:radial-gradient(ellipse_30%_32%_at_50%_50%,rgba(0,0,0,0.3)_40%,black_85%),linear-gradient(to_bottom,transparent,black_25%,black_70%,transparent)] [mask-composite:intersect] [-webkit-mask-composite:source-in]">
        <SketchDesk className="absolute inset-0 size-full" />
      </div>
      <Container>
        {/* Desktop: photos circle the line */}
        <div ref={ref} className="relative hidden h-[700px] overflow-visible lg:block">
          {SCATTER.map((t, i) => (
            <Orbit key={t.label} t={t} i={i} n={SCATTER.length} angle={angle} reduce={reduce} />
          ))}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <motion.h2
              className="text-center text-[64px] font-medium leading-[0.98] tracking-[-0.055em]"
              style={reduce ? undefined : { y: headY, opacity: headOpacity }}
            >
              Together,
              <br />
              <span style={{ color: PRINT }}>we build.</span>
            </motion.h2>
          </div>
        </div>
        {/* Phones and tablets: the line, then the photos in a grid */}
        <div className="lg:hidden">
          <motion.h2 {...rise(reduce)} className="text-center text-[44px] font-medium leading-[1] tracking-[-0.05em]">
            Together, <span style={{ color: PRINT }}>we build.</span>
          </motion.h2>
          <div className="mt-10 grid grid-cols-2 justify-items-center gap-x-3 gap-y-8 sm:grid-cols-3">
            {SCATTER.slice(0, 6).map((t, i) => (
              <div key={t.label} style={{ rotate: `${t.rot}deg` }} className="w-full max-w-[200px]">
                <Tile t={t} reduce={reduce} i={i} className="w-full" />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </PaperSection>
  );
}

/** Bento: the people, what the events were, and the communities we work with. */
/** The team, in the same order and portraits as the team page. */
const FACES = TEAM.flatMap((tier) => tier.members).filter(
  (m): m is typeof m & { portrait: string; name: string } => Boolean(m.portrait && m.name && !m.open),
);

/** Each community's real mark: SVGs tinted in their brand colour, PNGs as they are. */
const PARTNERS: { name: string; file: string; brand?: string }[] = [
  { name: "CNCF", file: "cncf.svg", brand: "#0086FF" },
  { name: "Kubernetes", file: "kubernetes.svg", brand: "#326CE5" },
  { name: "GDG", file: "gdg.png" },
  { name: "MLH", file: "mlh.svg", brand: "#E73427" },
  { name: "PyTorch", file: "pytorch.svg", brand: "#EE4C2C" },
  { name: "PyData", file: "pydata.png" },
  { name: "ACM", file: "acm.svg", brand: "#0085CA" },
  { name: "React", file: "react.svg", brand: "#149ECA" },
  { name: "GitHub", file: "github.svg", brand: "#181717" },
  { name: "Claude", file: "claude.svg", brand: "#D97757" },
  { name: "Hackspire", file: "hackspire.png" },
  { name: "HackByte", file: "hackbyte.png" },
];

function PartnerMark({ p, small }: { p: (typeof PARTNERS)[number]; small?: boolean }) {
  const src = `/assets/logos/events/${p.file}`;
  const size = small ? "size-5" : "size-9";
  return p.brand ? (
    <span
      aria-hidden
      className={cn("block shrink-0", size)}
      style={{ backgroundColor: p.brand, WebkitMask: `url(${src}) center / contain no-repeat`, mask: `url(${src}) center / contain no-repeat` }}
    />
  ) : (
    <Image src={src} alt="" width={36} height={36} className={cn("object-contain", size)} />
  );
}

export function CommunityBento({ data, index }: { data: CommunityData; index: number }) {
  const reduce = !!useReducedMotion();
  const byKind = (k: CommunityItem["kind"]) => data.past.filter((e) => e.kind === k).length;
  const formats: [string, number, Icon][] = [
    ["Talks", byKind("conference"), MicrophoneStage],
    ["Hackathons", byKind("hackathon"), Code],
    ["Meetups", byKind("meetup"), UsersThree],
    ["Online", byKind("online"), ChatsCircle],
    ["Workshops", byKind("workshop"), Lightbulb],
  ];
  const shown = formats.filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]);
  const top = Math.max(1, ...shown.map(([, v]) => v));
  const card = "rounded-[10px] bg-white ring-1 ring-inset ring-[#141414]/[0.07]";
  return (
    <PaperSection tone="paper">
      <Container>
        <IndexBar index={index} name="People" />
        <motion.h2 {...rise(reduce)} className="mt-6 text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]">
          Built by people who <span style={{ color: PRINT }}>show up</span>
        </motion.h2>
        <div className="mt-10 grid gap-3 lg:grid-cols-[1.15fr_1fr]">
          {/* The team, in grayscale photos */}
          <motion.div {...rise(reduce)} className={cn(card, "flex flex-col gap-6 p-5 md:p-6")}>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4">
              {FACES.map((m, i) => (
                <motion.div
                  key={m.name}
                  title={m.name}
                  className="relative aspect-[3/4] overflow-hidden lg:aspect-square rounded-[6px] bg-[#e6e3de]"
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.05 }}
                >
                  <Image
                    src={m.portrait}
                    alt={m.name}
                    fill
                    sizes="(min-width: 1024px) 110px, 25vw"
                    className="object-cover object-top contrast-[1.05] grayscale"
                  />
                  <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[6px] ring-1 ring-inset ring-[#141414]/[0.07]" />
                </motion.div>
              ))}
              {/* The seat still open */}
              <motion.div
                className="col-span-2"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.1 + FACES.length * 0.05 }}
              >
                <Link
                  href="/careers"
                  className="relative flex h-full min-h-[96px] items-end overflow-hidden rounded-[6px] p-3 sm:p-4"
                  style={{ background: "linear-gradient(180deg, #e6e3de 0%, #d8d4ce 100%)" }}
                >
                  {/* The open seat, as on the team page, in our orange */}
                  <span aria-hidden className="absolute inset-y-0 right-0 w-1/2 [&>svg]:!inset-x-[6%] [&>svg]:!w-[88%]">
                    <DotSilhouette coarse fill={PRINT} opacity={0.9} />
                  </span>
                  <span className="relative text-[17px] font-medium tracking-[-0.03em]">And you?</span>
                  <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[6px] ring-1 ring-inset ring-[#141414]/[0.07]" />
                </Link>
              </motion.div>
            </div>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
              <p className="text-[17px] font-medium tracking-[-0.02em]">The team behind the events</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/team" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#141414] px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-[#f97316]">
                  Meet the team <ArrowUpRight weight="bold" className="size-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col gap-3">
            {/* The count, and what it was made of */}
            <motion.div {...rise(reduce, 0.08)} className={cn(card, "p-6 md:p-7")}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[64px] font-medium leading-[0.9] tracking-[-0.07em] tabular-nums md:text-[76px]">
                    <Counter to={data.totals.events} />
                    <span style={{ color: PRINT }}>+</span>
                  </p>
                  <p className="mt-2 text-[15px] text-[#141414]/55">Events run, spoken at or joined</p>
                </div>
                <p className="pb-1 text-right text-[13px] leading-snug text-[#141414]/45">
                  across {data.totals.cities} cities
                  <br />
                  and online
                </p>
              </div>
              <ul className="mt-6 space-y-3 border-t border-[#141414]/[0.07] pt-5">
                {shown.map(([label, value, KindIcon], i) => (
                  <li key={label} className="group grid grid-cols-[112px_1fr_32px] items-center gap-3">
                    <span className="flex items-center gap-2 text-[13.5px] text-[#141414]/70">
                      <KindIcon weight="regular" className="size-4 text-[#141414]/45 transition-colors duration-300 group-hover:text-[#f97316]" />
                      {label}
                    </span>
                    <span className="h-2 overflow-hidden rounded-full bg-[#141414]/[0.06]">
                      <motion.span
                        className="block h-full rounded-full"
                        style={{ background: i === 0 ? PRINT : "#141414", opacity: i === 0 ? 1 : 0.75 }}
                        initial={reduce ? false : { width: 0 }}
                        whileInView={{ width: `${(value / top) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: EASE, delay: 0.2 + i * 0.1 }}
                      />
                    </span>
                    <span className="text-right text-[14px] font-medium tabular-nums">
                      {value}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Communities we show up with: their marks */}
            <motion.div {...rise(reduce, 0.14)} className={cn(card, "flex flex-1 flex-col p-5 md:p-6")}>
              <p className="text-[13px] font-medium text-[#141414]/45">Communities we show up with</p>
              <ul className="mt-4 grid flex-1 auto-rows-fr grid-cols-4 gap-2 sm:grid-cols-6">
                {PARTNERS.map((p) => (
                  <li
                    key={p.name}
                    title={p.name}
                    className="flex min-h-[52px] items-center justify-center opacity-55 grayscale transition-[filter,opacity] duration-500 hover:opacity-100 hover:grayscale-0"
                  >
                    <PartnerMark p={p} />
                    <span className="sr-only">{p.name}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

        </div>
      </Container>
    </PaperSection>
  );
}

/** Counts up from 0 when it scrolls into view; the real number is in the HTML. */
function Counter({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "-60px" });
  const reduce = !!useReducedMotion();
  useLayoutEffect(() => {
    if (!reduce && ref.current) ref.current.textContent = "0";
  }, [reduce]);
  useEffect(() => {
    if (!seen || reduce) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: EASE,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [seen, reduce, to]);
  return <span ref={ref}>{to}</span>;
}
