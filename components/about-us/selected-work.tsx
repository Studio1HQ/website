"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { getClientLogo } from "@/components/case-studies/client-logos";
import { Container, EASE } from "@/components/home/ui";
import { IndexBar, PaperSection } from "@/components/paper/paper-sections";

/*
 * Selected work as glass folders, grouped by what we did. Each folder holds
 * the case study's image like a print tucked inside; on hover (or tap) the
 * print slides up out of the folder. The client and result are written on
 * the folder's glass front.
 */

type Tab = "devrel" | "content" | "docs";

const GROUPS: { key: Tab; label: string; note: string; slugs: string[] }[] = [
  {
    key: "devrel",
    label: "DevRel & Community",
    note: "Workshops, talks, launches and community programs.",
    slugs: ["nebius", "openlore", "jozu"],
  },
  {
    key: "content",
    label: "Content & SEO",
    note: "Search-led tutorials and technical writing that ranks.",
    slugs: ["entelligence-ai", "brightdata", "tensorlake"],
  },
  {
    key: "docs",
    label: "Docs & DX",
    note: "Docs revamps and developer experience audits.",
    slugs: ["litellm", "corsair"],
  },
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

const TINTS = [
  {
    tab: "#fbcfa6",
    from: "#fde2cb",
    to: "#f9b98a",
    glass: "rgba(255,255,255,0.8)",
  },
];

function Folder({
  project,
  order,
  tint,
}: {
  project: Project;
  order: number;
  tint: number;
}) {
  const colors = TINTS[tint % TINTS.length];
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const logo = getClientLogo(project.slug);
  const lift = open && !reduceMotion;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, ease: EASE, delay: order * 0.08 }}
    >
      <Link
        href={`/case-studies/${project.slug}`}
        className="group relative block pt-10"
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <div className="relative aspect-[1/1]">
          {/* Back of the folder, with its tab */}
          <span
            aria-hidden
            className="absolute -top-[14px] left-0 h-[18px] w-[38%] rounded-t-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] after:absolute after:-right-3 after:bottom-0 after:size-3 after:bg-[radial-gradient(circle_at_100%_0,transparent_11px,var(--tab)_12px)]"
            style={{ background: colors.tab, ["--tab" as string]: colors.tab }}
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-[14px] rounded-tl-none shadow-[inset_0_1px_0_#fff,inset_0_0_0_1px_rgba(255,255,255,0.7),0_12px_24px_-20px_rgba(20,20,20,0.25)] ring-1 ring-[#141414]/[0.06] backdrop-blur-md"
            style={{
              background: `linear-gradient(180deg, ${colors.from}, ${colors.to})`,
            }}
          />

          {/* The print inside; slides up and out on hover */}
          <motion.div
            className="absolute inset-x-[6%] top-[5%] h-[74%]"
            animate={lift ? { y: "-22%" } : { y: "0%" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <div className="relative h-full">
              <Image
                src={project.image}
                alt={`${project.client} case study`}
                fill
                sizes="(max-width: 768px) 90vw, 380px"
                className="object-contain object-top drop-shadow-[0_18px_24px_rgba(20,20,20,0.3)]"
              />
            </div>
          </motion.div>

          {/* Glass front pocket with the writing */}
          <div
            className="absolute inset-x-0 bottom-0 h-[56%] overflow-hidden rounded-[14px] shadow-[0_-1px_0_rgba(20,20,20,0.04)] backdrop-blur-xl backdrop-saturate-150"
            style={{ background: colors.glass }}
          >
            {/* the pocket's lip: a light edge and a faint orange hairline */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-10 top-px h-px bg-[linear-gradient(90deg,transparent,rgba(249,115,22,0.45),transparent)]"
            />
            {/* light catching the glass */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.7)_0%,transparent_40%)]"
            />
            <div className="relative flex h-full flex-col p-5">
              <div className="flex items-center gap-2.5">
                {logo ? (
                  <span className="relative size-8 shrink-0 overflow-hidden rounded-[8px] shadow-[0_4px_10px_-6px_rgba(20,20,20,0.35)]">
                    <Image
                      src={logo.icon}
                      alt=""
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </span>
                ) : null}
                <span className="text-[18px] font-medium tracking-[-0.03em] text-[#141414]">
                  {project.client}
                </span>
                <span className="ml-auto text-[12px] font-medium tabular-nums text-[#141414]/45">
                  {project.year}
                </span>
              </div>
              <p className="mt-3 line-clamp-3 pr-8 text-[13.5px] leading-[1.5] text-[#141414]/70">
                {project.summary}
              </p>
              <span
                aria-hidden
                className="absolute bottom-4 right-4 flex size-8 items-center justify-center rounded-full bg-white/70 text-[#141414]/70 shadow-[inset_0_1px_0_#fff] transition-all duration-300 group-hover:rotate-45 group-hover:bg-[#141414] group-hover:text-white"
              >
                <ArrowUpRight weight="bold" className="size-3.5" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

const GUTTER = "max(1rem, calc((100vw - 1300px) / 2 + 2rem))";

function GroupRow({
  group,
  number,
}: {
  group: (typeof GROUPS)[number];
  number: number;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const items = group.slugs
    .map((slug) => PROJECTS.find((p) => p.slug === slug))
    .filter((p): p is Project => Boolean(p));
  const scrollRow = (direction: 1 | -1) =>
    rowRef.current?.scrollBy({
      left: direction * 344,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  const fade =
    "linear-gradient(to right, black 0, black calc(100% - 96px), transparent 100%)";

  return (
    <div className="grid gap-6 border-t border-[#141414]/[0.1] pt-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
      {/* Group panel: a frosted card the height of the folders */}
      <div className="relative flex flex-col overflow-hidden rounded-[16px] bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(254,232,214,0.75))] p-6 shadow-[inset_0_1px_0_#fff,0_12px_24px_-20px_rgba(20,20,20,0.25)] ring-1 ring-[#141414]/[0.06] backdrop-blur-md lg:mt-10 lg:h-[324px] lg:self-start">
        <div className="flex items-center justify-end">
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11.5px] font-medium tabular-nums text-[#141414]/60 ring-1 ring-[#141414]/[0.06]">
            {items.length} projects
          </span>
        </div>
        <h3 className="mt-4 text-[26px] font-medium leading-[1.1] tracking-[-0.04em]">
          {group.label}
        </h3>
        <p className="mt-3 text-[14px] leading-[1.55] text-[#141414]/60">
          {group.note}
        </p>

        {/* Client logos in this group */}
        <div className="mt-6 flex gap-2">
          {items.map((project) => {
            const logo = getClientLogo(project.slug);
            return logo ? (
              <span
                key={project.slug}
                title={project.client}
                className="relative size-8 overflow-hidden rounded-[8px] shadow-[0_4px_10px_-6px_rgba(20,20,20,0.35)]"
              >
                <Image
                  src={logo.icon}
                  alt={project.client}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </span>
            ) : null;
          })}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-[#141414]/[0.08] pt-5 [margin-top:max(1.5rem,auto)]">
          <span className="text-[12.5px] text-[#141414]/50">
            Scroll to explore
          </span>
          <span className="flex gap-2">
            {([-1, 1] as const).map((dir) => {
              const Icon = dir === -1 ? ArrowLeft : ArrowRight;
              return (
                <button
                  key={dir}
                  type="button"
                  onClick={() => scrollRow(dir)}
                  aria-label={dir === -1 ? "Previous" : "Next"}
                  className="flex size-9 items-center justify-center rounded-full bg-white text-[#141414] shadow-[0_10px_22px_-14px_rgba(20,20,20,0.5)] ring-1 ring-[#141414]/[0.08] transition-colors hover:bg-[#141414] hover:text-white"
                >
                  <Icon weight="bold" className="size-3.5" />
                </button>
              );
            })}
          </span>
        </div>
      </div>

      {/* Row: scrolls sideways and fades out at its right edge */}
      <div
        ref={rowRef}
        className="-mx-4 flex snap-x snap-mandatory gap-5 -mb-10 overflow-x-auto px-4 pb-16 [scrollbar-width:none] lg:mx-0 lg:px-0 lg:pr-24 [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
      >
        {items.map((project, i) => (
          <div
            key={project.slug}
            className="w-[290px] shrink-0 snap-start md:w-[324px]"
          >
            <Folder project={project} order={i} tint={0} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SelectedWork({ index = 3 }: { index?: number }) {
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

        <h2 className="mt-12 text-[36px] font-medium leading-[1.05] tracking-[-0.05em] sm:text-[46px] lg:text-[54px]">
          Work that moved
          <br />
          <span className="text-[#f97316]">developer adoption</span>
        </h2>

        <div className="mt-14 space-y-14">
          {GROUPS.map((group, g) => (
            <GroupRow key={group.key} group={group} number={g + 1} />
          ))}
        </div>
      </Container>
    </PaperSection>
  );
}
