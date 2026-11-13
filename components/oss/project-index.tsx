"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, MagnifyingGlass, Star, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Container, EASE } from "@/components/home/ui";
import {
  Accent,
  CELL,
  FAINT,
  IndexBar,
  MUTED,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";
import {
  AWESOME_APP_COUNT,
  AWESOME_CATEGORIES,
  AWESOME_PICKS,
  AWESOME_URL,
  OSS_ORG,
  OSS_REPOS,
  awesomePath,
  type AwesomeCategory,
} from "@/data/oss";
import type { RepoCounts } from "@/lib/oss";
import { cn } from "@/lib/utils";

export type IndexFilter = AwesomeCategory | "studio1" | "all";

type Project = {
  id: string;
  name: string;
  description: string;
  href: string;
  category: AwesomeCategory | "studio1";
  tags: string[];
  featured: boolean;
  stars?: number;
  /** Lowercased text the search runs over. */
  haystack: string;
};

const CATEGORY_LABEL: Record<AwesomeCategory | "studio1", string> = {
  studio1: "Studio1-OSS",
  ...Object.fromEntries(
    AWESOME_CATEGORIES.map((category) => [category.key, category.label]),
  ),
} as Record<AwesomeCategory | "studio1", string>;

const FILTERS: { key: IndexFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "studio1", label: "Studio1-OSS" },
  ...AWESOME_CATEGORIES.map((category) => ({
    key: category.key,
    label: category.label,
  })),
];

const SUGGESTIONS = [
  "MCP",
  "LangGraph",
  "voice",
  "fine-tuning",
  "Mastra",
  "benchmark",
];

/**
 * Cards shown before anyone searches or filters: every Studio1-OSS repo,
 * then this many favourites from Awesome AI Apps.
 */
const FIRST_PAGE_PICKS = 6;

function buildProjects(repoCounts: Record<string, RepoCounts>): Project[] {
  const repos: Project[] = OSS_REPOS.map((repo) => {
    const tags = [...repo.stack, repo.language];
    return {
      id: `oss/${repo.repo}`,
      name: repo.name,
      description: repo.tagline,
      href: `https://github.com/${OSS_ORG}/${repo.repo}`,
      category: "studio1",
      tags,
      featured: Boolean(repo.featured),
      stars: repoCounts[repo.repo]?.stars ?? repo.stars,
      haystack: [
        repo.name,
        repo.repo,
        repo.tagline,
        repo.description,
        ...tags,
        "studio1 oss open source product",
      ]
        .join(" ")
        .toLowerCase(),
    };
  });
  const picks: Project[] = AWESOME_PICKS.map((pick) => ({
    id: `awesome/${pick.path}`,
    name: pick.name,
    description: pick.description,
    href: awesomePath(pick.path),
    category: pick.category,
    tags: pick.tags,
    featured: Boolean(pick.featured),
    haystack: [
      pick.name,
      pick.description,
      ...pick.tags,
      CATEGORY_LABEL[pick.category],
      "awesome ai apps",
    ]
      .join(" ")
      .toLowerCase(),
  }));
  // Featured ones sort first, so the first page mixes products and apps.
  return [...repos, ...picks];
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A term matches at the start of a word: "voice" finds "Voice Agents", not "Invoice". */
const termSource = (term: string) =>
  `${/^\w/.test(term) ? "\\b" : ""}${escapeRegExp(term)}`;

const termPattern = (term: string) => new RegExp(termSource(term), "i");

/** Wraps each search term found in `text` in a soft orange mark. */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const pattern = new RegExp(`(${terms.map(termSource).join("|")})`, "gi");
  return (
    <>
      {text.split(pattern).map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="bg-[#fbd9bd] text-inherit">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function ProjectCard({
  project,
  terms,
}: {
  project: Project;
  terms: string[];
}) {
  const studio1 = project.category === "studio1";
  return (
    <a
      href={project.href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("group flex h-full flex-col p-5 sm:p-6", CELL)}
    >
      <span className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "inline-flex h-[22px] items-center px-2 text-[12px] font-medium leading-none text-[#141414]",
            studio1 ? "" : "bg-[#fdf0e4]",
          )}
          style={studio1 ? { background: "#f97316" } : undefined}
        >
          {CATEGORY_LABEL[project.category]}
        </span>
        <ArrowUpRight
          weight="bold"
          aria-hidden
          className="size-4 text-[#141414]/35 transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#c2410c]"
        />
      </span>
      <span className="mt-6 block text-[18px] font-medium leading-[1.25] tracking-[-0.025em]">
        <Highlight text={project.name} terms={terms} />
      </span>
      <span className={cn("mt-2 block text-[14.5px] leading-[1.55]", MUTED)}>
        <Highlight text={project.description} terms={terms} />
      </span>
      <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-5">
        {project.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-1.5 py-[3px] text-[11px] font-medium leading-none text-[#141414]/60 ring-1 ring-inset ring-[#141414]/[0.12]"
          >
            <Highlight text={tag} terms={terms} />
          </span>
        ))}
        {studio1 && project.stars ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium tabular-nums text-[#141414]/60">
            <Star
              weight="fill"
              className="size-3.5"
              style={{ color: "#f97316" }}
            />
            {project.stars}
          </span>
        ) : null}
      </span>
    </a>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-[4px] bg-[#ece6dc] px-1.5 font-sans text-[12px] font-medium text-[#141414]/70">
      {children}
    </kbd>
  );
}

export function ProjectIndex({
  index,
  repoCounts,
  filter,
  onFilter,
}: {
  index: number;
  repoCounts: Record<string, RepoCounts>;
  filter: IndexFilter;
  onFilter: (filter: IndexFilter) => void;
}) {
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const projects = useMemo(() => buildProjects(repoCounts), [repoCounts]);

  // "/" jumps to the search box from anywhere on the page.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const patterns = terms.map(termPattern);
  const matchesSearch = (project: Project) =>
    patterns.every((pattern) => pattern.test(project.haystack));
  const matchesFilter = (project: Project, key: IndexFilter) =>
    key === "all" || project.category === key;

  const matches = projects
    .filter(
      (project) => matchesFilter(project, filter) && matchesSearch(project),
    )
    // Name hits first; then Studio1-OSS repos, featured picks, the rest.
    .map((project, order) => ({
      project,
      rank:
        (patterns.length &&
        patterns.every((pattern) => pattern.test(project.name))
          ? 0
          : 3) +
        (project.category === "studio1" ? 0 : project.featured ? 1 : 2),
      order,
    }))
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .map(({ project }) => project);

  const browsing = filter === "all" && terms.length === 0;
  const firstPage = OSS_REPOS.length + FIRST_PAGE_PICKS;
  const shown = browsing && !expanded ? matches.slice(0, firstPage) : matches;
  const category = AWESOME_CATEGORIES.find((item) => item.key === filter);

  const reset = () => {
    setQuery("");
    onFilter("all");
  };

  return (
    <PaperSection id="projects" tone="paper" className="scroll-mt-24">
      <Container>
        <IndexBar
          index={index}
          name="Project index"
          aside={`${projects.length} hand-picked projects`}
        />
        <SectionHead
          title={
            <>
              Find a Project <Accent>to Fork</Accent>
            </>
          }
          description={`Picked from Studio1-OSS and the ${AWESOME_APP_COUNT} apps in Awesome AI Apps. Search by name, framework or use case.`}
        />

        <div className="mt-10">
          <label className="relative block">
            <span className="sr-only">Search open-source projects</span>
            <MagnifyingGlass
              weight="bold"
              aria-hidden
              className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-[#141414]/45"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query) {
                  event.preventDefault();
                  setQuery("");
                }
              }}
              placeholder="Search projects, frameworks, use cases…"
              autoComplete="off"
              spellCheck={false}
              className="h-14 w-full rounded-full bg-white pl-14 pr-24 text-[16px] outline-none ring-1 ring-inset ring-[#141414]/15 transition-shadow placeholder:text-[#141414]/40 focus-visible:ring-2 focus-visible:ring-[#f97316] [&::-webkit-search-cancel-button]:hidden"
            />
            <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="flex size-9 items-center justify-center rounded-full text-[#141414]/60 transition-colors hover:bg-[#ece6dc] hover:text-[#141414]"
                  aria-label="Clear search"
                >
                  <X weight="bold" className="size-4" />
                </button>
              ) : (
                <span className="pointer-events-none hidden items-center gap-2 pr-2 text-[12px] text-[#141414]/45 sm:flex">
                  Press <Kbd>/</Kbd>
                </span>
              )}
            </span>
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2 px-1 text-[13px]">
            <span className={cn("mr-2", MUTED)}>Try</span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setQuery(suggestion);
                  onFilter("all");
                }}
                className={cn(
                  "rounded-[4px] px-2.5 py-1.5 font-medium transition-colors",
                  query.toLowerCase() === suggestion.toLowerCase()
                    ? "bg-white text-[#141414] ring-1 ring-inset ring-[#141414]/15"
                    : "text-[#141414]/55 hover:text-[#141414]",
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div
          role="group"
          aria-label="Filter projects by category"
          className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {FILTERS.map(({ key, label }) => {
            // Counts respect the search, so they match what you'd see.
            const total = projects.filter(
              (project) =>
                matchesFilter(project, key) && matchesSearch(project),
            ).length;
            const active = key === filter;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onFilter(key);
                  setExpanded(false);
                }}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-[1.5px] px-4 text-[14px] font-medium transition-colors duration-300",
                  active
                    ? "border-[#141414] bg-[#141414] text-[#f4efe7]"
                    : "border-[#141414]/20 hover:border-[#141414] hover:bg-white",
                  !active && total === 0 && "opacity-45",
                )}
              >
                {label}
                <span
                  className={cn(
                    "text-[11px] tabular-nums",
                    active ? "text-[#f97316]" : FAINT,
                  )}
                >
                  {total}
                </span>
              </button>
            );
          })}
        </div>

        <p
          aria-live="polite"
          className={cn(
            "mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]",
            MUTED,
          )}
        >
          <span>
            {browsing && !expanded
              ? `Every Studio1-OSS repo, plus ${FIRST_PAGE_PICKS} favourites from Awesome AI Apps`
              : `${matches.length} ${matches.length === 1 ? "project" : "projects"}`}
            {terms.length ? (
              <>
                {" "}
                for{" "}
                <span className="font-medium text-[#141414]">
                  “{query.trim()}”
                </span>
              </>
            ) : null}
          </span>
          {category ? (
            <a
              href={`${AWESOME_URL}/tree/main/${category.folder}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[#141414] underline decoration-[#141414]/25 underline-offset-4 transition-colors hover:text-[#c2410c] hover:decoration-[#c2410c]"
            >
              All {category.count} {category.label} on GitHub
              <ArrowUpRight weight="bold" className="size-3.5" />
            </a>
          ) : null}
        </p>

        {shown.length > 0 ? (
          <ul
            role="list"
            className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((project) => (
                <motion.li
                  key={project.id}
                  layout={reduceMotion ? false : "position"}
                  className="min-w-0"
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={
                    reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }
                  }
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <ProjectCard project={project} terms={terms} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <div
            className={cn(
              "mt-4 flex flex-col items-center gap-5 px-6 py-14 text-center",
              CELL,
            )}
          >
            <p className="text-[18px] font-medium tracking-[-0.02em]">
              Nothing in our picks matches that.
            </p>
            <p
              className={cn(
                "-mt-2 max-w-[420px] text-[14.5px] leading-[1.55]",
                MUTED,
              )}
            >
              The full Awesome AI Apps list has {AWESOME_APP_COUNT} projects,
              and GitHub search covers all of them.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] border-[#141414] px-5 text-[14px] font-medium transition-colors hover:bg-[#141414] hover:text-[#f4efe7]"
              >
                <X weight="bold" className="size-3.5" />
                Clear search
              </button>
              <a
                href={`https://github.com/search?q=${encodeURIComponent(`repo:Arindam200/awesome-ai-apps ${query.trim()}`)}&type=code`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#141414] px-5 text-[14px] font-medium text-[#f4efe7] transition-opacity hover:opacity-90"
              >
                Search the repo on GitHub
                <ArrowUpRight weight="bold" className="size-3.5" />
              </a>
            </div>
          </div>
        )}

        {browsing && !expanded && matches.length > firstPage ? (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex h-12 items-center gap-2 rounded-full border-[1.5px] border-[#141414] px-6 text-[15px] font-medium transition-colors hover:bg-white"
            >
              Show all {matches.length} picks
            </button>
          </div>
        ) : null}
      </Container>
    </PaperSection>
  );
}
