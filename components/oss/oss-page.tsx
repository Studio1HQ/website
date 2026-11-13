"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Bug,
  Check,
  Copy,
  GitFork,
  GitPullRequest,
  GithubLogo,
  HandHeart,
  Star,
  type Icon,
} from "@phosphor-icons/react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Container, EASE } from "@/components/home/ui";
import {
  Accent,
  CELL,
  CountUp,
  FAINT,
  IndexBar,
  MUTED,
  PaperCta,
  PaperSection,
  SectionHead,
  Selected,
} from "@/components/paper/paper-sections";
import {
  InkPill,
  RULED_LINES,
  Underlined,
  pad,
} from "@/components/hackathons/hackathon-ui";
import { ProjectIndex, type IndexFilter } from "@/components/oss/project-index";
import { StarCard } from "@/components/oss/star-card";
import {
  AWESOME_APP_COUNT,
  AWESOME_CATEGORIES,
  AWESOME_QUICKSTART,
  AWESOME_SNAPSHOT,
  AWESOME_SPONSORS,
  AWESOME_STACK,
  AWESOME_URL,
  OSS_ORG,
  OSS_ORG_URL,
  OSS_REPOS,
  type OssRepo,
} from "@/data/oss";
import { compactCount, type OssStats } from "@/lib/oss";
import { GRAIN, INK, NIGHT, PAPER, PAPER_SCOPE, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

type OssPageProps = { stats: OssStats };

/** Copies `text`, then shows a tick for a moment. */
function CopyButton({
  text,
  tone = "night",
}: {
  text: string;
  tone?: "night" | "paper";
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          // Clipboard blocked (insecure origin or permissions): leave as is.
        }
      }}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[4px] transition-colors",
        tone === "night"
          ? "text-[#f4efe7]/60 hover:bg-white/10 hover:text-[#f4efe7]"
          : "text-[#141414]/60 hover:bg-[#ece6dc] hover:text-[#141414]",
      )}
    >
      {copied ? (
        <Check weight="bold" className="size-4" style={{ color: PRINT }} />
      ) : (
        <Copy weight="bold" className="size-4" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function BrowseButton() {
  const reduceMotion = useReducedMotion();
  const ease = [0.65, 0, 0.35, 1] as const;
  return (
    <motion.a
      href="#projects"
      initial="rest"
      animate="rest"
      whileHover={reduceMotion ? undefined : "hover"}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      className="relative isolate inline-flex h-14 items-center gap-4 overflow-hidden rounded-full pl-8 pr-2 text-[16px] font-medium text-[#f4efe7]"
      style={{ background: INK }}
    >
      <motion.span
        className="relative"
        variants={{ rest: { x: 0 }, hover: { x: -4 } }}
        transition={{ duration: 0.5, ease }}
      >
        Browse projects
      </motion.span>
      <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-full">
        <motion.span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full"
          style={{ background: PRINT }}
          variants={{ rest: { scale: 1 }, hover: { scale: 14 } }}
          transition={{ duration: 0.7, ease }}
        />
        <motion.span
          variants={{ rest: { y: 0 }, hover: { y: [0, 16, -16, 0] } }}
          transition={{ duration: 0.6, ease, times: [0, 0.45, 0.46, 1] }}
        >
          <ArrowDown weight="bold" className="size-[18px] text-white" />
        </motion.span>
      </span>
    </motion.a>
  );
}

function OssHero({ stats }: OssPageProps) {
  const reduceMotion = useReducedMotion();
  const projects = AWESOME_APP_COUNT + OSS_REPOS.length;
  const totalStars =
    stats.awesome.stars +
    Object.values(stats.repos).reduce((total, repo) => total + repo.stars, 0);

  const rise = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.9, ease: EASE, delay },
        };

  return (
    <section
      id="hero"
      className="relative isolate overflow-hidden"
      style={{ background: PAPER, color: INK }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      <div aria-hidden className={RULED_LINES} />

      <Container className="pb-20 pt-32 md:pt-40 lg:pb-28">
        <div className="grid grid-cols-1 items-center gap-x-16 gap-y-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div>
            <motion.p
              {...rise(0)}
              className="flex flex-wrap items-center gap-3 text-[13px] font-medium"
            >
              <span className="relative flex size-2">
                <span
                  className="absolute inset-0 animate-ping rounded-full opacity-70 motion-reduce:hidden"
                  style={{ background: PRINT }}
                />
                <span
                  className="relative size-2 rounded-full"
                  style={{ background: PRINT }}
                />
              </span>
              Studio1 Open Source
              <span aria-hidden className="text-[#141414]/30">
                —
              </span>
              <span className="text-[#141414]/60">
                Free to clone, fork and ship
              </span>
            </motion.p>

            <motion.h1
              {...rise(0.08)}
              className="mt-8 text-[44px] font-medium leading-[1.04] tracking-[-0.055em] sm:text-[60px] xl:text-[72px]"
            >
              We Build AI Apps
              <br />
              in the <Underlined>Open</Underlined>
              <span style={{ color: PRINT }}>.</span>
            </motion.h1>

            <motion.p
              {...rise(0.16)}
              className="mt-8 max-w-[540px] text-[16px] leading-[1.7] text-[#141414]/70 sm:text-[17px]"
            >
              Awesome AI Apps puts {AWESOME_APP_COUNT} runnable LLM apps and
              agents in one repo. Studio1-OSS holds the full products we build
              on open models. All of it is on GitHub, with the code, the README
              and a .env.example for your own API keys.
            </motion.p>

            <motion.div
              {...rise(0.24)}
              className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-5"
            >
              <BrowseButton />
              <a
                href={AWESOME_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 text-[15px] font-medium underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]"
              >
                <Star
                  weight="fill"
                  className="size-4"
                  style={{ color: PRINT }}
                />
                Star Awesome AI Apps
                <ArrowUpRight
                  weight="bold"
                  className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </a>
            </motion.div>

            <motion.dl
              {...rise(0.32)}
              className="mt-12 grid max-w-[540px] grid-cols-3 border-t border-[#141414]/[0.12] pt-6"
            >
              {[
                { value: projects, suffix: "", label: "open-source projects" },
                {
                  value: Math.floor(totalStars / 1000),
                  suffix: "k",
                  label: "GitHub stars",
                },
                {
                  value: AWESOME_STACK.length,
                  suffix: "",
                  label: "frameworks covered",
                },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className={cn(
                    index > 0 &&
                      "border-l border-[#141414]/[0.12] pl-4 sm:pl-6",
                  )}
                >
                  <dt className="sr-only">{item.label}</dt>
                  <dd className="text-[30px] font-medium leading-none tracking-[-0.045em] sm:text-[36px]">
                    <CountUp value={item.value} suffix={item.suffix} />
                    <span style={{ color: PRINT }}>+</span>
                  </dd>
                  <dd className="mt-2 text-[12.5px] leading-snug text-[#141414]/60 sm:text-[13px]">
                    {item.label}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <StarCard
            stars={stats.awesome.stars}
            forks={stats.awesome.forks}
            contributors={AWESOME_SNAPSHOT.contributors}
            apps={AWESOME_APP_COUNT}
            asOf={stats.asOf}
            live={stats.live}
          />
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 01 — Awesome AI Apps                                                */
/* ------------------------------------------------------------------ */

function CategoryRows({ onPick }: { onPick: (filter: IndexFilter) => void }) {
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion();
  const max = Math.max(...AWESOME_CATEGORIES.map((category) => category.count));

  return (
    <ol
      ref={ref}
      className={cn(
        "divide-y divide-[#141414]/10 overflow-hidden",
        CELL,
        "hover:translate-y-0 hover:shadow-none",
      )}
    >
      {AWESOME_CATEGORIES.map((category, index) => (
        <li key={category.key}>
          {/* Lenis scrolls to the index; the click also sets its filter. */}
          <a
            href="#projects"
            onClick={() => onPick(category.key)}
            className="group grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 px-5 py-4 transition-colors duration-300 hover:bg-white sm:grid-cols-[32px_minmax(0,1fr)_minmax(0,140px)_44px] sm:gap-x-5 sm:px-6"
          >
            <span
              className="text-[12px] font-medium tabular-nums"
              style={{ color: PRINT }}
            >
              {pad(index + 1)}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-[16px] font-medium tracking-[-0.02em]">
                {category.label}
                <ArrowDown
                  weight="bold"
                  aria-hidden
                  className="size-3.5 -translate-y-1 text-[#c2410c] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                />
              </span>
              <span
                className={cn("mt-0.5 block truncate text-[13.5px]", MUTED)}
              >
                {category.blurb}
              </span>
            </span>
            <span
              aria-hidden
              className="relative hidden h-1.5 bg-[#141414]/[0.07] sm:block"
            >
              <motion.span
                className="absolute inset-y-0 left-0"
                style={{ background: index % 2 ? "#f89a5c" : PRINT }}
                initial={reduceMotion ? false : { width: 0 }}
                animate={{
                  width:
                    inView || reduceMotion
                      ? `${(category.count / max) * 100}%`
                      : 0,
                }}
                transition={{
                  duration: 1.1,
                  ease: EASE,
                  delay: 0.1 + index * 0.06,
                }}
              />
            </span>
            <span className="text-right text-[22px] font-medium leading-none tracking-[-0.04em] tabular-nums">
              {category.count}
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}

function Quickstart() {
  const script = AWESOME_QUICKSTART.filter((line) => line.command)
    .map((line) => line.command)
    .join("\n");
  return (
    <div
      className="overflow-hidden rounded-[6px] text-[#f4efe7]"
      style={{ background: NIGHT }}
    >
      <div className="flex items-center justify-between border-b border-white/10 py-2 pl-5 pr-2">
        <span className="font-mono text-[12px] text-[#f4efe7]/60">
          quickstart.sh
        </span>
        <CopyButton text={script} />
      </div>
      <pre
        data-lenis-prevent
        className="overflow-x-auto px-5 py-4 font-mono text-[13px] leading-[1.75]"
      >
        <code>
          {AWESOME_QUICKSTART.map((line, index) =>
            line.comment ? (
              <span key={index} className="block text-[#f4efe7]/45">
                # {line.comment}
              </span>
            ) : (
              <span key={index} className="block whitespace-pre">
                <span style={{ color: PRINT }}>$ </span>
                {line.command}
              </span>
            ),
          )}
        </code>
      </pre>
    </div>
  );
}

function AwesomeSection({
  index,
  stats,
  onPick,
}: {
  index: number;
  stats: OssStats;
  onPick: (filter: IndexFilter) => void;
}) {
  return (
    <PaperSection id="awesome-ai-apps" tone="paper" className="scroll-mt-24">
      <Container>
        <IndexBar
          index={index}
          name="Awesome AI Apps"
          aside={`Arindam200/awesome-ai-apps · ${AWESOME_SNAPSHOT.license}`}
        />
        <SectionHead
          title={
            <>
              {AWESOME_APP_COUNT} AI Apps, <Accent>Ready to Run</Accent>
            </>
          }
          description="From five-minute framework starters to multi-agent systems. Every project has its own folder, README, dependencies and .env.example: clone the repo, open one folder, add your keys, run it."
          action={
            <InkPill href={AWESOME_URL} external>
              Open on GitHub
            </InkPill>
          }
        />

        <div className="mt-10 grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div>
            <CategoryRows onPick={onPick} />
            <p className={cn("mt-3 px-1 text-[13px]", MUTED)}>
              Pick a category to see our favourites from it.
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <Quickstart />
            <div
              className={cn(
                "flex flex-1 flex-col p-6",
                CELL,
                "hover:translate-y-0",
              )}
            >
              <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-[#141414]/60">
                Built with
              </p>
              <ul role="list" className="mt-4 flex flex-wrap gap-1.5">
                {AWESOME_STACK.map((tool) => (
                  <li
                    key={tool}
                    className="px-2 py-1 text-[13px] font-medium ring-1 ring-inset ring-[#141414]/[0.12]"
                  >
                    {tool}
                  </li>
                ))}
              </ul>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
                {[
                  {
                    icon: Star,
                    label: "Stars",
                    value: compactCount(stats.awesome.stars),
                  },
                  {
                    icon: GitFork,
                    label: "Forks",
                    value: compactCount(stats.awesome.forks),
                  },
                ].map(({ icon: StatIcon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 bg-[#f4efe7] px-4 py-3"
                  >
                    <StatIcon
                      weight="bold"
                      className="size-4"
                      style={{ color: PRINT }}
                    />
                    <span className="text-[20px] font-medium leading-none tracking-[-0.03em] tabular-nums">
                      {value}
                      <span style={{ color: PRINT }}>+</span>
                    </span>
                    <span className={cn("text-[13px]", MUTED)}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 02 — Studio1-OSS (night band)                                       */
/* ------------------------------------------------------------------ */

function RepoMeta({
  repo,
  stars,
  forks,
}: {
  repo: OssRepo;
  stars: number;
  forks: number;
}) {
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[#f4efe7]/55">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="size-2" style={{ background: PRINT }} />
        {repo.language}
      </span>
      {repo.license ? <span>{repo.license}</span> : null}
      {stars ? (
        <span className="flex items-center gap-1 tabular-nums">
          <Star weight="fill" className="size-3.5" />
          {stars}
          <span className="sr-only">stars</span>
        </span>
      ) : null}
      {forks ? (
        <span className="flex items-center gap-1 tabular-nums">
          <GitFork weight="bold" className="size-3.5" />
          {forks}
          <span className="sr-only">forks</span>
        </span>
      ) : null}
    </span>
  );
}

function FeaturedRepo({
  repo,
  counts,
  selected,
}: {
  repo: OssRepo;
  counts: { stars: number; forks: number };
  selected?: boolean;
}) {
  const href = `${OSS_ORG_URL}/${repo.repo}`;
  return (
    <li className="relative flex min-w-0 flex-col rounded-[6px] bg-[#1d1d1d] p-6 ring-1 ring-inset ring-white/10 md:p-7">
      {selected ? <Selected label={`repo-${repo.repo.toLowerCase()}`} /> : null}
      <span className="flex items-center gap-2 text-[13px] text-[#f4efe7]/55">
        <GithubLogo weight="fill" className="size-4 text-[#f4efe7]" />
        {OSS_ORG} /
      </span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 w-fit text-[30px] font-medium leading-[1.1] tracking-[-0.045em] transition-colors after:absolute after:inset-0 after:rounded-[6px] after:content-[''] hover:text-[#f97316]"
      >
        {repo.name}
      </a>
      <p className="mt-3 text-[17px] leading-[1.45] tracking-[-0.02em] text-[#f4efe7]/90">
        {repo.tagline}
      </p>
      <p className="mt-3 text-[14.5px] leading-[1.6] text-[#f4efe7]/60">
        {repo.description}
      </p>

      {repo.install ? (
        <div className="relative z-10 mt-5 flex items-center gap-2 rounded-[6px] bg-black/60 py-1.5 pl-4 pr-1.5 ring-1 ring-inset ring-white/10">
          <code
            data-lenis-prevent
            className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px] [scrollbar-width:none]"
          >
            <span style={{ color: PRINT }}>$ </span>
            {repo.install}
          </code>
          <CopyButton text={repo.install} />
        </div>
      ) : null}

      <ul role="list" className="mt-5 flex flex-wrap gap-1.5">
        {repo.stack.map((tool) => (
          <li
            key={tool}
            className="px-1.5 py-[3px] text-[11.5px] font-medium leading-none text-[#f4efe7]/70 ring-1 ring-inset ring-white/15"
          >
            {tool}
          </li>
        ))}
      </ul>

      <span className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-7">
        <RepoMeta repo={repo} stars={counts.stars} forks={counts.forks} />
        <span className="relative z-10 flex items-center gap-2">
          {repo.homepage ? (
            <a
              href={repo.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border-[1.5px] border-[#f4efe7]/30 px-4 text-[13px] font-medium transition-colors hover:border-[#f4efe7] hover:bg-[#f4efe7] hover:text-[#141414]"
            >
              Website
              <ArrowUpRight weight="bold" className="size-3.5" />
            </a>
          ) : null}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#f4efe7] px-4 text-[13px] font-medium text-[#141414] transition-opacity hover:opacity-90"
          >
            Code
            <ArrowUpRight weight="bold" className="size-3.5" />
          </a>
        </span>
      </span>
    </li>
  );
}

function Studio1OssSection({
  index,
  stats,
}: {
  index: number;
  stats: OssStats;
}) {
  const featured = OSS_REPOS.filter((repo) => repo.featured);
  const rest = OSS_REPOS.filter((repo) => !repo.featured);
  const counts = (repo: OssRepo) => stats.repos[repo.repo] ?? repo;

  return (
    <PaperSection id="studio1-oss" tone="night" className="scroll-mt-24">
      <Container>
        <IndexBar
          index={index}
          name="Studio1-OSS"
          aside={`github.com/${OSS_ORG}`}
        />
        <SectionHead
          title={
            <>
              Full Products, <Accent>Open Source</Accent>
            </>
          }
          description="Apps we build end to end on open models: proactive agents, coding-agent tooling, benchmarks. Run them on your own machine with your own keys, and change anything."
          action={
            <InkPill href={OSS_ORG_URL} external tone="paper">
              Follow Studio1-OSS
            </InkPill>
          }
        />

        <ul role="list" className="mt-12 grid grid-cols-1 gap-2 md:grid-cols-2">
          {featured.map((repo, position) => (
            <FeaturedRepo
              key={repo.repo}
              repo={repo}
              counts={counts(repo)}
              selected={position === 0}
            />
          ))}
        </ul>

        <div className="mt-12 flex items-center gap-3 text-[13px] font-medium">
          <span aria-hidden className="size-2" style={{ background: PRINT }} />
          More from Studio1-OSS
        </div>
        <ul role="list" className="mt-4 border-t border-white/10">
          {rest.map((repo) => {
            const repoCounts = counts(repo);
            return (
              <li key={repo.repo} className="border-b border-white/10">
                <a
                  href={`${OSS_ORG_URL}/${repo.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group grid grid-cols-1 gap-x-8 gap-y-2 py-5 transition-colors md:grid-cols-[minmax(0,260px)_minmax(0,1fr)_auto] md:items-center"
                >
                  <span className="flex items-center gap-2 text-[18px] font-medium tracking-[-0.03em] transition-colors group-hover:text-[#f97316]">
                    {repo.name}
                    <ArrowUpRight
                      weight="bold"
                      aria-hidden
                      className="size-4 opacity-40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
                    />
                  </span>
                  <span className="text-[14.5px] leading-[1.55] text-[#f4efe7]/65">
                    {repo.tagline}
                  </span>
                  <RepoMeta
                    repo={repo}
                    stars={repoCounts.stars}
                    forks={repoCounts.forks}
                  />
                </a>
              </li>
            );
          })}
        </ul>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 04 — Get involved                                                   */
/* ------------------------------------------------------------------ */

const WAYS_IN: {
  icon: Icon;
  title: string;
  description: string;
  cta: string;
  href: string;
}[] = [
  {
    icon: Star,
    title: "Star the repos",
    description:
      "Stars are how other developers find these projects on GitHub.",
    cta: "Star Awesome AI Apps",
    href: AWESOME_URL,
  },
  {
    icon: GitPullRequest,
    title: "Add a project",
    description:
      "A runnable example with its own README, dependencies and .env.example. The guide has the template.",
    cta: "Read the guide",
    href: `${AWESOME_URL}/blob/main/CONTRIBUTING.md`,
  },
  {
    icon: Bug,
    title: "Fix an issue",
    description:
      "Pick an open issue, or report a bug you hit while running a project.",
    cta: "Open issues",
    href: `${AWESOME_URL}/issues`,
  },
  {
    icon: HandHeart,
    title: "Sponsor the work",
    description:
      "Put your product in front of developers building with LLMs, in the README they clone.",
    cta: "Become a sponsor",
    href: "mailto:contact@studio1hq.com?subject=Sponsoring%20Awesome%20AI%20Apps",
  },
];

function GetInvolved({ index }: { index: number }) {
  return (
    <PaperSection id="contribute" tone="paper" className="!pt-0">
      <Container>
        <IndexBar
          index={index}
          name="Get involved"
          aside="Open to contributors"
        />
        <SectionHead
          title={
            <>
              Star It, Fork It, <Accent>Ship Yours</Accent>
            </>
          }
          description={`${AWESOME_SNAPSHOT.contributors} people have shipped code to Awesome AI Apps so far. Add a project, fix something, or back the work.`}
        />
        <ul
          role="list"
          className="mt-10 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
        >
          {WAYS_IN.map((way, position) => {
            const WayIcon = way.icon;
            const external = way.href.startsWith("http");
            return (
              <li key={way.title}>
                <a
                  href={way.href}
                  {...(external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className={cn("group flex h-full flex-col gap-10 p-6", CELL)}
                >
                  <span className="flex items-start justify-between">
                    <span
                      className="flex size-11 items-center justify-center text-[#f4efe7]"
                      style={{ background: INK }}
                    >
                      <WayIcon className="size-5" />
                    </span>
                    <span
                      className="text-[13px] font-medium tabular-nums"
                      style={{ color: PRINT }}
                    >
                      {pad(position + 1)}
                    </span>
                  </span>
                  <span className="block">
                    <span className="block text-[20px] font-medium leading-tight tracking-[-0.03em]">
                      {way.title}
                    </span>
                    <span
                      className={cn(
                        "mt-2 block text-[14.5px] leading-[1.55]",
                        MUTED,
                      )}
                    >
                      {way.description}
                    </span>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium underline decoration-[#141414]/25 underline-offset-4 transition-colors group-hover:text-[#c2410c] group-hover:decoration-[#c2410c]">
                      {way.cta}
                      <ArrowUpRight weight="bold" className="size-3.5" />
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>

        <div className="mt-2 flex flex-col gap-4 rounded-[6px] bg-white/80 px-6 py-5 ring-1 ring-inset ring-[#141414]/10 md:flex-row md:items-center md:gap-8">
          <p className="shrink-0 text-[12px] font-medium uppercase tracking-[0.1em] text-[#141414]/60">
            Sponsored by
          </p>
          <ul
            role="list"
            className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[15px] font-medium"
          >
            {AWESOME_SPONSORS.map((sponsor, position) => (
              <li key={sponsor} className="flex items-center gap-1">
                {position > 0 ? (
                  <span aria-hidden className={cn("px-1", FAINT)}>
                    ·
                  </span>
                ) : null}
                {sponsor}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function OssPage({ stats }: OssPageProps) {
  const [filter, setFilter] = useState<IndexFilter>("all");
  return (
    <div className="overflow-x-clip" style={PAPER_SCOPE}>
      <OssHero stats={stats} />
      <AwesomeSection index={1} stats={stats} onPick={setFilter} />
      <Studio1OssSection index={2} stats={stats} />
      <ProjectIndex
        index={3}
        repoCounts={stats.repos}
        filter={filter}
        onFilter={setFilter}
      />
      <GetInvolved index={4} />
      <PaperCta
        index={5}
        title="Want an Open-Source App Built on Your Product?"
        description="We build open-source apps and starters on devtool and AI products, then put them in front of the developers who'd use them."
      />
    </div>
  );
}
