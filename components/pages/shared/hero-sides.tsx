import type { ReactNode } from "react";
import Image from "next/image";
import {
  Barcode,
  Books,
  DeviceMobile,
  Eye,
  FileText,
  GitDiff,
  GithubLogo,
  LinkedinLogo,
  MagnifyingGlass,
  MapPin,
  PenNib,
  Play,
  RedditLogo,
  Star,
  TrendUp,
  UsersThree,
  VideoCamera,
  XLogo,
  YoutubeLogo,
  type Icon,
} from "@phosphor-icons/react";
import {
  Cursor,
  PrintBlock,
  SelectionFrame,
} from "@/components/paper/paper-hero";
import { INK, NIGHT, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/*
 * The service hero's flanks, set like the home hero's design-file artefacts:
 * on each side of the headline, a small card built from real case-study work
 * and one of that work's headline numbers, the left one block-printed orange,
 * with a couple of cursors. Everything is drawn as UI rather than
 * screenshots, so it reads at card size. Static by design.
 */

type SideCard = {
  /** Layer name on the selection frame. */
  label: string;
  card: ReactNode;
};

/** A headline number from a case study, set as a block on its own. */
type SideStat = {
  /** Layer name on the selection frame. */
  label: string;
  value: string;
  text: string;
  client: string;
  icon: Icon;
};

export type HeroSides = {
  /** Upper left and upper right: pieces of real work, built as UI. */
  cards: [SideCard, SideCard];
  /** Lower left (printed orange) and lower right: the numbers. */
  stats: [SideStat, SideStat];
};

/* ------------------------------------------------------------------ */
/* Card parts                                                          */
/* ------------------------------------------------------------------ */

/** White card with a small caps title and an orange tag, as on the home hero. */
function Shell({
  title,
  tag,
  tagIcon: TagIcon,
  children,
  value,
  note,
}: {
  title: string;
  tag: string;
  tagIcon: Icon;
  children: ReactNode;
  /** Footer figure; a trailing + prints orange. */
  value?: string;
  note?: string;
}) {
  return (
    <div className="bg-white p-2 text-left shadow-[0_1px_0_rgba(27,23,20,0.06)]">
      <div className="flex items-center justify-between gap-2 px-1 pb-2 pt-0.5">
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.1em] text-[#141414]/55">
          {title}
        </p>
        <span
          className="inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-white"
          style={{ background: PRINT }}
        >
          <TagIcon weight="bold" className="size-3" />
          {tag}
        </span>
      </div>
      {children}
      {value ? (
        <div className="mt-2.5 flex items-baseline gap-2 border-t border-[#141414]/10 px-1 pt-2">
          <p className="shrink-0 text-[15px] font-medium leading-none tracking-[-0.03em]">
            {value.endsWith("+") ? (
              <>
                {value.slice(0, -1)}
                <span style={{ color: PRINT }}>+</span>
              </>
            ) : (
              value
            )}
          </p>
          <p className="text-[10.5px] leading-tight text-[#141414]/55">
            {note}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** A client's round logo. */
function Logo({ src, size = 28 }: { src: string; size?: number }) {
  return (
    <Image
      src={src}
      alt=""
      width={size * 2}
      height={size * 2}
      sizes={`${size}px`}
      className="shrink-0 rounded-full object-cover ring-1 ring-[#141414]/10"
      style={{ width: size, height: size }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Technical content                                                   */
/* ------------------------------------------------------------------ */

function ArticleCard() {
  return (
    <Shell title="Technical content" tag="Tutorial" tagIcon={PenNib}>
      <div className="px-1">
        <p className="flex items-center gap-1.5 text-[10.5px] text-[#141414]/50">
          <Logo src="/case-studies/tensorlake/tensorlake-logo.webp" size={16} />
          tensorlake.ai/blog · 9 Dec 2025
        </p>
        <p className="mt-1.5 text-[14px] font-medium leading-[1.25] tracking-[-0.02em]">
          TOON vs JSON: A Token-Optimized Data Format for Reducing LLM Costs
        </p>
        {/* The format the article teaches */}
        <pre
          className="mt-2.5 px-2.5 py-2 font-mono text-[10.5px] leading-[1.6] text-[#f4efe7]"
          style={{ background: NIGHT }}
        >
          <span style={{ color: "#fb923c" }}>users</span>[2]{"{"}id,name{"}"}:
          {"\n"}
          {"  "}1,Alice{"\n"}
          {"  "}2,Bob
        </pre>
        <p className="mt-2 flex flex-wrap gap-1">
          {["LLM costs", "Data formats", "SEO"].map((topic) => (
            <span
              key={topic}
              className="bg-[#f4efe7] px-1.5 py-0.5 text-[10px] text-[#141414]/60"
            >
              {topic}
            </span>
          ))}
        </p>
      </div>
    </Shell>
  );
}

function SearchCard() {
  const results = [
    ["github.com › toon-format", "Token-Oriented Object Notation (TOON)"],
    ["community.ibm.com", "JSON vs TOON (Token-Oriented Object Notation)"],
    ["tensorlake.ai › Blog", "TOON vs JSON: A Token-Optimized Data Format"],
  ];
  return (
    <Shell
      title="Google search"
      tag="Top 3"
      tagIcon={MagnifyingGlass}
      value="Top 3"
      note="on Google, next to GitHub and IBM"
    >
      <div className="px-1">
        <p className="flex items-center gap-1.5 rounded-full bg-[#f4efe7] px-2.5 py-1.5 text-[11px] text-[#141414]/70">
          <MagnifyingGlass weight="bold" className="size-3" />
          toon vs json
        </p>
        <ol className="mt-1.5">
          {results.map(([site, title], index) => {
            const ours = index === results.length - 1;
            return (
              <li
                key={site}
                className={cn(
                  "border-l-2 py-1 pl-2",
                  ours ? "bg-[#f97316]/[0.07]" : "border-transparent",
                )}
                style={ours ? { borderColor: PRINT } : undefined}
              >
                <span className="block text-[9.5px] text-[#141414]/45">
                  {site}
                </span>
                <span
                  className={cn(
                    "block truncate text-[11.5px] leading-snug",
                    ours ? "font-medium text-[#141414]" : "text-[#141414]/65",
                  )}
                >
                  {title}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Docs & DX                                                           */
/* ------------------------------------------------------------------ */

function DiffCard() {
  const lines: [sign: "-" | "+", text: string][] = [
    ["-", "Serve your docs to AI agents over SSH"],
    ["-", "A dense, text-heavy About section"],
    ["+", "Give every AI agent the same up-to-date knowledge."],
    ["+", "One diagram: agents sharing one knowledge server"],
  ];
  return (
    <Shell title="README rewrite" tag="OpenLore" tagIcon={GitDiff}>
      <div className="px-1">
        <p className="flex items-center gap-1.5 font-mono text-[10.5px] text-[#141414]/50">
          <Logo src="/case-studies/openlore/openlore-logo.webp" size={16} />
          aakarim/OpenLore · README.md
        </p>
        <ul className="mt-2 font-mono text-[10.5px] leading-[1.5]">
          {lines.map(([sign, text]) => (
            <li
              key={text}
              className={cn(
                "flex gap-1.5 px-1.5 py-0.5",
                sign === "-"
                  ? "bg-[#e5372e]/[0.07] text-[#141414]/45"
                  : "bg-[#f97316]/[0.09] text-[#141414]",
              )}
            >
              <span style={{ color: sign === "-" ? "#e5372e" : PRINT }}>
                {sign}
              </span>
              <span
                className={cn(
                  "min-w-0",
                  sign === "-" && "line-through decoration-[#e5372e]/50",
                )}
              >
                {text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Shell>
  );
}

function DocsCard() {
  const pages = ["Overview", "Architecture", "Quick start", "API"];
  return (
    <Shell title="Docs" tag="Bright Data" tagIcon={FileText}>
      <div className="flex gap-2 px-1">
        <ul className="shrink-0 space-y-1 border-r border-[#141414]/10 pr-2 text-[10px] text-[#141414]/50">
          {pages.map((page) => (
            <li
              key={page}
              className={cn(
                "whitespace-nowrap",
                page === "Architecture" && "font-medium text-[#141414]",
              )}
            >
              {page === "Architecture" ? (
                <span className="mr-1 inline-block size-1.5 rounded-full bg-[#f97316] align-middle" />
              ) : null}
              {page}
            </li>
          ))}
        </ul>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-medium leading-tight tracking-[-0.01em]">
            Deep Research Agent Architecture
          </p>
          {/* A layered diagram, as on the page */}
          <div className="mt-2 space-y-1">
            <span className="block h-2.5 bg-[#141414]/[0.08]" />
            <span className="grid grid-cols-3 gap-1">
              {[0, 1, 2].map((box) => (
                <span
                  key={box}
                  className="h-4 border border-[#f97316]/50 bg-[#f97316]/[0.08]"
                />
              ))}
            </span>
            <span className="block h-2.5 bg-[#141414]/[0.08]" />
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* DevRel                                                              */
/* ------------------------------------------------------------------ */

/** A conference exhibitor badge on its lanyard clip. */
function PassCard() {
  return (
    <div className="text-left">
      <span className="mx-auto block h-5 w-10 rounded-b-[3px] bg-[#141414]/80" />
      <div className="overflow-hidden bg-white shadow-[0_1px_0_rgba(27,23,20,0.06)]">
        <div className="px-3 py-2.5 text-white" style={{ background: PRINT }}>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/80">
            Exhibitor
          </p>
          <p className="mt-0.5 text-[13.5px] font-medium leading-tight tracking-[-0.02em]">
            KubeCon + CloudNativeCon India 2025
          </p>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-3">
          <Logo src="/assets/jozu.webp" size={34} />
          <span className="min-w-0">
            <span className="block text-[15px] font-medium leading-tight">
              Jozu
            </span>
            <span className="block text-[10.5px] text-[#141414]/55">
              Booth &amp; talks · represented by Studio1
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-dashed border-[#141414]/15 px-3 py-2 text-[10.5px] text-[#141414]/55">
          <span className="flex items-center gap-1">
            <MapPin weight="fill" className="size-3" style={{ color: PRINT }} />
            Hyderabad
          </span>
          <Barcode className="size-6 text-[#141414]/70" />
        </div>
      </div>
    </div>
  );
}

function WorkshopCard() {
  return (
    <Shell
      title="Hands-on workshop"
      tag="Dublin"
      tagIcon={UsersThree}
      value="65+"
      note="developers built AI agents on the night"
    >
      <div className="px-1">
        <p className="text-[13.5px] font-medium leading-tight tracking-[-0.02em]">
          Building semantic AI agents
        </p>
        <p className="mt-1 text-[10.5px] text-[#141414]/55">
          8 April 2025 · Baseline, Dublin
        </p>
        <p className="mt-2 flex items-center gap-1.5">
          <Logo src="/assets/nebius.webp" size={20} />
          <span className="text-[10.5px] text-[#141414]/60">
            Nebius with Couchbase and CrewAI
          </span>
        </p>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Video                                                               */
/* ------------------------------------------------------------------ */

function PlayerCard() {
  return (
    <Shell title="Product demo" tag="Corsair" tagIcon={VideoCamera}>
      <div style={{ background: NIGHT }}>
        {/* SlideFlow on screen: a sentence in, a deck out */}
        <div className="relative px-3 pb-3 pt-3.5">
          <p className="text-center text-[13px] font-medium leading-tight tracking-[-0.02em] text-white">
            From a sentence to a deck, fast.
          </p>
          <p className="mx-auto mt-2 flex max-w-[92%] items-center justify-between gap-2 rounded-full bg-white/10 py-1 pl-2.5 pr-1 text-[9.5px] text-white/60">
            <span className="truncate">A launch deck for our new API…</span>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium text-white"
              style={{ background: PRINT }}
            >
              Generate
            </span>
          </p>
          <span className="mt-2.5 grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((slide) => (
              <span
                key={slide}
                className="aspect-video rounded-[2px] bg-white/[0.12] p-1"
              >
                <span className="block h-1 w-2/3 rounded-full bg-white/50" />
                <span className="mt-0.5 block h-1 w-1/2 rounded-full bg-white/25" />
              </span>
            ))}
          </span>
          <span className="absolute left-1/2 top-[58%] flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_10px_24px_-8px_rgba(0,0,0,0.7)]">
            <Play
              weight="fill"
              className="ml-0.5 size-3.5"
              style={{ color: PRINT }}
            />
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 pb-2.5">
          <Play weight="fill" className="size-3 text-white" />
          <span className="h-[3px] flex-1 bg-white/15">
            <span
              className="block h-full w-[38%]"
              style={{ background: PRINT }}
            />
          </span>
        </div>
      </div>
      <p className="px-1 pt-2 text-[10.5px] leading-snug text-[#141414]/55">
        SlideFlow: describe a deck, then publish it to Drive and Slack through
        Corsair.
      </p>
    </Shell>
  );
}

function FormatsCard() {
  const cuts: [Icon, string, string, string][] = [
    [YoutubeLogo, "YouTube", "16:9", "h-[30px] w-[52px]"],
    [DeviceMobile, "Shorts", "9:16", "h-[36px] w-[20px]"],
    [LinkedinLogo, "LinkedIn", "1:1", "h-[30px] w-[30px]"],
  ];
  return (
    <Shell title="One recording" tag="3 cuts" tagIcon={Play}>
      <div className="grid grid-cols-3 items-end gap-1 px-1 pb-0.5 pt-1">
        {cuts.map(([Glyph, name, ratio, box]) => (
          <div
            key={name}
            className="flex min-w-0 flex-col items-center gap-1.5"
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-[3px]",
                box,
              )}
              style={{ background: NIGHT }}
            >
              <Play weight="fill" className="size-2.5 text-white/80" />
            </span>
            <span className="flex items-center gap-0.5 text-[10px] font-medium">
              <Glyph weight="fill" className="size-3 shrink-0" />
              {name}
            </span>
            <span className="-mt-1 font-mono text-[9.5px] text-[#141414]/45">
              {ratio}
            </span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* GitHub growth                                                       */
/* ------------------------------------------------------------------ */

/** OpenLore's stars: flat for months, then about 135 to 1,700+ in October. */
const OPENLORE_STARS = [
  40, 60, 80, 95, 110, 125, 135, 140, 260, 520, 900, 1300, 1700,
];

function StarsCard() {
  const width = 280;
  const height = 90;
  const max = 1800;
  const points = OPENLORE_STARS.map(
    (stars, index) =>
      `${(index / (OPENLORE_STARS.length - 1)) * width},${height - (stars / max) * height}`,
  ).join(" ");
  return (
    <Shell
      title="Star history"
      tag="OpenLore"
      tagIcon={Star}
      value="12x"
      note="stars in one month, 135 to 1,700+"
    >
      <div className="px-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[78px] w-full overflow-visible"
          fill="none"
          preserveAspectRatio="none"
        >
          {[30, 60].map((y) => (
            <path
              key={y}
              d={`M0 ${y} H${width}`}
              stroke={INK}
              strokeOpacity="0.12"
              strokeDasharray="2 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <polygon
            points={`0,${height} ${points} ${width},${height}`}
            fill={PRINT}
            fillOpacity="0.14"
          />
          <polyline
            points={points}
            stroke={PRINT}
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <p className="mt-1 flex justify-between text-[9.5px] text-[#141414]/45">
          <span>July</span>
          <span>August</span>
          <span>September</span>
          <span style={{ color: PRINT }}>October</span>
        </p>
      </div>
    </Shell>
  );
}

function RepoCard() {
  return (
    <Shell
      title="Repository"
      tag="Trending"
      tagIcon={TrendUp}
      value="16K+"
      note="stars for Nebius"
    >
      <div className="px-1">
        <p className="flex items-center gap-1.5 text-[12px]">
          <GithubLogo weight="fill" className="size-4 shrink-0" />
          <span className="truncate">
            <span className="text-[#141414]/55">Arindam200 / </span>
            <span className="font-medium">awesome-ai-apps</span>
          </span>
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-[#141414]/55">
          <Logo src="/assets/nebius.webp" size={16} />
          Powered by Nebius · maintained by Studio1
        </p>
        <p className="mt-2 flex flex-wrap gap-1">
          {["132 projects", "GitHub Trending", "AI agents"].map((chip) => (
            <span
              key={chip}
              className="bg-[#f97316]/[0.1] px-1.5 py-0.5 text-[10px] font-medium text-[#c2410c]"
            >
              {chip}
            </span>
          ))}
        </p>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

function Framed({
  side,
  labelPosition,
  className,
}: {
  side: SideCard;
  labelPosition: "top-left" | "bottom-right";
  className?: string;
}) {
  return (
    <SelectionFrame
      label={side.label}
      labelPosition={labelPosition}
      className={cn("p-1.5", className)}
    >
      {side.card}
    </SelectionFrame>
  );
}

/** A case-study number, block-printed orange or set on white. */
function StatBlock({
  stat,
  tone,
  labelPosition,
  className,
}: {
  stat: SideStat;
  tone: "print" | "paper";
  labelPosition: "top-left" | "bottom-right";
  className?: string;
}) {
  const StatIcon = stat.icon;
  const print = tone === "print";
  const plus = stat.value.endsWith("+");
  const body = (
    <div className="relative px-4 pb-4 pt-3.5 text-left">
      <p
        className={cn(
          "flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-[0.1em]",
          print ? "text-white/85" : "text-[#141414]/55",
        )}
      >
        {stat.client}
        <StatIcon
          weight="fill"
          className="size-4 shrink-0"
          style={print ? undefined : { color: PRINT }}
        />
      </p>
      <p
        className={cn(
          "mt-3 whitespace-nowrap text-[46px] font-medium leading-none tracking-[-0.055em]",
          print ? "text-white" : "text-[#141414]",
        )}
      >
        {plus ? stat.value.slice(0, -1) : stat.value}
        {plus ? <span style={{ color: print ? INK : PRINT }}>+</span> : null}
      </p>
      <p
        className={cn(
          "mt-2 text-[12.5px] leading-snug",
          print ? "text-white/90" : "text-[#141414]/60",
        )}
      >
        {stat.text}
      </p>
    </div>
  );
  return (
    <SelectionFrame
      label={stat.label}
      labelPosition={labelPosition}
      className={cn("p-1.5", className)}
    >
      {print ? (
        <PrintBlock>{body}</PrintBlock>
      ) : (
        <div className="bg-white shadow-[0_1px_0_rgba(27,23,20,0.06)]">
          {body}
        </div>
      )}
    </SelectionFrame>
  );
}

/**
 * Both flanks, for large screens, behind the centred copy. Each side is a
 * column the height of the copy: a piece of work level with the pill at the
 * top, a number level with the stats at the bottom, stepped in towards the
 * headline. The canvas is capped so wide screens keep the flanks close.
 */
export function HeroFlanks({ sides }: { sides: HeroSides }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-[5] hidden xl:block"
    >
      <div className="relative mx-auto h-full max-w-[1480px]">
        <div className="absolute inset-y-0 left-[1.5%] flex w-[19%] max-w-[290px] flex-col justify-between">
          <div className="relative">
            <Framed side={sides.cards[0]} labelPosition="top-left" />
            <Cursor className="absolute -bottom-7 right-[14%]" />
          </div>
          <StatBlock
            stat={sides.stats[0]}
            tone="print"
            labelPosition="top-left"
            className="ml-auto w-[80%]"
          />
        </div>

        <div className="absolute inset-y-0 right-[1.5%] flex w-[19%] max-w-[290px] flex-col justify-between">
          <Framed side={sides.cards[1]} labelPosition="bottom-right" />
          <div className="relative mt-12 w-[80%]">
            <StatBlock
              stat={sides.stats[1]}
              tone="paper"
              labelPosition="top-left"
            />
            <Cursor className="absolute -bottom-7 left-[22%]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Below xl: the first piece of work and its number, under the actions. */
export function HeroWorkRow({ sides }: { sides: HeroSides }) {
  return (
    <div
      aria-hidden
      className="mx-auto mt-14 grid max-w-[620px] items-start gap-x-5 gap-y-10 sm:grid-cols-2 xl:hidden"
    >
      <Framed side={sides.cards[0]} labelPosition="top-left" />
      <StatBlock stat={sides.stats[0]} tone="print" labelPosition="top-left" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One set per service                                                 */
/* ------------------------------------------------------------------ */

export const CONTENT_SIDES: HeroSides = {
  cards: [
    { label: "tensorlake/toon-vs-json.mdx", card: <ArticleCard /> },
    { label: "serp · toon vs json", card: <SearchCard /> },
  ],
  stats: [
    {
      label: "stat · reddit",
      value: "275K+",
      text: "Reddit impressions from developer distribution",
      client: "Entelligence",
      icon: RedditLogo,
    },
    {
      label: "stat · content-views",
      value: "2M+",
      text: "content views across our client work",
      client: "Studio1",
      icon: Eye,
    },
  ],
};

export const DOCS_SIDES: HeroSides = {
  cards: [
    { label: "README.md · diff", card: <DiffCard /> },
    { label: "brightdata · docs", card: <DocsCard /> },
  ],
  stats: [
    {
      label: "stat · trendshift",
      value: "#2",
      text: "Repository of the Day after the DX audit",
      client: "OpenLore",
      icon: TrendUp,
    },
    {
      label: "stat · quickstarts",
      value: "2",
      text: "quickstart paths rewritten, for the SDK and the Gateway",
      client: "LiteLLM",
      icon: Books,
    },
  ],
};

export const DEVREL_SIDES: HeroSides = {
  cards: [
    { label: "pass · kubecon-india", card: <PassCard /> },
    { label: "workshop · dublin", card: <WorkshopCard /> },
  ],
  stats: [
    {
      label: "stat · reddit",
      value: "630K+",
      text: "views across Reddit posts",
      client: "Nebius",
      icon: RedditLogo,
    },
    {
      label: "stat · meetups",
      value: "150+",
      text: "developers at meetups",
      client: "Memori",
      icon: UsersThree,
    },
  ],
};

export const VIDEO_SIDES: HeroSides = {
  cards: [
    { label: "slideflow-demo.mp4", card: <PlayerCard /> },
    { label: "exports · formats", card: <FormatsCard /> },
  ],
  stats: [
    {
      label: "stat · x-article",
      value: "24K",
      text: "views on one X Article walkthrough",
      client: "OpenLore",
      icon: XLogo,
    },
    {
      label: "stat · demos",
      value: "12",
      text: "hands-on demo agents built",
      client: "Memori",
      icon: VideoCamera,
    },
  ],
};

export const GITHUB_SIDES: HeroSides = {
  cards: [
    { label: "openlore · star-history", card: <StarsCard /> },
    { label: "awesome-ai-apps", card: <RepoCard /> },
  ],
  stats: [
    {
      label: "stat · reddit-launch",
      value: "50K+",
      text: "impressions on the Reddit launch",
      client: "Memori",
      icon: RedditLogo,
    },
    {
      label: "stat · impressions",
      value: "100K+",
      text: "impressions across platforms",
      client: "OpenLore",
      icon: Eye,
    },
  ],
};
