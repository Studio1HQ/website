"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import Logo from "@/components/ui/svgs/logo";
import { companies } from "@/data/companies";
import { EASE } from "@/components/home/ui";
import { cn } from "@/lib/utils";

/*
 * Partner logos as a white jigsaw: one logo per piece, the pieces locked
 * together into a single board. Pieces settle into place as the board
 * comes into view, ripple column by column as you scroll, and a hovered
 * piece lifts off the board. A Studio1 piece completes the set.
 */

const COLS = 9;

/** One edge knob, drawn along a 100-unit edge; v is how far it bulges out. */
const KNOB: [string, number, number][] = [
  ["L", 34, 0],
  ["C", 38, 0],
  ["", 40, -3],
  ["", 37, -7],
  ["C", 32, -15],
  ["", 40, -23],
  ["", 50, -23],
  ["C", 60, -23],
  ["", 68, -15],
  ["", 63, -7],
  ["C", 60, -3],
  ["", 62, 0],
  ["", 66, 0],
  ["L", 100, 0],
];

type Point = [number, number];

/** Draws one side of a piece from a to b; sign 1 = knob out, -1 = hole in. */
function edge(a: Point, b: Point, normal: Point, sign: number) {
  if (sign === 0) return ` L ${b[0]} ${b[1]}`;
  const at = (u: number, v: number) => {
    const x = a[0] + ((b[0] - a[0]) * u) / 100 - v * sign * normal[0];
    const y = a[1] + ((b[1] - a[1]) * u) / 100 - v * sign * normal[1];
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  };
  return KNOB.map(([cmd, u, v]) =>
    ` ${cmd} ${at(u, v)}`.replace("  ", " "),
  ).join("");
}

/** Which way each shared edge's knob points, fixed so the board is stable. */
const down = (r: number, c: number) => ((r * 7 + c * 3) % 2 ? 1 : -1);
const right = (r: number, c: number) => ((r * 3 + c * 5 + 1) % 2 ? 1 : -1);

function piecePath(r: number, c: number, total: number) {
  const index = r * COLS + c;
  const top = r > 0 ? -down(r - 1, c) : 0;
  // Edges with no neighbour (board edge, or the short last row) stay flat.
  const rightSide = c < COLS - 1 && index + 1 < total ? right(r, c) : 0;
  const bottom = index + COLS < total ? down(r, c) : 0;
  const left = c > 0 ? -right(r, c - 1) : 0;
  return (
    "M 0 0" +
    edge([0, 0], [100, 0], [0, -1], top) +
    edge([100, 0], [100, 100], [1, 0], rightSide) +
    edge([100, 100], [0, 100], [0, 1], bottom) +
    edge([0, 100], [0, 0], [-1, 0], left) +
    " Z"
  );
}

/** The paper sheet is always light, so `dark:` logo tweaks are dropped. */
function lightOnly(className?: string) {
  return className
    ?.split(/\s+/)
    .filter((name) => name && !name.startsWith("dark:"))
    .join(" ");
}

const FADE = [
  "linear-gradient(to bottom, transparent 0, black 56px, black calc(100% - 200px), transparent 100%)",
  "linear-gradient(to right, transparent 0, black 7%, black 93%, transparent 100%)",
].join(", ");

type Company = (typeof companies)[number];

/** Partners with a Studio1 case study; their piece opens it. */
const CASE_STUDY: Record<string, string> = {
  Nebius: "nebius",
  LiteLLM: "litellm",
  "Bright Data": "brightdata",
  Tensorlake: "tensorlake",
  OpenLore: "openlore",
  Memori: "memori",
  Ittybit: "ittybit",
  ScrapeGraph: "scrapegraph",
  Enteligence: "entelligence-ai",
  "Permit.io": "permit",
  Jozu: "jozu",
  Corsair: "corsair",
  WebCrumbs: "webcrumbs",
};

/** Percentages rounded so the server and browser render the same string. */
const pct = (n: number) => `${n.toFixed(4)}%`;

/** One piece, placed by row inside its column. */
function Piece({
  r,
  c,
  rows,
  total,
  children,
  href,
  label,
  external = true,
}: {
  r: number;
  c: number;
  rows: number;
  total: number;
  children: ReactNode;
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <div
      className="group absolute inset-x-0 hover:z-10"
      style={{ top: pct((r / rows) * 100), height: pct(100 / rows) }}
    >
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        aria-label={label}
        className="absolute inset-0 block transition-transform duration-300 ease-out group-hover:-translate-y-2"
      >
        {/* No filter at rest; the lift shadow only appears on hover */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          className="absolute inset-0 size-full overflow-visible group-hover:[filter:drop-shadow(0_18px_20px_rgba(20,20,20,0.22))]"
        >
          <path
            d={piecePath(r, c, total)}
            fill="url(#puzzle-paper)"
            stroke="#141414"
            strokeOpacity="0.28"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </svg>
        <span className="absolute inset-[18%] flex flex-col items-center justify-center gap-1.5">
          {children}
        </span>
      </Link>
    </div>
  );
}

/**
 * One column of pieces. The whole column rides a wave tied to scroll, each
 * column a step behind the last, so the board ripples as you scroll. Nine
 * columns move, not every piece, which keeps scrolling smooth.
 */
function Column({
  c,
  wave,
  children,
}: {
  c: number;
  wave: MotionValue<number>;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const y = useTransform(
    wave,
    (v) => Math.round(Math.sin(v * Math.PI * 5 - c * 0.7) * 700) / 100,
  );
  return (
    <motion.div
      className="absolute inset-y-0 will-change-transform"
      style={{
        left: pct((c / COLS) * 100),
        width: pct(100 / COLS),
        y: reduceMotion ? 0 : y,
      }}
    >
      {children}
    </motion.div>
  );
}

function CompanyMark({ item }: { item: Company }) {
  const wide = "logoVariant" in item && item.logoVariant === "wide";
  const logoClassName =
    "logoClassName" in item ? item.logoClassName : undefined;
  return (
    <>
      {/* Every logo sits in the same 80 x 32 box, centred */}
      <span className="relative flex h-8 w-[80px] items-center justify-center">
        <span className={wide ? "relative h-6 w-full" : "relative size-8"}>
          <Image
            src={item.image}
            alt=""
            fill
            sizes={wide ? "80px" : "32px"}
            className={cn(
              "object-contain mix-blend-multiply",
              !wide && "rounded-lg",
              lightOnly(logoClassName),
            )}
          />
        </span>
      </span>
      <span className="line-clamp-1 max-w-full text-center text-[11.5px] font-medium tracking-[-0.01em] text-[#141414]/75">
        {item.name}
      </span>
    </>
  );
}

export function LogoPuzzle({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // Every partner, then one Studio1 piece that completes the board.
  const total = companies.length + 1;
  const rows = Math.ceil(total / COLS);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const wave = useSpring(scrollYProgress, { stiffness: 60, damping: 20 });

  const pieces: { c: number; node: ReactNode }[] = companies.map(
    (item, index) => {
      const r = Math.floor(index / COLS);
      const c = index % COLS;
      const study = CASE_STUDY[item.name];
      return {
        c,
        node: (
          <Piece
            key={`${item.name}-${index}`}
            r={r}
            c={c}
            rows={rows}
            total={total}
            href={study ? `/case-studies/${study}` : item.href}
            external={!study}
            label={study ? `${item.name} case study` : item.name}
          >
            <CompanyMark item={item} />
          </Piece>
        ),
      };
    },
  );
  pieces.push({
    c: companies.length % COLS,
    node: (
      <Piece
        key="studio1"
        r={Math.floor(companies.length / COLS)}
        c={companies.length % COLS}
        rows={rows}
        total={total}
        href="/"
        label="Studio1"
        external={false}
      >
        <span className="flex h-8 items-center justify-center">
          <Logo className="size-8" />
        </span>
        <span className="text-center text-[11.5px] font-semibold tracking-[-0.01em] text-[#c2410c]">
          Studio1
        </span>
      </Piece>
    ),
  });

  return (
    // Full bleed, tilted back like a board on a table, every edge fading
    // into the paper so it reads as part of the page rather than a card.
    <div
      ref={ref}
      className={cn(
        "relative left-1/2 w-screen -translate-x-1/2 [perspective:1800px]",
        className,
      )}
      style={{
        maskImage: FADE,
        WebkitMaskImage: FADE,
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      <svg aria-hidden className="absolute size-0">
        <defs>
          {/* Paper: light from the top, a touch darker below */}
          <linearGradient id="puzzle-paper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#f1ede6" />
          </linearGradient>
        </defs>
      </svg>
      <motion.div
        className="relative mx-auto w-[min(1280px,92vw)] [transform:rotateX(24deg)_scale(0.94)] [transform-origin:50%_0%]"
        style={{ aspectRatio: `${COLS} / ${rows}` }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        {Array.from({ length: COLS }, (_, c) => (
          <Column key={c} c={c} wave={wave}>
            {pieces.filter((piece) => piece.c === c).map((piece) => piece.node)}
          </Column>
        ))}
      </motion.div>
    </div>
  );
}
