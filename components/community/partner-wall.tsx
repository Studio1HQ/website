"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import { IndexBar, PaperSection } from "@/components/paper/paper-sections";
import { homeTestimonials } from "@/data/home";
import { PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/*
 * The devtool teams we partner with, as a wall of their marks. Hovering (or
 * focusing) a mark shows what that team said about working with us; with
 * no hover the quotes turn over on their own.
 */

type Partner = {
  company: string;
  logo: string;
  height: number;
  /** Single-colour marks: drawn through a mask in this colour. */
  tint?: string;
};

/** Each company's mark in its own colours, set to read on paper. */
const LOGOS: Partner[] = [
  { company: "Jozu", logo: "/assets/logos/ink/jozu.png", height: 26, tint: "#141414" },
  { company: "Nebius", logo: "/assets/logos/ink/nebius.png", height: 20, tint: "#052b42" },
  { company: "Ittybit", logo: "/assets/logos/brand/ittybit.png", height: 30 },
  { company: "Entelligence", logo: "/assets/logos/brand/entelligence.png", height: 22 },
  { company: "Readyset", logo: "/assets/logos/Readyset-full.svg", height: 26 },
  { company: "CopilotKit", logo: "/assets/logos/brand/copilotkit.png", height: 28 },
  { company: "Crawlee", logo: "/assets/logos/Crawlee-full.svg", height: 28 },
  { company: "Opire", logo: "/assets/logos/Opire-full.svg", height: 28 },
  { company: "Permit.io", logo: "/assets/logos/brand/permit.png", height: 34 },
  { company: "VMware", logo: "/assets/logos/ink/vmware.png", height: 24, tint: "#1d428a" },
  { company: "Tolgee", logo: "/assets/logos/Tolgee-full.svg", height: 28 },
  { company: "WebCrumbs", logo: "/assets/logos/Webcrumbs-full.svg", height: 26 },
  { company: "Pieces", logo: "/assets/logos/ink/pieces.png", height: 34, tint: "#141414" },
  { company: "Latitude", logo: "/assets/logos/brand/latitude.png", height: 28 },
  { company: "Novita", logo: "/assets/logos/ink/novita.png", height: 32, tint: "#23d57c" },
];

const ENTRIES = LOGOS.map((p) => ({
  ...p,
  quote: homeTestimonials.find((t) => t.role.toLowerCase().includes(p.company.toLowerCase().split(".")[0])),
})).filter((e): e is typeof e & { quote: (typeof homeTestimonials)[number] } => Boolean(e.quote));

const TURN = 7000;

/** Every mark in the same ink, through a mask, so the set reads as one. */
function Mark({ p, active, align = "left", scale = 0.78 }: { p: Partner; active?: boolean; align?: "left" | "center"; scale?: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block w-full max-w-[150px] transition-opacity duration-500 ease-out",
        active === undefined ? "" : active ? "opacity-100" : "opacity-40 group-hover/row:opacity-100",
      )}
      style={{
        height: Math.round(p.height * scale),
        backgroundColor: "#141414",
        WebkitMask: `url(${p.logo}) ${align} center / contain no-repeat`,
        mask: `url(${p.logo}) ${align} center / contain no-repeat`,
      }}
    />
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

export function PartnerWall({ index }: { index: number }) {
  const reduce = !!useReducedMotion();
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState(false);
  const rest = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (reduce || hover) return;
    const id = window.setInterval(() => setActive((v) => (v + 1) % ENTRIES.length), TURN);
    return () => window.clearInterval(id);
  }, [reduce, hover, active]);
  const current = ENTRIES[active];
  if (!current) return null;
  const words = current.quote.content.replace(/\s+/g, " ").trim();
  const quote = words.length > 190 ? `${words.slice(0, words.lastIndexOf(" ", 185))}…` : words;
  const step = (d: number) => setActive((v) => (v + d + ENTRIES.length) % ENTRIES.length);
  const fade = {
    initial: reduce ? false : { opacity: 0, y: 12, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -8, filter: "blur(6px)" },
  } as const;
  const enter = (delay = 0) =>
    ({
      initial: reduce ? false : { opacity: 0, y: 24 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "-80px" },
      transition: { duration: 1, ease: EASE, delay },
    }) as const;

  return (
    <PaperSection tone="paper">
      <Container>
        <IndexBar index={index} name="Partners" />
        <motion.h2 {...enter()} className="mt-6 max-w-[680px] text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]">
          Partnering with the best in <span style={{ color: PRINT }}>developer tooling</span>
        </motion.h2>

        <motion.div
          {...enter(0.08)}
          className="mt-10 overflow-hidden rounded-[6px] bg-white/80 ring-1 ring-inset ring-[#141414]/10"
          onMouseLeave={() => setHover(false)}
        >
          {/* The featured quote */}
          <figure className="relative isolate grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12 md:p-10" onMouseEnter={() => setHover(true)}>
            <div className="flex min-h-[230px] flex-col justify-between gap-8 md:min-h-[210px]">
              <div className="relative">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.blockquote
                    key={current.company}
                    {...fade}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="line-clamp-4 max-w-[860px] text-[21px] font-medium leading-[1.4] tracking-[-0.025em] md:text-[28px]"
                  >
                    &ldquo;{quote}&rdquo;
                  </motion.blockquote>
                </AnimatePresence>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.figcaption key={current.company} {...fade} transition={{ duration: 0.5, ease: EASE, delay: 0.06 }} className="flex items-center gap-3">
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-full bg-[#e6e1d9]">
                    <Image src={current.quote.avatar} alt="" fill sizes="44px" className="object-cover" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium">{current.quote.name}</span>
                    <span className="block truncate text-[13px] text-[#141414]/55">{current.quote.role}</span>
                  </span>
                </motion.figcaption>
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-1.5 md:flex-col md:items-end md:justify-between">
              <span className="mr-auto text-[13px] font-medium tabular-nums text-[#141414]/45 md:mr-0">
                <span style={{ color: PRINT }}>{pad(active + 1)}</span> / {pad(ENTRIES.length)}
              </span>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => step(-1)} aria-label="Previous partner" className="flex size-10 items-center justify-center rounded-[6px] ring-1 ring-inset ring-[#141414]/15 transition-colors hover:bg-[#141414] hover:text-white">
                  <ArrowLeft weight="bold" className="size-4" />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Next partner" className="flex size-10 items-center justify-center rounded-[6px] bg-[#141414] text-white transition-colors hover:bg-[#f97316]">
                  <ArrowRight weight="bold" className="size-4" />
                </button>
              </div>
            </div>
          </figure>

          {/* Every partner, as even tiles */}
          <ul className="grid grid-cols-3 gap-px border-t border-[#141414]/[0.08] bg-[#141414]/[0.08] sm:grid-cols-5">
            {ENTRIES.map((e, i) => (
              <li key={e.company} className="bg-[#f8f6f2]">
                <button
                  type="button"
                  aria-label={`${e.company}: what they said`}
                  aria-pressed={i === active}
                  onMouseEnter={() => {
                    setHover(true);
                    window.clearTimeout(rest.current);
                    rest.current = window.setTimeout(() => setActive(i), 60);
                  }}
                  onFocus={() => {
                    setHover(true);
                    setActive(i);
                  }}
                  onClick={() => setActive(i)}
                  className={cn(
                    "group/row flex h-[80px] w-full items-center justify-center px-4 outline-none transition-colors duration-500 hover:bg-white md:h-[96px] md:px-6",
                    i === active ? "bg-white" : "",
                  )}
                >
                  <Mark p={e} active={i === active} align="center" scale={0.9} />
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      </Container>
    </PaperSection>
  );
}
