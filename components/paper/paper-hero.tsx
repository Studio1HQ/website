"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { JesseImg, JuliaImg, MarketaImg, SauravImg } from "@/constants/image";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  Books,
  Megaphone,
  PenNib,
  VideoCamera,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/svgs/logo";
import { cn } from "@/lib/utils";
import { Container, EASE } from "@/components/home/ui";
import { DitherField } from "@/components/home/dither-field";
import { GRAIN, INK, PAPER, PRINT } from "@/lib/paper";

type OfferingCopy = { label: string; description: string };

const TRUSTED_FACES = [
  { src: SauravImg, alt: "Saurav" },
  { src: JesseImg, alt: "Jesse" },
  { src: MarketaImg, alt: "Marketa" },
  { src: JuliaImg, alt: "Julia" },
] as const;

/** Paper palette lives in lib/paper so server components can use it too. */
export { GRAIN, INK, NIGHT, PAPER, PRINT } from "@/lib/paper";

/**
 * Seconds after navigation start when the preloader curtain is lifting
 * (its CSS timeline starts at first paint, so it is measured from the
 * page clock rather than from hydration).
 */
const PRELOADER_REVEAL_AT = 1.8;
let introDelayUsed = false;

/** Delay the hero entrance once, only when the preloader is playing. */
function useIntroDelay() {
  const [delay] = useState(() =>
    typeof document !== "undefined" &&
    !introDelayUsed &&
    document.documentElement.classList.contains("s1-preloading")
      ? Math.max(0, PRELOADER_REVEAL_AT - performance.now() / 1000)
      : 0,
  );
  useEffect(() => {
    introDelayUsed = true;
  }, []);
  return delay;
}

/** The four service pages, each tagged with the offerings it covers. */
const TEAMS = [
  {
    navKey: "technicalContent",
    href: "/technical-content-marketing",
    icon: PenNib,
    offerings: [0],
  },
  {
    navKey: "devrel",
    href: "/developer-relations-growth-campaigns",
    icon: Megaphone,
    offerings: [1, 5, 6],
  },
  {
    navKey: "video",
    href: "/developer-video-production",
    icon: VideoCamera,
    offerings: [2, 3],
  },
  {
    navKey: "docs",
    href: "/developer-documentation-dx-audit",
    icon: Books,
    offerings: [4],
  },
] as const;

/** Design-tool selection frame: hairline box, corner handles, layer label. */
export function SelectionFrame({
  label,
  children,
  className,
  labelPosition = "bottom-right",
}: {
  label: string;
  children: ReactNode;
  className?: string;
  labelPosition?: "top-left" | "bottom-right";
}) {
  const handle = "absolute size-[9px] border-[1.5px] bg-[var(--p-bg,#f4efe7)]";
  return (
    <div
      className={cn("relative border-[1.5px]", className)}
      style={{ borderColor: PRINT }}
    >
      {[
        "-left-[5px] -top-[5px]",
        "-right-[5px] -top-[5px]",
        "-bottom-[5px] -left-[5px]",
        "-bottom-[5px] -right-[5px]",
      ].map((position) => (
        <span
          key={position}
          className={cn(handle, position)}
          style={{ borderColor: PRINT }}
        />
      ))}
      <span
        aria-hidden
        className={cn(
          "absolute whitespace-nowrap px-1.5 py-[3px] text-[11px] font-medium leading-none text-white",
          labelPosition === "top-left"
            ? "-top-[22px] -left-px"
            : "-bottom-[22px] -right-px",
        )}
        style={{ background: PRINT }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

/** Solid black pointer, as in a design file. */
export function Cursor({
  className,
  color = `var(--p-fg, ${INK})`,
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cn("size-8", className)}>
      <path d="M3.5 2.5 21 10.2l-7.6 2.3-3.3 7.8z" style={{ fill: color }} />
    </svg>
  );
}

export const SWATCHES = [
  "#fdf0e4",
  "#fbd9bd",
  "#f9bb8c",
  "#f89a5c",
  "#f97316",
  "#e2620d",
  "#c2410c",
  "#9a3412",
];

/** Geometric construction drawing (diagram lines, dotted arcs, labels). */
export function Construction({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 300 340"
      className={className}
      fill="none"
      stroke={INK}
      strokeWidth="1.3"
    >
      <path d="M8 140 L210 186" />
      <path d="M150 36 L60 150" />
      <path d="M150 36 L196 12" />
      <path d="M190 14 l8 -3 -4 8" fill={INK} />
      <path d="M150 36 L238 282" strokeDasharray="2 5" />
      <path d="M60 150 Q20 240 150 300" strokeDasharray="3 5" />
      <path
        d="M150 36 Q260 120 214 296"
        strokeDasharray="1 5"
        strokeWidth="1.6"
      />
      <path d="M80 250 L176 288" />
      <path d="M60 150 L80 250" />
      <circle cx="176" cy="288" r="4" />
      <circle cx="150" cy="36" r="2.5" fill={INK} />
      <path d="M70 196 l-4 -8 -4 8" />
      <g
        fill={INK}
        stroke="none"
        fontSize="15"
        fontFamily="Georgia, serif"
        fontStyle="italic"
      >
        <text x="52" y="138">
          6
        </text>
        <text x="76" y="158">
          B
        </text>
        <text x="162" y="34">
          2
        </text>
        <text x="170" y="182">
          N″
        </text>
        <text x="212" y="196">
          D
        </text>
        <text x="196" y="96">
          -b′
        </text>
        <text x="190" y="248">
          a′
        </text>
        <text x="72" y="268">
          5
        </text>
        <text x="188" y="294">
          B
        </text>
        <text x="12" y="320">
          a″
        </text>
      </g>
    </svg>
  );
}

/** Block-print square: an image punched out in paper colour on solid orange. */
export function PrintBlock({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ background: PRINT }}
    >
      {children}
      {/* ink texture over the print */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
    </div>
  );
}

/** Shows one offering at a time, sliding the next one up into place. */
function CyclingLabel({ items }: { items: string[]; offset: number }) {
  return (
    <span className="block truncate text-[12.5px] leading-[1.4] text-[#141414]/55">
      {items.join(" · ")}
    </span>
  );
}

/**
 * Homepage hero, set as an editorial design canvas: the headline sits on
 * white highlight blocks in the middle of a paper sheet, surrounded by
 * design-file artefacts (selection frames with layer labels, cursors, a
 * swatch strip, a constellation, a construction drawing, block prints).
 */
/**
 * Primary CTA. On hover the orange dot behind the arrow grows to flood the
 * whole pill, the label nudges left and the handset rings once as its sound
 * waves draw out; it all eases back on leave. A small press-in on click.
 */
function StrategyCallButton({ label }: { label: string }) {
  const reduceMotion = useReducedMotion();
  const ease = [0.65, 0, 0.35, 1] as const;

  return (
    <motion.a
      href="https://cal.com/studio1/collab"
      target="_blank"
      rel="noopener noreferrer"
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
        {label}
      </motion.span>
      <span className="relative flex size-10 items-center justify-center">
        {/* At rest: a soft "incoming call" ring every few seconds */}
        {!reduceMotion ? (
          <motion.span
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full"
            style={{ border: `1.5px solid ${PRINT}` }}
            variants={{ rest: { opacity: 1 }, hover: { opacity: 0 } }}
            transition={{ duration: 0.2 }}
          >
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ border: `1.5px solid ${PRINT}` }}
              animate={{ scale: [1, 1.7], opacity: [0.7, 0] }}
              transition={{
                duration: 1.6,
                ease: "easeOut",
                repeat: Infinity,
                repeatDelay: 2.4,
              }}
            />
          </motion.span>
        ) : null}
        {/* The fill: grows from the icon dot to cover the whole button */}
        <motion.span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full"
          style={{ background: PRINT }}
          variants={{ rest: { scale: 1 }, hover: { scale: 14 } }}
          transition={{ duration: 0.7, ease }}
        />
        {/* Call icon: a handset whose sound waves draw out while hovered */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="size-[18px] overflow-visible text-white"
        >
          <motion.path
            d="M6.6 3.5H9l1.4 3.6-1.9 1.3a10.5 10.5 0 0 0 5.6 5.6l1.3-1.9 3.6 1.4v2.4a2 2 0 0 1-2.2 2A15 15 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z"
            fill="currentColor"
            style={{ transformOrigin: "50% 50%" }}
            variants={{
              rest: { rotate: 0 },
              hover: { rotate: [0, -10, 8, -4, 0] },
            }}
            transition={{ duration: 0.6, ease: "easeInOut", delay: 0.35 }}
          />
          {["M14.5 5.5a4.5 4.5 0 0 1 4 4", "M14.5 2a8 8 0 0 1 7.5 7.5"].map(
            (d, wave) => (
              <motion.path
                key={d}
                d={d}
                variants={{
                  rest: { pathLength: 0, opacity: 0 },
                  hover: { pathLength: 1, opacity: 1 },
                }}
                transition={{ duration: 0.35, ease, delay: 0.3 + wave * 0.12 }}
              />
            ),
          )}
        </svg>
      </span>
    </motion.a>
  );
}

export default function PaperHero() {
  const t = useTranslations("Hero");
  const nav = useTranslations("Nav");
  const domains = useTranslations("HomeDomains");
  const offerings = domains.raw("offerings") as OfferingCopy[];
  const reduceMotion = useReducedMotion();
  const introDelay = useIntroDelay();

  // Static design: no entrance motion.
  const enter = (delay: number) => ({
    initial: false as const,
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0, delay: introDelay * 0 + delay * 0 },
  });

  const highlight =
    "bg-white px-[0.18em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";

  return (
    <section
      id="hero"
      data-hero-tone="light"
      className="relative isolate overflow-hidden"
      style={{ background: PAPER, color: INK }}
    >
      {/* Paper grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />

      {/* ----- Canvas artefacts (large screens) ----- */}
      {/* Kept to the canvas above the service cards */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[230px] top-0 -z-[5] hidden xl:block"
      >
        {/* Block print: the Studio1 mark, left */}
        <div className="absolute left-[4%] top-[24%]">
          <SelectionFrame
            label="studio1-mark"
            labelPosition="top-left"
            className="p-1.5"
          >
            <PrintBlock className="flex size-[120px] items-center justify-center xl:size-[140px]">
              <Logo className="size-[62%] brightness-0 invert" />
            </PrintBlock>
          </SelectionFrame>
          <Cursor className="absolute -bottom-8 -right-6" />
        </div>

        {/* Metrics card, top right: the site's real numbers as a dashboard component */}
        <div className="absolute right-[2%] top-[11%] w-[20%] max-w-[300px]">
          <SelectionFrame label="card-metrics" className="p-1.5">
            <div className="bg-white px-3.5 py-3 shadow-[0_1px_0_rgba(27,23,20,0.06)]">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#141414]/55">
                    Total content views
                  </p>
                  <p className="mt-1 text-[28px] font-medium leading-none tracking-[-0.04em]">
                    2M<span style={{ color: PRINT }}>+</span>
                  </p>
                </div>
                <span
                  className="mb-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-white"
                  style={{ background: PRINT }}
                >
                  <ArrowUpRight weight="bold" className="size-3" />
                  growing
                </span>
              </div>
              <svg
                viewBox="0 0 280 90"
                className="mt-2 h-[52px] w-full"
                fill="none"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="s1-hero-area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={PRINT} stopOpacity="0.32" />
                    <stop offset="100%" stopColor={PRINT} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[22, 46, 70].map((y) => (
                  <path
                    key={y}
                    d={`M0 ${y} H280`}
                    stroke={INK}
                    strokeOpacity="0.12"
                    strokeDasharray="2 4"
                  />
                ))}
                <path
                  d="M0 82 C30 80 50 76 76 72 S124 62 150 54 S206 30 232 20 S262 10 272 8 L272 90 L0 90 Z"
                  fill="url(#s1-hero-area)"
                />
                <path
                  d="M0 82 C30 80 50 76 76 72 S124 62 150 54 S206 30 232 20 S262 10 272 8"
                  stroke={INK}
                  strokeWidth="1.6"
                />
                {[
                  [76, 72],
                  [150, 54],
                  [232, 20],
                ].map(([x, y]) => (
                  <circle
                    key={x}
                    cx={x}
                    cy={y}
                    r="3"
                    fill="#fff"
                    stroke={INK}
                    strokeWidth="1.3"
                  />
                ))}
                <circle
                  cx="272"
                  cy="8"
                  r="4.5"
                  fill={PRINT}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx="272"
                  cy="8"
                  r="8"
                  stroke={PRINT}
                  strokeOpacity="0.5"
                />
              </svg>
              <div className="mt-2.5 grid grid-cols-3 border-t border-[#141414]/10 pt-2.5">
                {[
                  ["35+", "Devtool & SaaS teams"],
                  ["10+", "Developer events"],
                  ["30+", "Partnerships"],
                ].map(([value, label]) => (
                  <div key={label} className="min-w-0 pr-2">
                    <p className="text-[15px] font-medium leading-none tracking-[-0.03em]">
                      {value}
                    </p>
                    <p className="mt-1 text-[10.5px] leading-tight text-[#141414]/55">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </SelectionFrame>
          <Cursor className="absolute -bottom-7 left-[22%]" />
        </div>

        {/* DevRel card, lower left: mirrors the metrics card */}
        <div className="absolute left-[2.5%] top-[55%] w-[19%] max-w-[290px]">
          <SelectionFrame
            label="card-devrel"
            labelPosition="top-left"
            className="p-1.5"
          >
            <div className="bg-white p-2 shadow-[0_1px_0_rgba(27,23,20,0.06)]">
              <div className="flex items-center justify-between px-1 pb-2 pt-0.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#141414]/55">
                  Developer Relations
                </p>
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-white"
                  style={{ background: PRINT }}
                >
                  <Megaphone weight="bold" className="size-3" />
                  DevRel
                </span>
              </div>
              {/* Recent developer events, as a small timeline */}
              <ol className="relative px-1">
                {[
                  [
                    "KubeCon India 2025",
                    "Booth & talks · Jozu",
                    "/assets/jozu.webp",
                  ],
                  [
                    "DevFest Pune 2025",
                    "Community booth · Jozu",
                    "/assets/jozu.webp",
                  ],
                  [
                    "Workshop, Dublin",
                    "Hands-on AI agents · Nebius",
                    "/assets/nebius.webp",
                  ],
                ].map(([event, detail, logo]) => (
                  <li
                    key={event}
                    className="relative flex items-center gap-2.5 py-1.5"
                  >
                    <span className="relative size-7 shrink-0">
                      <Image
                        src={logo}
                        alt=""
                        width={56}
                        height={56}
                        sizes="28px"
                        className="size-7 rounded-full object-cover ring-1 ring-[#141414]/10"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-medium leading-tight">
                        {event}
                      </span>
                      <span className="block truncate text-[10.5px] leading-tight text-[#141414]/55">
                        {detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-2.5 flex items-baseline gap-2 border-t border-[#141414]/10 px-1 pt-2">
                <p className="text-[15px] font-medium leading-none tracking-[-0.03em]">
                  10<span style={{ color: PRINT }}>+</span>
                </p>
                <p className="text-[10.5px] leading-tight text-[#141414]/55">
                  High-impact developer events
                </p>
              </div>
            </div>
          </SelectionFrame>
          <Cursor className="absolute -bottom-7 right-[18%]" />
        </div>

        {/* Block print: the reaching hand, right */}
        <PrintBlock className="absolute -right-[2%] top-[51%] h-[17%] w-[12%]">
          <Image
            src="/assets/hand-right.png"
            alt=""
            fill
            sizes="20vw"
            className="object-contain object-left p-[8%] [filter:brightness(0)_invert(96%)_sepia(8%)]"
          />
        </PrintBlock>
      </div>

      {/* ----- Copy ----- */}
      <Container className="relative flex min-h-[calc(100svh/var(--s1-zoom,1))] flex-col justify-end pb-10 pt-36">
        <div className="mb-auto mt-auto flex flex-col items-center pt-6 text-center lg:pt-16">
          <motion.div
            {...enter(0.1)}
            role="group"
            aria-label={t("trustedAria")}
            className="inline-flex items-center gap-3 bg-white py-1.5 pl-1.5 pr-4 shadow-[0_1px_0_rgba(27,23,20,0.06)]"
          >
            <span className="flex -space-x-2" aria-hidden>
              {TRUSTED_FACES.map((face, index) => (
                <Image
                  key={face.alt}
                  src={face.src}
                  alt=""
                  width={64}
                  height={64}
                  sizes="28px"
                  className="relative size-7 rounded-full object-cover ring-2 ring-white"
                  style={{ zIndex: TRUSTED_FACES.length - index }}
                />
              ))}
            </span>
            <span className="text-[13px] font-medium tracking-[-0.01em] sm:text-[14px]">
              {t("trustedPrefix")} 35+ {t("trustedSuffix")}
            </span>
          </motion.div>

          <h1 className="relative mt-8 text-[38px] font-medium leading-[1.12] tracking-[-0.045em] sm:text-[52px] lg:text-[60px] xl:text-[68px]">
            {[
              <>
                {t("titleLine1")} <span style={{ color: PRINT }}>DevRel</span>
              </>,
              <>
                {t("titleLine2")} <span style={{ color: PRINT }}>DevTools</span>
              </>,
            ].map((line, index) => (
              <span key={index} className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  className="block"
                  initial={false}
                  animate={{ y: "0%" }}
                  transition={{
                    duration: 1.2,
                    ease: EASE,
                    delay: introDelay + 0.25 + index * 0.12,
                  }}
                >
                  <span className={highlight}>{line}</span>
                </motion.span>
              </span>
            ))}
            <Cursor className="absolute -bottom-7 right-[6%] hidden sm:block" />
          </h1>

          <motion.p
            {...enter(0.55)}
            className="mt-7 max-w-[560px] text-[16px] leading-[1.6] text-[#141414]/70 sm:text-[18px]"
          >
            {t("description")}
          </motion.p>

          <motion.div
            {...enter(0.7)}
            className="mt-12 flex flex-col items-center gap-6 sm:flex-row"
          >
            <div className="relative">
              <SelectionFrame
                label="button-filled-enabled"
                labelPosition="top-left"
                className="p-1.5"
              >
                <StrategyCallButton label={t("primaryCta")} />
              </SelectionFrame>
              <Cursor className="absolute -bottom-8 -right-6 hidden sm:block" />
            </div>
            <a
              href="/case-studies"
              className="group inline-flex h-14 items-center gap-2 rounded-full border-[1.5px] px-7 text-[16px] font-medium transition-colors hover:bg-white"
              style={{ borderColor: INK }}
            >
              {t("secondaryCta")}
              <ArrowUpRight
                weight="bold"
                className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </motion.div>
        </div>

        {/* Service "teams" row */}
        <motion.ul
          {...enter(0.9)}
          role="list"
          className="relative mt-16 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
        >
          {TEAMS.map(({ navKey, href, icon: Icon, offerings: ids }, index) => (
            <li key={navKey} className="min-w-0">
              <Link
                href={href}
                className="group relative isolate flex h-full flex-col items-start overflow-hidden rounded-[6px] bg-white/80 p-5 ring-1 ring-inset ring-[#141414]/10 transition-colors duration-300 hover:bg-white [&>*:not(canvas)]:relative"
              >
                <DitherField
                  still
                  strength={1.8}
                  seed={index * 1.7}
                  className="absolute inset-y-0 right-0 -z-10 h-full w-[55%] opacity-80 [mask-image:linear-gradient(to_left,black_30%,transparent)]"
                />
                <span className="flex w-full items-start justify-between">
                  <span
                    className="flex size-11 items-center justify-center text-[#f4efe7]"
                    style={{ background: INK }}
                  >
                    <Icon weight="regular" className="size-5" />
                  </span>
                  <ArrowUpRight
                    weight="bold"
                    className="size-4 text-[#141414]/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#141414]"
                  />
                </span>
                <span className="mt-6 block text-[16px] font-medium leading-tight tracking-[-0.025em]">
                  {nav(`items.${navKey}`)}
                </span>
                <span className="mt-1.5 block w-full">
                  <CyclingLabel
                    items={ids
                      .map((id) => offerings[id]?.label)
                      .filter(Boolean)}
                    offset={index * 0.6}
                  />
                </span>
              </Link>
            </li>
          ))}
        </motion.ul>
      </Container>
    </section>
  );
}
