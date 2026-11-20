"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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

/** Every mark in the same ink, through a mask, so the wall reads as one set. */
function Mark({ p, active }: { p: Partner; active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block w-full transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        active ? "scale-[1.04] opacity-100" : "opacity-45 group-hover/cell:opacity-80",
      )}
      style={{
        height: p.height,
        backgroundColor: "#141414",
        WebkitMask: `url(${p.logo}) center / contain no-repeat`,
        mask: `url(${p.logo}) center / contain no-repeat`,
      }}
    />
  );
}

export function PartnerWall({ index }: { index: number }) {
  const reduce = !!useReducedMotion();
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState(false);
  const rest = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (reduce || hover) return;
    const id = window.setInterval(() => setActive((v) => (v + 1) % ENTRIES.length), TURN);
    return () => window.clearInterval(id);
  }, [reduce, hover]);
  const current = ENTRIES[active];
  if (!current) return null;
  const words = current.quote.content.replace(/\s+/g, " ").trim();
  const quote = words.length > 260 ? `${words.slice(0, words.lastIndexOf(" ", 255))}…` : words;

  return (
    <PaperSection tone="paper">
      <Container>
        <IndexBar index={index} name="Partners" />
        <motion.h2
          initial={reduce ? false : { opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.1, ease: EASE }}
          className="mt-6 max-w-[680px] text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]"
        >
          Partnering with the best in <span style={{ color: PRINT }}>developer tooling</span>
        </motion.h2>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.1 }}
          className="mt-10 grid overflow-hidden rounded-[6px] bg-white/80 ring-1 ring-inset ring-[#141414]/10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
          onMouseLeave={() => setHover(false)}
        >
          <ul className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-5">
            {ENTRIES.map((e, i) => (
              <li key={e.company} className="border-b border-r border-[#141414]/[0.08]">
                <button
                  type="button"
                  aria-label={`${e.company}: what they said`}
                  aria-pressed={i === active}
                  onMouseEnter={() => {
                    setHover(true);
                    window.clearTimeout(rest.current);
                    rest.current = window.setTimeout(() => setActive(i), 90);
                  }}
                  onFocus={() => {
                    setHover(true);
                    setActive(i);
                  }}
                  onClick={() => setActive(i)}
                  className={cn(
                    "group/cell relative flex h-[92px] w-full items-center justify-center px-4 outline-none transition-colors duration-700 md:h-[110px] md:px-6",
                    i === active ? "bg-[#141414]/[0.035]" : "",
                  )}
                >
                  {i === active ? (
                    <motion.span layoutId="partner-active" aria-hidden className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: PRINT }} transition={{ type: "spring", bounce: 0, duration: 0.7 }} />
                  ) : null}
                  <Mark p={e} active={i === active} />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex min-h-[300px] flex-col justify-between gap-8 border-t border-[#141414]/[0.08] p-7 md:p-9 lg:border-l lg:border-t-0">
            <div>
              <p className="text-[13px] font-medium tabular-nums" style={{ color: PRINT }}>
                {String(active + 1).padStart(2, "0")} / {String(ENTRIES.length).padStart(2, "0")}
              </p>
              <div className="relative mt-4">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.blockquote
                    key={current.company}
                    className="text-[19px] font-medium leading-[1.45] tracking-[-0.02em] md:text-[21px]"
                    initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                    transition={{ duration: 0.5, ease: EASE }}
                  >
                    &ldquo;{quote}&rdquo;
                  </motion.blockquote>
                </AnimatePresence>
              </div>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.company}
                className="flex items-center gap-3"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.08 }}
              >
                <span className="relative size-11 shrink-0 overflow-hidden rounded-full bg-[#e6e1d9]">
                  <Image src={current.quote.avatar} alt="" fill sizes="44px" className="object-cover" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium">{current.quote.name}</span>
                  <span className="block truncate text-[13px] text-[#141414]/55">{current.quote.role}</span>
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </Container>
    </PaperSection>
  );
}
