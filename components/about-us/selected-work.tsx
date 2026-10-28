"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import { getClientLogo } from "@/components/case-studies/client-logos";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { Container, EASE } from "@/components/home/ui";
import { IndexBar, PaperSection } from "@/components/paper/paper-sections";
import { cn } from "@/lib/utils";

/*
 * Selected work: four real images from case studies stepping down the
 * page, each with the case study's own summary and its year underneath.
 */

type Tab = "devrel" | "content" | "docs";

const TABS: { key: Tab | "all"; label: string }[] = [
  { key: "all", label: "All work" },
  { key: "devrel", label: "DevRel & Community" },
  { key: "content", label: "Content & SEO" },
  { key: "docs", label: "Docs & DX" },
];

type Project = {
  slug: string;
  client: string;
  tab: Tab;
  image: string;
  year: string;
  summary: string;
};

/* Summaries and years are each case study's own. */
const PROJECTS: Project[] = [
  {
    slug: "nebius",
    client: "Nebius",
    tab: "devrel",
    image: "/case-studies/nebius/workshop-dublin-poster.webp",
    year: "2025",
    summary:
      "300+ deliverables, 29 framework integrations, an open-source library with 16K+ stars, and launch support across every major Token Factory moment.",
  },
  {
    slug: "openlore",
    client: "OpenLore",
    tab: "devrel",
    image: "/case-studies/openlore/openlore-hackspire-talk.webp",
    year: "2026",
    summary:
      "A DX audit, sharper positioning, talks, content, and demo projects drove 12x GitHub star growth and 100K+ impressions for OpenLore in one month.",
  },
  {
    slug: "litellm",
    client: "LiteLLM",
    tab: "docs",
    image: "/case-studies/litellm/github-guides-activity.webp",
    year: "2025",
    summary:
      "A ground-up docs revamp, new Learn section, SDK and Gateway quickstarts, restructured integrations, publicly endorsed by LiteLLM's CEO.",
  },
  {
    slug: "jozu",
    client: "Jozu",
    tab: "devrel",
    image: "/case-studies/jozu/kubecon-jozu-booth.webp",
    year: "2026",
    summary:
      "Developer advocacy, KitOps community support, event representation, blogs, technical talks, and ecosystem collaboration for Jozu and its open-source ecosystem.",
  },
  {
    slug: "entelligence-ai",
    client: "Entelligence AI",
    tab: "content",
    image: "/case-studies/entelligence-ai/openclaw-technical-deep-dive.webp",
    year: "2026",
    summary:
      "Technical blogs, deep dives, social content, and community distribution generated 304K+ impressions from Reddit.",
  },
  {
    slug: "memori",
    client: "Memori",
    tab: "devrel",
    image: "/case-studies/memori/memori-reddit-launch-stats.png",
    year: "2025",
    summary:
      "Community-led launch support, hands-on demo agents, and developer feedback helped an early OSS project grow to 12,000+ GitHub stars.",
  },
  {
    slug: "brightdata",
    client: "Bright Data",
    tab: "content",
    image: "/case-studies/brightdata/docs-deep-research-architecture.webp",
    year: "2026",
    summary:
      "50+ live posts, first-place Google results on category comparisons, docs architecture for AI engineers, and SEO review across blog and partner content.",
  },
  {
    slug: "corsair",
    client: "Corsair",
    tab: "docs",
    image: "/case-studies/corsair/slideflow-demo.webp",
    year: "2026",
    summary:
      "Onboarding audits, example projects, community events, and posts that grew an early open-source repo from about 300 to 2,000 GitHub stars.",
  },
  {
    slug: "tensorlake",
    client: "Tensorlake",
    tab: "content",
    image: "/case-studies/tensorlake/model-comparison.webp",
    year: "2026",
    summary:
      "Search-led technical articles, diagram-rich tutorials, and launch projects that connected Tensorlake with relevant developer audiences.",
  },
];

function logoFor(slug: string) {
  const logo = getClientLogo(slug);
  return logo ? (
    <Image
      src={logo.icon}
      alt=""
      className="size-4 rounded-[3px] object-contain"
    />
  ) : null;
}

export function SelectedWork({ index = 3 }: { index?: number }) {
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<Tab | "all">("all");
  // Up to four per view, one row, like a studio's selected projects.
  const rowRef = useRef<HTMLDivElement>(null);
  const { scrollXProgress } = useScroll({ container: rowRef });
  const trackLeft = useTransform(scrollXProgress, (v) => `${v * 100}%`);
  const shown = PROJECTS.filter((p) => tab === "all" || p.tab === tab);
  const scrollRow = (direction: 1 | -1) =>
    rowRef.current?.scrollBy({
      left: direction * 380,
      behavior: reduceMotion ? "auto" : "smooth",
    });

  return (
    <PaperSection tone="paper" className="py-12 md:py-16">
      <Container>
        <IndexBar
          index={index}
          name="Selected work"
          aside={
            <Link
              href="/case-studies"
              className="text-[#141414] underline decoration-[#141414]/25 underline-offset-4 transition-colors hover:decoration-[#f97316]"
            >
              View all case studies
            </Link>
          }
        />

        <div className="mt-12">
          {/* Heading on the left, filter and arrows on the right */}
          <div className="mb-12 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="text-[36px] font-medium leading-[1.05] tracking-[-0.05em] sm:text-[46px] lg:text-[54px]">
              Work that moved
              <br />
              <span className="text-[#f97316]">developer adoption</span>
            </h2>
            <div className="flex items-center gap-3">
              <div
                role="tablist"
                aria-label="Filter selected work"
                className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-white/70 p-1 shadow-[inset_0_1px_0_#fff,0_10px_24px_-18px_rgba(20,20,20,0.4)] ring-1 ring-inset ring-[#141414]/[0.08] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {TABS.map((item) => {
                  const active = tab === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setTab(item.key);
                        rowRef.current?.scrollTo({ left: 0 });
                      }}
                      className={cn(
                        "relative whitespace-nowrap rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors duration-300 sm:px-5",
                        active
                          ? "text-white"
                          : "text-[#141414]/60 hover:text-[#141414]",
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="work-filter"
                          className="absolute inset-0 rounded-full bg-[#141414]"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 32,
                          }}
                        />
                      ) : null}
                      <span className="relative">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              {[
                {
                  dir: -1 as const,
                  Icon: ArrowLeft,
                  label: "Previous case studies",
                },
                {
                  dir: 1 as const,
                  Icon: ArrowRight,
                  label: "Next case studies",
                },
              ].map(({ dir, Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => scrollRow(dir)}
                  aria-label={label}
                  className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-white/90 text-[#141414] shadow-[0_14px_30px_-14px_rgba(20,20,20,0.5)] ring-1 ring-[#141414]/[0.08] transition-colors hover:bg-[#141414] hover:text-white md:flex"
                >
                  <Icon weight="bold" className="size-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Gallery: image cards with a white note overlapping each */}
          <div className="relative">
            {/* Edge fades: the gallery dissolves into the paper on both sides */}
            {(["left", "right"] as const).map((side) => (
              <span
                key={side}
                aria-hidden
                className={cn(
                  "pointer-events-none absolute -inset-y-10 z-10 w-[max(3rem,calc((100vw_-_1300px)/2_+_3rem))]",
                  side === "left"
                    ? "left-1/2 -ml-[50vw]"
                    : "right-1/2 -mr-[50vw]",
                )}
                style={{
                  background: `linear-gradient(to ${side === "left" ? "right" : "left"}, #e9e4dc 0%, rgba(233,228,220,0.85) 30%, rgba(233,228,220,0.4) 65%, rgba(233,228,220,0) 100%)`,
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  maskImage: `linear-gradient(to ${side === "left" ? "right" : "left"}, black 40%, transparent), linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)`,
                  WebkitMaskImage: `linear-gradient(to ${side === "left" ? "right" : "left"}, black 40%, transparent), linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)`,
                  maskComposite: "intersect",
                  WebkitMaskComposite: "source-in",
                }}
              />
            ))}
            <div
              ref={rowRef}
              className="relative left-1/2 flex w-screen -translate-x-1/2 snap-x snap-mandatory items-center gap-6 overflow-x-auto pb-16 pt-4 -mb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{
                paddingInline: "max(1rem, calc((100vw - 1300px) / 2 + 2rem))",
                scrollPaddingInline:
                  "max(1rem, calc((100vw - 1300px) / 2 + 2rem))",
              }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {shown.map((project, position) => {
                  const big = position % 2 === 0;
                  return (
                    <motion.div
                      key={project.slug}
                      layout
                      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{
                        duration: 0.6,
                        ease: EASE,
                        delay: Math.min(position, 4) * 0.05,
                      }}
                      className="shrink-0 snap-start"
                    >
                      <Link
                        href={`/case-studies/${project.slug}`}
                        className={cn(
                          "group relative block",
                          big
                            ? "w-[300px] md:w-[440px]"
                            : "w-[260px] md:w-[340px]",
                        )}
                      >
                        <div
                          className={cn(
                            "relative overflow-hidden rounded-[18px] bg-[#f1ece4]",
                            big
                              ? "aspect-[4/5] md:ml-[30%] md:w-[70%]"
                              : "aspect-[1.4] md:w-[78%]",
                          )}
                        >
                          <Image
                            src={project.image}
                            alt={`${project.client} case study`}
                            fill
                            sizes="(max-width: 768px) 300px, 320px"
                            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                          />
                        </div>
                        {/* Note overlapping the image */}
                        <div
                          className={cn(
                            "relative z-10 -mt-16 w-[78%] rounded-[16px] bg-[#f7f4ef]/95 p-4 shadow-[0_1px_2px_rgba(20,20,20,0.06),0_18px_36px_-24px_rgba(20,20,20,0.35)] ring-1 ring-[#141414]/[0.06] backdrop-blur-md transition-transform duration-500 group-hover:-translate-y-1 md:w-[62%]",
                            big
                              ? "md:-mt-40 md:mr-auto"
                              : "md:ml-auto md:-mt-24",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="flex items-center gap-2">
                              <span className="text-[14px] font-semibold tracking-[-0.02em] text-[#141414]">
                                {project.client}
                              </span>
                              <span className="rounded-full bg-[#141414]/[0.06] px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#141414]/60">
                                {project.year}
                              </span>
                            </span>
                            <span className="flex gap-1">
                              <span className="flex size-7 items-center justify-center rounded-full ring-1 ring-[#141414]/25">
                                {logoFor(project.slug)}
                              </span>
                              <span className="flex size-7 items-center justify-center rounded-full text-[#141414] ring-1 ring-[#141414]/25 transition-colors group-hover:bg-[#141414] group-hover:text-white">
                                <ArrowUpRight
                                  weight="bold"
                                  className="size-3"
                                />
                              </span>
                            </span>
                          </div>
                          <p className="mt-6 line-clamp-3 text-[14px] font-medium leading-[1.35] tracking-[-0.01em] text-[#141414]">
                            {project.summary}
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Dotted scale tracking how far the gallery has scrolled */}
          <div className="relative mx-auto mt-6 max-w-[520px]">
            <div
              aria-hidden
              className="h-[2px] w-full [background-image:radial-gradient(circle,rgba(20,20,20,0.35)_1px,transparent_1.4px)] [background-size:8px_2px]"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 -top-1 flex justify-between"
            >
              {Array.from({ length: 11 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-px bg-[#141414]/30",
                    i % 5 === 0 ? "h-3" : "h-2",
                  )}
                />
              ))}
            </div>
            <motion.span
              aria-hidden
              className="absolute -top-[5px] size-3 -translate-x-1/2 rounded-full bg-[#f97316] shadow-[0_0_0_4px_rgba(249,115,22,0.18)]"
              style={{ left: trackLeft }}
            />
          </div>
        </div>
      </Container>
    </PaperSection>
  );
}
