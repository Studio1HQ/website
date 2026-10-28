"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  BookOpenText,
  Code,
  Megaphone,
  PenNib,
  VideoCamera,
  type Icon,
} from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import { PaperSection } from "@/components/paper/paper-sections";
import { PrintBlock, SelectionFrame } from "@/components/paper/paper-hero";
import { Icon3D } from "@/components/about-us/hero-arrows";
import Logo from "@/components/ui/svgs/logo";
import { homeTestimonials } from "@/data/home";
import { PAPER, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/*
 * Studio overview as three cards: a wide statement card with the Studio1
 * mark in a selection frame and the leadership as chips, a map of how the
 * services connect, and a "developer-first" card with a large 3D tile.
 * Copy is reused from elsewhere on the site.
 */

type Node = {
  name: string;
  sub: string;
  icon?: Icon;
  badge?: string;
};

const ROOT: Node = {
  name: "Studio1",
  sub: "35+ teams helped",
  badge: "Partner",
};
const CONTENT: Node = {
  name: "Technical Content",
  sub: "300+ tutorials & guides",
  icon: PenNib,
};
const DEVREL: Node = {
  name: "DevRel & Growth",
  sub: "10+ high-impact events",
  icon: Megaphone,
};
const DOCS: Node = {
  name: "Docs & DX",
  sub: "15+ docs audits",
  icon: BookOpenText,
};
const VIDEO: Node = {
  name: "Video Production",
  sub: "Demos · Tutorials · Shorts",
  icon: VideoCamera,
};

/* Dotted connector pieces. Columns are centred at 23% and 77%. */
const V =
  "s1-flow-v absolute w-[2px] -translate-x-1/2 origin-top bg-[repeating-linear-gradient(to_bottom,rgba(42,15,0,0.6)_0_2px,transparent_2px_6px)]";
const H =
  "s1-flow-h absolute h-[2px] -translate-y-1/2 origin-left bg-[repeating-linear-gradient(to_right,rgba(42,15,0,0.6)_0_2px,transparent_2px_6px)]";

function Dot({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2a0f00]",
        className,
      )}
    />
  );
}

function MapNode({ node, delay }: { node: Node; delay: number }) {
  const reduceMotion = useReducedMotion();
  const NodeIcon = node.icon;
  return (
    <motion.div
      className="rounded-[8px] bg-[#141414]/80 p-3 text-white shadow-[0_18px_34px_-18px_rgba(20,20,20,0.6)] backdrop-blur-md"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-full"
          style={{ background: PRINT }}
        >
          {NodeIcon ? (
            <NodeIcon weight="bold" className="size-3.5" />
          ) : (
            <Logo className="size-3.5 brightness-0 invert" />
          )}
        </span>
        <span className="truncate text-[13px] font-medium">{node.name}</span>
        {node.badge ? (
          <span className="ml-auto rounded-full bg-[#f97316] px-2 py-0.5 text-[10px] font-medium">
            {node.badge}
          </span>
        ) : null}
      </div>
      <p className="mt-2 border-t border-dashed border-white/20 pt-2 text-[11.5px] text-white/70">
        {node.sub}
      </p>
    </motion.div>
  );
}

/** How the services connect, as a small org chart with dotted connectors. */
function ServiceMap() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[520px] flex-col justify-center">
      <div className="mx-auto w-[46%]">
        <MapNode node={ROOT} delay={0} />
      </div>

      {/* Root splits into two columns */}
      <div aria-hidden className="relative h-10">
        <span className={cn(V, "left-1/2 top-0 h-1/2")} />
        <span className={cn(H, "left-[23%] right-[23%] top-1/2")} />
        <span className={cn(V, "left-[23%] top-1/2 h-1/2")} />
        <span className={cn(V, "left-[77%] top-1/2 h-1/2")} />
        <Dot className="left-1/2 top-0" />
        <Dot className="left-[23%] top-full" />
        <Dot className="left-[77%] top-full" />
      </div>

      <div className="grid grid-cols-2 gap-[8%]">
        <MapNode node={CONTENT} delay={0.1} />
        <MapNode node={DEVREL} delay={0.15} />
      </div>

      <div aria-hidden className="relative h-8">
        <span className={cn(V, "left-[23%] top-0 h-full")} />
        <span className={cn(V, "left-[77%] top-0 h-full")} />
        <Dot className="left-[23%] top-0" />
        <Dot className="left-[23%] top-full" />
        <Dot className="left-[77%] top-0" />
      </div>

      <div className="relative grid grid-cols-2 gap-[8%]">
        <MapNode node={DOCS} delay={0.2} />
        <span aria-hidden className={cn(V, "left-[77%] top-0 h-full")} />
      </div>

      {/* Both columns join into Video */}
      <div aria-hidden className="relative h-10">
        <span className={cn(V, "left-[23%] top-0 h-1/2")} />
        <span className={cn(V, "left-[77%] top-0 h-1/2")} />
        <span className={cn(H, "left-[23%] right-[23%] top-1/2")} />
        <span className={cn(V, "left-1/2 top-1/2 h-1/2")} />
        <Dot className="left-[23%] top-0" />
        <Dot className="left-1/2 top-full" />
      </div>

      <div className="mx-auto w-[46%]">
        <MapNode node={VIDEO} delay={0.25} />
      </div>
    </div>
  );
}

/* Clients quoted on the home page; their photos sit around the mark. */
const VOICES = homeTestimonials
  .filter((item) =>
    ["Jesse Williams", "Dylan Bristot", "Sakshi Sen"].includes(item.name),
  )
  .map((item) => ({ name: item.name, role: item.role, image: item.avatar }));

export function StudioBento() {
  const reduceMotion = useReducedMotion();
  const enter = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.9, ease: EASE, delay },
  });

  return (
    <PaperSection tone="paper" className="py-10 md:py-14">
      <Container>
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Wide statement card */}
          <motion.div
            {...enter(0)}
            className="relative grid overflow-hidden rounded-[14px] p-7 md:p-12 lg:col-span-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center"
            style={{
              background:
                "linear-gradient(180deg, #e6ddd2 0%, #f3cfa8 70%, #f9b77c 100%)",
            }}
          >
            <div className="relative z-10 max-w-[460px]">
              <h2 className="text-[34px] font-semibold leading-[1.02] tracking-[-0.05em] text-[#2a0f00] sm:text-[44px] md:text-[52px]">
                We empower tech brands to build thriving developer communities
              </h2>
              <p className="mt-5 text-[15px] leading-[1.6] text-[#2a0f00]/75">
                Turn technical complexity into developer-friendly storytelling.
                Drive measurable growth with every project.
              </p>
              <a
                href="https://cal.com/studio1/collab"
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-8 inline-flex h-11 items-center gap-2 rounded-[8px] px-5 text-[14px] font-medium transition-transform duration-300 hover:-translate-y-0.5"
                style={{ background: "#2a0f00", color: PAPER }}
              >
                Book a call
                <ArrowUpRight
                  weight="bold"
                  className="size-4 transition-transform duration-300 group-hover:rotate-45"
                />
              </a>
            </div>

            <div className="relative mt-12 flex justify-center lg:mt-0">
              <SelectionFrame
                label="studio1-mark"
                labelPosition="top-left"
                className="p-3"
              >
                <PrintBlock className="flex size-[200px] rotate-[-3deg] items-center justify-center rounded-[28px] shadow-[0_30px_60px_-30px_rgba(120,40,0,0.7)] sm:size-[260px]">
                  <Logo className="relative size-[58%] brightness-0 invert" />
                </PrintBlock>
              </SelectionFrame>

              {/* Client voices from the home page, as one avatar stack */}
              <motion.div
                className="absolute -bottom-4 right-0 flex items-center gap-3 rounded-full bg-white/80 py-1.5 pl-1.5 pr-4 shadow-[0_18px_34px_-18px_rgba(60,20,0,0.45)] ring-1 ring-[#141414]/[0.06] backdrop-blur-md sm:right-[4%]"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.3 }}
              >
                <span className="flex -space-x-3">
                  {VOICES.map((voice) => (
                    <span
                      key={voice.name}
                      title={`${voice.name}, ${voice.role}`}
                      className="relative size-11 overflow-hidden rounded-full border-[3px] border-white bg-[#ece5da]"
                    >
                      <Image
                        src={voice.image}
                        alt={`${voice.name}, ${voice.role}`}
                        fill
                        sizes="44px"
                        className="object-cover object-top"
                      />
                    </span>
                  ))}
                </span>
                <span className="leading-tight">
                  <span className="block text-[13px] font-medium text-[#141414]">
                    Trusted by DevRel leads
                  </span>
                  <span className="block text-[11.5px] text-[#141414]/55">
                    at Jozu, Nebius &amp; Entelligence
                  </span>
                </span>
              </motion.div>
            </div>
          </motion.div>

          {/* How the services connect */}
          <motion.div
            {...enter(0.1)}
            className="relative overflow-hidden rounded-[14px] p-6 md:p-10"
            style={{
              background:
                "linear-gradient(180deg, #ebe5dc 0%, #f6dcbf 55%, #fbc28a 100%)",
            }}
          >
            <ServiceMap />
          </motion.div>

          {/* Developer-first card */}
          <motion.div
            {...enter(0.18)}
            className="relative min-h-[420px] overflow-hidden rounded-[14px] bg-[#ebe7e1] p-6 md:p-10"
          >
            <span className="inline-flex rounded-full bg-[#f97316] px-5 py-2 font-mono text-[15px] uppercase tracking-[0.06em] text-white">
              Developer-first
            </span>
            <p className="mt-5 max-w-[300px] text-[15px] leading-[1.6] text-[#141414]/65">
              Deliver clear, technical content that developers value.
            </p>
            <div className="absolute -bottom-[12%] -right-[6%] w-[62%] rotate-[-12deg]">
              <Icon3D icon={Code} className="w-full" />
            </div>
          </motion.div>
        </div>
      </Container>
    </PaperSection>
  );
}
