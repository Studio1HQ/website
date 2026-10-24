"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Compass,
  Lightbulb,
  Megaphone,
  PenNib,
  RocketLaunch,
  SealCheck,
  TrendUp,
  UsersThree,
  VideoCamera,
  type Icon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { trustedbyLogo } from "@/constants/data";
import { homeFeatures, homeTestimonials } from "@/data/home";
import { NumericText } from "@/components/ui/num";
import Logo from "@/components/ui/svgs/logo";
import { cn } from "@/lib/utils";
import { Container, EASE } from "@/components/home/ui";
import {
  AnimatePresence,
  animate,
  motion,
  useAnimationFrame,
  useMotionValue,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import AsciiHands from "@/components/home/ascii-hands";
import { DitherField } from "@/components/home/dither-field";
import { preloadLocators } from "./country-locator";
import { CountryFlag, WorldReachMap } from "./world-reach-map";
import {
  Cursor,
  GRAIN,
  INK,
  NIGHT,
  PAPER,
  PRINT,
  PrintBlock,
  SelectionFrame,
} from "./paper-hero";

/* ------------------------------------------------------------------ */
/* Theme: every section is either the paper sheet or a black band.     */
/* Colours come from CSS variables so one set of classes serves both.  */
/* ------------------------------------------------------------------ */

type Tone = "paper" | "night";

const THEMES: Record<Tone, CSSProperties> = {
  paper: {
    "--p-bg": PAPER,
    "--p-fg": INK,
    "--p-muted": "rgba(20,20,20,0.62)",
    "--p-faint": "rgba(20,20,20,0.32)",
    "--p-line": "rgba(20,20,20,0.14)",
    "--p-card": "#ffffff",
    "--p-invert": 0,
  } as CSSProperties,
  night: {
    "--p-bg": NIGHT,
    "--p-fg": PAPER,
    "--p-muted": "rgba(244,239,231,0.62)",
    "--p-faint": "rgba(244,239,231,0.32)",
    "--p-line": "rgba(244,239,231,0.14)",
    "--p-card": "#1d1d1d",
    "--p-invert": 1,
  } as CSSProperties,
};

const FG = "text-[var(--p-fg)]";
const MUTED = "text-[var(--p-muted)]";
const FAINT = "text-[var(--p-faint)]";
const LINE = "border-[var(--p-line)]";
/** Hairline grid: outer left/top border, each cell adds right/bottom. */
const GRID = "grid gap-2";
/** The hero's card: white, hairline ring, square corners. */
const CELL =
  "bg-white/80 ring-1 ring-inset ring-[#141414]/10 transition-[transform,box-shadow,background-color] duration-500 ease-out hover:-translate-y-1 hover:bg-white hover:shadow-[0_24px_40px_-28px_rgba(20,20,20,0.45)] motion-reduce:transform-none";

function PaperSection({
  id,
  tone,
  children,
  className,
}: {
  id?: string;
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <section
      id={id}
      className={cn(
        "relative isolate overflow-clip py-14 md:py-20",
        FG,
        className,
      )}
      style={{ ...THEMES[tone], background: "var(--p-bg)" }}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10",
          tone === "night"
            ? "opacity-[0.16] mix-blend-screen"
            : "opacity-30 mix-blend-multiply",
        )}
        style={{ backgroundImage: GRAIN }}
      />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        {children}
      </motion.div>
    </section>
  );
}

/** Printed index line at the top of each section: "02 — Services". */
function IndexBar({
  index,
  name,
  aside,
}: {
  index: number;
  name: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 text-[13px] font-medium">
      <span className="flex items-center gap-3">
        <span className="tabular-nums" style={{ color: PRINT }}>
          {String(index).padStart(2, "0")}
        </span>
        <span aria-hidden className={FAINT}>
          —
        </span>
        <span>{name}</span>
      </span>
      {aside ? (
        <span className={cn("hidden text-right sm:block", MUTED)}>{aside}</span>
      ) : null}
    </div>
  );
}

/** Headline framed like the hero: selection frame, highlight block, cursor. */
function SectionHead({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  label?: string;
}) {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
      <h2 className="max-w-[760px] text-[32px] font-medium leading-[1.2] tracking-[-0.045em] sm:text-[40px] lg:text-[46px]">
        <span className="bg-[var(--p-card)] px-[0.14em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
          {title}
        </span>
      </h2>
      {description || action ? (
        <div className="flex flex-col items-start gap-6 lg:pb-2">
          {description ? (
            <p className={cn("max-w-[440px] text-[16px] leading-[1.6]", MUTED)}>
              {description}
            </p>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}

function Accent({ children }: { children: ReactNode }) {
  return <span style={{ color: PRINT }}>{children}</span>;
}

function OutlineLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex h-12 items-center gap-2 rounded-full border-[1.5px] border-[var(--p-fg)] px-6 text-[15px] font-medium transition-colors hover:bg-[var(--p-fg)] hover:text-[var(--p-bg)]"
    >
      {children}
      <ArrowUpRight
        weight="bold"
        className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
    </Link>
  );
}

/** "Selected in a design tool" overlay for one card in a grid. */
function Selected({ label }: { label: string }) {
  return (
    <SelectionFrame
      label={label}
      labelPosition="top-left"
      className="pointer-events-none absolute -inset-px z-10"
    >
      <span />
    </SelectionFrame>
  );
}

/* ------------------------------------------------------------------ */
/* 01 — Logos (paper)                                                  */
/* ------------------------------------------------------------------ */

const LOGO_CELLS = 12;

function InkLogo({ item }: { item: (typeof trustedbyLogo)[number] }) {
  return (
    <span className="flex items-center gap-2.5">
      <Image
        src={item.image}
        alt={item.alt ?? item.name}
        // Printed as solid marks in the section's ink colour.
        className="h-5 w-auto max-w-[78px] object-contain sm:h-6 sm:max-w-[120px] opacity-85 [filter:grayscale(1)_brightness(0)_invert(var(--p-invert,0))]"
      />
      {"showNameBeside" in item && item.showNameBeside ? (
        <span className="whitespace-nowrap text-[13px] font-medium opacity-85 sm:text-[15px]">
          {item.name}
        </span>
      ) : null}
    </span>
  );
}

export function PaperLogos() {
  // Logos that print as solid blocks are left out.
  const logos = trustedbyLogo.filter(
    (item) => !["Nebius", "Velt", "CodeRabbit", "StackQL"].includes(item.name),
  );
  const cells = Array.from({ length: LOGO_CELLS }, (_, cell) =>
    logos.filter((_, index) => index % LOGO_CELLS === cell),
  );
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Every cell swaps together, on one calm beat.
    const id = window.setInterval(() => setTick((value) => value + 1), 3200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <PaperSection tone="paper">
      <Container>
        <IndexBar
          index={1}
          name="Trusted by"
          aside="35+ devtool and SaaS teams"
        />
        <ul
          role="list"
          className={cn("mt-8 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6", GRID)}
        >
          {cells.map((cellLogos, cell) => {
            const active = tick % cellLogos.length;
            return (
              <li
                key={cell}
                className={cn("relative h-24 overflow-hidden", CELL)}
              >
                {cellLogos.map((item, index) => (
                  <span
                    key={item.name}
                    aria-hidden={index !== active}
                    className={cn(
                      "absolute inset-0 flex items-center justify-center px-4 transition-[opacity,transform] ease-out",
                      index === active
                        ? "translate-y-0 opacity-100 delay-300 duration-500"
                        : "-translate-y-2 opacity-0 duration-300",
                    )}
                  >
                    <InkLogo item={item} />
                  </span>
                ))}
              </li>
            );
          })}
        </ul>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 02 — About + numbers (paper)                                        */
/* ------------------------------------------------------------------ */

const STATS = [
  { value: 35, suffix: "", label: "Devtool and SaaS teams" },
  { value: 2, suffix: "M", label: "Total content views" },
  { value: 10, suffix: "", label: "High-impact developer events" },
  { value: 30, suffix: "", label: "Successful partnerships" },
];

/** Scroll progress window for token `index` of `count`, overlapping a little. */
function tokenRange(index: number, count: number): [number, number] {
  const start = index / count;
  return [start, Math.min(1, start + 2.5 / count)];
}

/** A word that fills from faint to ink (or to print orange) as it scrolls in. */
function RevealWord({
  progress,
  range,
  accent,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  accent?: boolean;
  children: ReactNode;
}) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  const y = useTransform(progress, range, [14, 0]);
  const filter = useTransform(progress, range, ["blur(6px)", "blur(0px)"]);
  const color = useTransform(
    progress,
    range,
    accent ? ["#141414", PRINT] : ["#141414", "#141414"],
  );
  return (
    <>
      <motion.span
        style={{ opacity, y, filter, color }}
        className="inline-block will-change-transform"
      >
        {children}
      </motion.span>{" "}
    </>
  );
}

/** An inline service chip: the icon tile springs in when its turn comes. */
function RevealChip({
  progress,
  range,
  href,
  icon,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const raw = useTransform(progress, range, [0, 1]);
  const t = useSpring(raw, { stiffness: 260, damping: 22, mass: 0.6 });
  const scale = useTransform(t, [0, 1], [0.2, 1]);
  const rotate = useTransform(t, [0, 1], [-28, 0]);
  const opacity = useTransform(raw, [0, 0.4, 1], [0.16, 0.6, 1]);
  return (
    <Link
      href={href}
      className="inline-flex items-baseline gap-[0.28em] underline decoration-[var(--p-line)] decoration-2 underline-offset-[0.16em] transition-colors hover:decoration-[#f97316]"
    >
      <motion.span
        style={{ scale, rotate, background: PRINT }}
        className="inline-flex size-[1em] translate-y-[0.12em] items-center justify-center rounded-[0.18em] text-white shadow-[0_6px_14px_-6px_rgba(249,115,22,0.7)] [&_svg]:size-[0.62em]"
      >
        {icon}
      </motion.span>
      <motion.span style={{ opacity }}>{children}</motion.span>
    </Link>
  );
}

type AboutToken =
  | { kind: "word"; text: string; accent?: boolean }
  | { kind: "chip"; text: string; href: string; icon: ReactNode };

const ABOUT_TOKENS: AboutToken[] = [
  { kind: "word", text: "Studio1", accent: true },
  ...(
    "is a technical content and developer growth partner for SaaS and devtool teams. We produce".split(
      " ",
    ) as string[]
  ).map((text): AboutToken => ({ kind: "word", text })),
  {
    kind: "chip",
    text: "tutorials,",
    href: "/technical-content-marketing",
    icon: <PenNib weight="fill" />,
  },
  {
    kind: "chip",
    text: "docs,",
    href: "/developer-documentation-dx-audit",
    icon: <BookOpenText weight="fill" />,
  },
  {
    kind: "chip",
    text: "videos,",
    href: "/developer-video-production",
    icon: <VideoCamera weight="fill" />,
  },
  ...(
    "launches, and developer programs that drive adoption.".split(
      " ",
    ) as string[]
  ).map((text): AboutToken => ({ kind: "word", text })),
];

function AboutStatement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.92", "end 0.42"],
  });
  const progress = useTransform(scrollYProgress, (value) =>
    reduceMotion ? 1 : value,
  );
  const count = ABOUT_TOKENS.length;

  return (
    <p
      ref={ref}
      className="text-[24px] font-medium leading-[1.3] tracking-[-0.04em] sm:text-[30px] lg:text-[36px]"
    >
      {ABOUT_TOKENS.map((token, index) => {
        const range = tokenRange(index, count);
        // Chip text carries its trailing comma; split it off the link.
        if (token.kind === "chip") {
          const label = token.text.replace(/,$/, "");
          return (
            <span key={index}>
              <RevealChip
                progress={progress}
                range={range}
                href={token.href}
                icon={token.icon}
              >
                {label}
              </RevealChip>
              <RevealWord progress={progress} range={range}>
                ,
              </RevealWord>
            </span>
          );
        }
        return (
          <RevealWord
            key={index}
            progress={progress}
            range={range}
            accent={token.accent}
          >
            {token.text}
          </RevealWord>
        );
      })}
    </p>
  );
}

function AboutMark() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.95", "start 0.55"],
  });
  const t = useSpring(scrollYProgress, { stiffness: 200, damping: 26 });
  const scale = useTransform(t, [0, 1], reduceMotion ? [1, 1] : [0.7, 1]);
  const rotate = useTransform(t, [0, 1], reduceMotion ? [0, 0] : [-14, 0]);
  return (
    <motion.div
      ref={ref}
      style={{ scale, rotate }}
      className="relative w-fit origin-bottom-left"
    >
      <SelectionFrame
        label="studio1-mark"
        labelPosition="top-left"
        className="p-1.5"
      >
        <PrintBlock className="flex size-[120px] items-center justify-center lg:size-[140px]">
          <Logo className="relative size-[62%] brightness-0 invert" />
        </PrintBlock>
      </SelectionFrame>
    </motion.div>
  );
}

/** Counts up from zero the first time the number scrolls into view. */
function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (!inView || reduceMotion) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setShown(latest),
    });
    return () => controls.stop();
  }, [inView, reduceMotion, value]);

  // Small values count in whole steps; "2M" counts in tenths.
  const text =
    value < 5 && shown < value ? shown.toFixed(1) : String(Math.round(shown));
  return (
    <span ref={ref} className="tabular-nums">
      {text}
      {suffix}
    </span>
  );
}

export function PaperPositioning() {
  const cta = useTranslations("CTA");
  return (
    <PaperSection id="about" tone="paper">
      <Container>
        <IndexBar
          index={2}
          name="About Studio1"
          aside={`${cta("bullets.content")} · ${cta("bullets.turnaround")}`}
        />
        <div className="mt-12 grid gap-12 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-16">
          <AboutMark />
          <AboutStatement />
        </div>

        <ul
          role="list"
          className={cn("mt-10 grid-cols-2 lg:grid-cols-4", GRID)}
        >
          {STATS.map((stat, index) => {
            const isPrint = index === 1;
            return (
              <li
                key={stat.label}
                className={cn(
                  "group relative isolate overflow-hidden p-6 md:p-8 [&>*:not(canvas)]:relative",
                  CELL,
                  isPrint && "text-white",
                )}
                style={isPrint ? { background: PRINT } : undefined}
              >
                {/* Dot field in the corner, white on the orange card */}
                <DitherField
                  cell={7}
                  size={3}
                  strength={isPrint ? 2 : 2.4}
                  seed={index * 2.3}
                  colors={isPrint ? ["#ffffff", "#ffe4cc"] : undefined}
                  className="absolute right-0 top-0 -z-10 h-[90%] w-[55%] [mask-image:radial-gradient(ellipse_at_top_right,black_25%,transparent_70%)]"
                />
                {/* Soft glow from the lower left */}
                <span
                  aria-hidden
                  className="pointer-events-none !absolute inset-0 -z-10"
                  style={{
                    background: isPrint
                      ? "radial-gradient(120% 90% at 0% 100%, rgba(254,50,0,0.55), transparent 60%)"
                      : "radial-gradient(110% 80% at 0% 100%, rgba(249,115,22,0.12), transparent 60%)",
                  }}
                />
                {/* Glare that sweeps across on hover */}
                <span
                  aria-hidden
                  className="pointer-events-none !absolute inset-y-0 -left-1/2 z-10 w-1/2 -translate-x-full skew-x-[-18deg] transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-[420%] motion-reduce:hidden"
                  style={{
                    background: isPrint
                      ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)"
                      : "linear-gradient(90deg, transparent, rgba(249,115,22,0.16), transparent)",
                  }}
                />
                <p className="text-[40px] font-medium leading-[0.95] tracking-[-0.05em] md:text-[46px]">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                  {isPrint ? "+" : <Accent>+</Accent>}
                </p>
                <p
                  className={cn(
                    "mt-6 text-[14px]",
                    isPrint ? "text-white/85" : MUTED,
                  )}
                >
                  {stat.label}
                </p>
              </li>
            );
          })}
        </ul>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* Creation: the two hands reaching for the Studio1 mark (paper)       */
/* ------------------------------------------------------------------ */

export function PaperCreation() {
  return (
    <PaperSection tone="paper">
      <Container>
        {/* Same particle hands as the homepage, in orange: they assemble and
            reach for the Studio1 mark as the section scrolls in. */}
        <div className="relative mx-auto flex w-fit items-center justify-center">
          <AsciiHands color="249,115,22" />
          <div className="relative">
            <SelectionFrame label="studio1-mark" className="p-2">
              <PrintBlock className="flex size-[150px] items-center justify-center md:size-[180px]">
                <Logo className="relative size-[56%] brightness-0 invert" />
              </PrintBlock>
            </SelectionFrame>
            <Cursor className="absolute -bottom-8 -right-6" />
          </div>
        </div>
        <p
          className={cn(
            "mx-auto mt-8 max-w-[520px] text-center text-[16px] leading-[1.6]",
            MUTED,
          )}
        >
          Developer-first content. Fast turnaround.
        </p>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 03 — Services (paper)                                               */
/* ------------------------------------------------------------------ */

type OfferingCopy = { label: string; description: string };

const OFFERING_ICONS: Icon[] = [
  PenNib,
  Megaphone,
  VideoCamera,
  Lightbulb,
  BookOpenText,
  TrendUp,
  RocketLaunch,
  UsersThree,
];

const OFFERING_LINKS = [
  "/technical-content-marketing#technical-content-writing",
  "/developer-relations-growth-campaigns#developer-advocacy",
  "/developer-video-production#tech-video-production",
  "/developer-video-production#content-creation",
  "/developer-documentation-dx-audit#documentation-dx-audits",
  "/developer-relations-growth-campaigns#organic-growth-campaign",
  "/developer-relations-growth-campaigns#product-launch-support",
  "/developer-relations-growth-campaigns#influencer-management",
];

/** Content first, then growth, matching the two service disciplines. */
const ORDER = [0, 2, 3, 4, 1, 5, 6, 7];

export function PaperServices() {
  const t = useTranslations("HomeDomains");
  const nav = useTranslations("Nav");
  const footer = useTranslations("Footer");
  const offerings = t.raw("offerings") as OfferingCopy[];

  return (
    <PaperSection id="service-offerings" tone="paper">
      <Container>
        <IndexBar
          index={3}
          name="Services"
          aside={`${nav("items.content")} · ${footer("links.growth")}`}
        />
        <SectionHead
          title={
            <>
              Everything developers need to{" "}
              <Accent>find, trust, and adopt</Accent> your product
            </>
          }
          action={
            <OutlineLink href="/technical-content-marketing">
              Explore services
            </OutlineLink>
          }
        />

        <ul
          role="list"
          className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        >
          {ORDER.map((id, position) => {
            const OfferingIcon = OFFERING_ICONS[id];
            const offering = offerings[id];
            if (!offering) return null;
            return (
              <li key={id} className="relative min-w-0">
                {position === 0 ? (
                  <Selected label="card / service-selected" />
                ) : null}
                <Link
                  href={OFFERING_LINKS[id]}
                  className={cn(
                    "group relative isolate flex h-full min-h-[220px] flex-col overflow-hidden p-5 transition-[background-color,box-shadow] duration-500 hover:bg-white hover:shadow-[0_24px_48px_-28px_rgba(255,90,0,0.55)] [&>*:not(canvas)]:relative",
                    CELL,
                  )}
                >
                  <DitherField
                    cell={7}
                    size={3}
                    strength={2.6}
                    seed={position * 1.7}
                    className="absolute right-0 top-0 -z-10 h-[58%] w-[62%] transition-opacity duration-700 [mask-image:radial-gradient(ellipse_at_top_right,black_30%,transparent_72%)] group-hover:opacity-40"
                  />
                  {/* Hover: an orange wash rises from the bottom edge */}
                  <span
                    aria-hidden
                    className="pointer-events-none !absolute inset-0 -z-[5] translate-y-8 opacity-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:translate-y-0 [filter:saturate(1.05)]"
                    style={{
                      background:
                        "radial-gradient(80% 55% at 90% 108%, rgba(254,50,0,0.75) 0%, rgba(254,50,0,0) 72%), radial-gradient(150% 130% at 35% 115%, #fc8c04 0%, rgba(252,140,4,0.95) 46%, rgba(253,170,90,0.75) 64%, rgba(252,224,196,0.35) 82%, rgba(244,239,231,0) 100%)",
                    }}
                  />
                  <span className="flex w-full items-start justify-between">
                    <span
                      className="flex size-11 items-center justify-center text-[#f4efe7]"
                      style={{ background: INK }}
                    >
                      <OfferingIcon weight="regular" className="size-5" />
                    </span>
                    <ArrowUpRight
                      weight="bold"
                      className="size-4 text-[#141414]/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#141414]"
                    />
                  </span>
                  <h3 className="mt-10 text-[18px] font-medium leading-tight tracking-[-0.025em] transition-colors duration-500 group-hover:text-white">
                    {offering.label}
                  </h3>
                  <p
                    className={cn(
                      "mt-2 text-[14px] leading-[1.55] transition-colors duration-500 group-hover:text-white/90",
                      MUTED,
                    )}
                  >
                    {offering.description}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 04 — Work (paper)                                                   */
/* ------------------------------------------------------------------ */

const WORK = [
  {
    client: "Nebius",
    metric: ["16K+", "GitHub stars on the open-source library"],
    href: "/case-studies/nebius",
    image: "/case-studies/nebius/workshop-dublin-recap.webp",
    ratio: 1194 / 1164,
    tags: [
      "Workshops & Live Events",
      "Framework Integrations",
      "Launch Support",
    ],
    summary:
      "300+ deliverables, 29 framework integrations, an open-source library with 16K+ stars, and launch support across every major Token Factory moment.",
  },
  {
    client: "Jozu",
    href: "/case-studies/jozu",
    image: "/case-studies/jozu/kubecon-jozu-booth.webp",
    ratio: 1200 / 900,
    tags: ["Developer Advocacy", "Event Representation", "Community Support"],
    summary:
      "Developer advocacy, KitOps community support, event representation, blogs, technical talks, and ecosystem collaboration for Jozu and its open-source ecosystem.",
  },
  {
    client: "Memori",
    metric: ["12,000+", "GitHub stars for an early OSS project"],
    href: "/case-studies/memori",
    image: "/case-studies/memori/memori-launch-reddit-redacted.png",
    ratio: 1488 / 968,
    tags: ["Community-led Launches", "Demo Content", "Live Events"],
    summary:
      "Community-led launch support, hands-on demo agents, and developer feedback helped an early OSS project grow to 12,000+ GitHub stars.",
  },
  {
    client: "Bright Data",
    metric: ["50+", "Live posts, with first-place Google results"],
    href: "/case-studies/brightdata",
    image: "/case-studies/brightdata/brightdata-homepage.webp",
    ratio: 2000 / 1150,
    tags: [
      "SEO Content Strategy",
      "Technical Tutorials & Comparisons",
      "Documentation Architecture",
    ],
    summary:
      "50+ live posts, first-place Google results on category comparisons, docs architecture for AI engineers, and SEO review across blog and partner content.",
  },
  {
    client: "LiteLLM",
    href: "/case-studies/litellm",
    image: "/case-studies/litellm/github-guides-activity.webp",
    ratio: 792 / 619,
    tags: [
      "Documentation Strategy",
      "Information Architecture",
      "Technical Writing",
    ],
    summary:
      "A ground-up docs revamp, new Learn section, SDK and Gateway quickstarts, restructured integrations, publicly endorsed by LiteLLM's CEO.",
  },
];

/** White "Read case study" bubble that trails the cursor over the preview. */
function useCaseBubble() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 380, damping: 32, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 380, damping: 32, mass: 0.5 });

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    if (!visible) {
      sx.jump(px);
      sy.jump(py);
    }
    x.set(px);
    y.set(py);
    setVisible(true);
  };

  return {
    handlers: { onPointerMove, onPointerLeave: () => setVisible(false) },
    bubble: (
      <AnimatePresence>
        {visible ? (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-30 hidden items-center gap-2.5 whitespace-nowrap rounded-full bg-white py-2 pl-5 pr-2 text-[13px] font-medium text-[#141414] shadow-[0_18px_40px_-16px_rgba(20,20,20,0.5)] ring-1 ring-[#141414]/10 lg:inline-flex"
            style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.5 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            Read case study
            <span
              className="flex size-8 items-center justify-center rounded-full text-white"
              style={{ background: PRINT }}
            >
              <ArrowUpRight weight="bold" className="size-3.5" />
            </span>
          </motion.span>
        ) : null}
      </AnimatePresence>
    ),
  };
}

/** Card top offset while stuck, plus a small step so earlier cards peek out. */
const STACK_TOP = 112;
const STACK_STEP = 10;

function CaseCard({
  work,
  index,
  total,
  progress,
}: {
  work: (typeof WORK)[number];
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { handlers, bubble } = useCaseBubble();
  // Cards only stack on wide screens; on phones and tablets they simply list.
  const [stacked, setStacked] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setStacked(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const still = reduceMotion || !stacked;

  // Once covered, each card eases back a little per card stacked above it.
  const start = index / total;
  const depth = total - 1 - index;
  const scale = useTransform(
    progress,
    [start, 1],
    [1, still ? 1 : 1 - depth * 0.04],
  );
  // The screen settles from a slight zoom as its card rises into place.
  const { scrollYProgress: enter } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });
  const imageScale = useTransform(
    enter,
    [0, 1],
    reduceMotion ? [1, 1] : [1.14, 1],
  );
  // It tips up into place as it arrives, then settles flat.
  const rotateX = useTransform(enter, [0, 1], still ? [0, 0] : [7, 0]);
  // Covered cards fade back into the paper instead of greying out.
  const veil = useTransform(
    progress,
    [Math.min(1, start + 1 / total), 1],
    [0, depth > 0 && !still ? Math.min(0.55, depth * 0.18) : 0],
  );

  return (
    <div
      ref={ref}
      className="lg:sticky"
      style={{ top: STACK_TOP + index * STACK_STEP }}
    >
      <motion.article
        style={{
          scale,
          rotateX,
          transformPerspective: 1400,
        }}
        className="relative isolate grid origin-top bg-white lg:bg-[linear-gradient(100deg,#ffffff_0%,#ffffff_34%,#ffe7d1_44%,#ffb36b_52%,#fe7a12_62%,#fe5200_78%,#fc8c04_100%)] overflow-hidden shadow-[0_-1px_0_rgba(20,20,20,0.06),0_30px_70px_-45px_rgba(20,20,20,0.55)] ring-1 ring-inset ring-[#141414]/10 lg:h-[min(540px,calc(100svh-180px))] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
      >
        <div className="relative flex flex-col p-6 md:p-10">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.12em]">
              <span
                aria-hidden
                className="size-2"
                style={{ background: PRINT }}
              />
              Case study
            </span>
            <span className={cn("text-[12px] tabular-nums", FAINT)}>
              {String(index + 1).padStart(2, "0")} /{" "}
              {String(total).padStart(2, "0")}
            </span>
          </div>

          <h3 className="mt-8 text-[34px] font-medium leading-[1.05] tracking-[-0.05em] md:text-[44px]">
            {work.client}
          </h3>
          <p
            className={cn(
              "mt-4 max-w-[440px] text-[16px] leading-[1.6]",
              MUTED,
            )}
          >
            {work.summary}
          </p>

          {"metric" in work && work.metric ? (
            <div className="mt-6 flex items-baseline gap-3 border-t border-[#141414]/10 pt-5">
              <span
                className="text-[32px] font-medium leading-none tracking-[-0.05em]"
                style={{ color: PRINT }}
              >
                {work.metric[0]}
              </span>
              <span className={cn("text-[13px] leading-snug", MUTED)}>
                {work.metric[1]}
              </span>
            </div>
          ) : null}

          <div className="mt-auto flex flex-wrap items-end justify-between gap-6 pt-8">
            <ul role="list" className="flex flex-col gap-1.5">
              {work.tags.map((tag) => (
                <li
                  key={tag}
                  className="flex items-center gap-2 text-[13px] font-medium"
                >
                  <span
                    aria-hidden
                    className="size-1.5"
                    style={{ background: PRINT }}
                  />
                  {tag}
                </li>
              ))}
            </ul>
            <Link
              href={work.href}
              className="group inline-flex h-11 shrink-0 items-center gap-2 rounded-full pl-5 pr-1.5 text-[14px] font-medium text-[#f4efe7] transition-opacity hover:opacity-90"
              style={{ background: INK }}
            >
              Read case study
              <span
                className="flex size-8 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                style={{ background: PRINT }}
              >
                <ArrowUpRight weight="bold" className="size-3.5" />
              </span>
            </Link>
          </div>
        </div>

        {/* The whole screen in a glass frame, on the shared orange panel */}
        <Link
          href={work.href}
          aria-label={`${work.client} case study`}
          className="relative isolate flex aspect-[16/11] items-center justify-center overflow-hidden [container-type:size] max-lg:bg-[linear-gradient(165deg,#fe3200_8%,#fc8c04_70%)] lg:aspect-auto lg:h-full lg:cursor-none"
          {...handlers}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
            style={{ backgroundImage: GRAIN }}
          />
          <motion.div
            style={{
              scale: imageScale,
              aspectRatio: work.ratio,
              width: `min(84cqw, calc(80cqh * ${work.ratio}))`,
            }}
            className="relative rounded-[18px] bg-white/[0.14] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_0_0_1px_rgba(255,255,255,0.28),0_30px_60px_-24px_rgba(90,25,0,0.55)] backdrop-blur-xl"
          >
            <div className="relative size-full overflow-hidden rounded-[11px] ring-1 ring-black/5">
              <Image
                src={work.image}
                alt=""
                fill
                sizes="(min-width:1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </motion.div>
          {bubble}
        </Link>
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 bg-[#f4efe7]"
          style={{ opacity: veil }}
        />
      </motion.article>
    </div>
  );
}

export function PaperWork() {
  const stackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: stackRef,
    offset: ["start start", "end end"],
  });

  return (
    <PaperSection id="results" tone="paper">
      <Container>
        <IndexBar
          index={4}
          name="Campaigns we did"
          aside={`${WORK.length} featured case studies`}
        />
        <SectionHead
          title={
            <>
              Work that moved <Accent>developer adoption</Accent>
            </>
          }
          action={
            <OutlineLink href="/case-studies">
              View all case studies
            </OutlineLink>
          }
        />

        {/* Cards stick and stack one over the next as the page scrolls */}
        <div ref={stackRef} className="mt-10 flex flex-col gap-4 lg:gap-[18vh]">
          {WORK.map((work, index) => (
            <CaseCard
              key={work.client}
              work={work}
              index={index}
              total={WORK.length}
              progress={scrollYProgress}
            />
          ))}
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 05 — Why us (paper)                                                 */
/* ------------------------------------------------------------------ */

/** One real Studio1 screen per reason, in homeFeatures order. */
const REASON_SHOTS = [
  "/case-studies/brightdata/brightdata-homepage.webp",
  "/case-studies/nebius/token-factory.webp",
  "/case-studies/tensorlake/tensorlake-home.webp",
  "/case-studies/entelligence-ai/entelligence-homepage.webp",
  "/case-studies/corsair/corsair-homepage.webp",
  "/case-studies/jozu/jozu-platform-overview.webp",
  "/case-studies/tensorlake/model-comparison.webp",
];

/** Full-bleed split panels shared by Why Studio1 and Process. */
const ORANGE_PANEL: CSSProperties = {
  background:
    "linear-gradient(165deg, #fe3200 8%, #fc8c04 48%, rgba(242,138,111,0) 86%), linear-gradient(90deg, #fc8c04, #fc8c04)",
};
/** Left padding that lines panel content up with the Container's edge. */
const EDGE_PAD = "md:pl-[max(32px,calc((100vw-1300px)/2+32px))]";
const LIGHT_PANEL = "bg-white/70";

const ROW = 88; // px per pill row in the scroller
const COPIES = 4; // the list is repeated so the column never runs out
const SCROLL_SPEED = 26; // px per second, continuous

const mod = (value: number, size: number) => ((value % size) + size) % size;

/** Screen position by distance from the active one: centre, left, right, hidden. */
/**
 * Screen position by distance from the active one. Cards leaving the left
 * slot drift further left as they fade, and the next card fades in from the
 * right, so the stack turns like a carousel instead of jumping.
 */
function shotStyle(distance: number, size: number) {
  if (distance === 0)
    return { transform: "translateX(0) scale(1)", zIndex: 10, opacity: 1 };
  if (distance === size - 1)
    return { transform: "translateX(-21%) scale(0.82)", zIndex: 5, opacity: 1 };
  if (distance === 1)
    return { transform: "translateX(21%) scale(0.82)", zIndex: 5, opacity: 1 };
  if (distance === size - 2)
    return { transform: "translateX(-44%) scale(0.66)", zIndex: 1, opacity: 0 };
  if (distance === 2)
    return { transform: "translateX(44%) scale(0.66)", zIndex: 1, opacity: 0 };
  return { transform: "translateX(0) scale(0.6)", zIndex: 0, opacity: 0 };
}

export function PaperReasons() {
  const reduceMotion = useReducedMotion();
  const total = homeFeatures.length;
  const loop = total * ROW;
  // Track offset in px; starts one full copy down so rows exist above and below.
  const y = useMotionValue(-loop);
  const [active, setActive] = useState(0);
  const paused = useRef(false);
  const jumping = useRef(false);

  // Continuous scroll; the row nearest the centre is the active one.
  useAnimationFrame((_, delta) => {
    if (!reduceMotion && !paused.current && !jumping.current) {
      let next = y.get() - (SCROLL_SPEED * delta) / 1000;
      if (next <= -2 * loop) next += loop;
      y.set(next);
    }
    const nearest = mod(Math.round(-y.get() / ROW), total);
    if (nearest !== active) setActive(nearest);
  });

  const focus = (row: number) => {
    jumping.current = true;
    animate(y, -row * ROW, { duration: 0.7, ease: EASE }).then(() => {
      // Re-centre into the middle copy so the loop keeps going seamlessly.
      const current = y.get();
      if (current <= -2 * loop) y.set(current + loop);
      if (current > -loop) y.set(current - loop);
      jumping.current = false;
    });
  };

  const feature = homeFeatures[active];
  const rows = Array.from({ length: total * COPIES }, (_, row) => row);

  return (
    <PaperSection id="why-us" tone="paper">
      <Container>
        <IndexBar index={5} name="Why Studio1" aside="Features" />
      </Container>
      <div className="mt-8 grid md:grid-cols-2">
        {/* Rolling column of reasons on orange */}
        <div
          className="relative h-[70vh] max-h-[640px] min-h-[460px] overflow-hidden px-5 md:h-auto md:max-h-none md:pl-[max(32px,calc((100vw-1300px)/2+32px))] md:pr-0"
          style={ORANGE_PANEL}
          onPointerEnter={() => (paused.current = true)}
          onPointerLeave={() => (paused.current = false)}
        >
          <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
            <motion.ul
              role="list"
              className="absolute inset-x-0 top-1/2 px-5 md:pl-[max(32px,calc((100vw-1300px)/2+32px))]"
              style={{ y, marginTop: -ROW / 2 }}
            >
              {rows.map((row) => {
                const item = homeFeatures[row % total];
                const isActive = row % total === active;
                const isCopy = row < total || row >= 2 * total;
                return (
                  <li
                    key={row}
                    className="flex items-center"
                    style={{ height: ROW }}
                  >
                    <button
                      type="button"
                      onClick={() => focus(row)}
                      aria-pressed={isActive}
                      aria-hidden={isCopy || undefined}
                      tabIndex={isCopy ? -1 : undefined}
                      className={cn(
                        "whitespace-nowrap rounded-full px-7 py-3.5 text-[26px] font-medium leading-none tracking-[-0.03em] transition-[background-color,color,box-shadow] duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)] md:text-[34px]",
                        isActive
                          ? "bg-white text-[#141414] shadow-[0_0_36px_rgba(255,255,255,0.5),0_18px_36px_-18px_rgba(120,30,0,0.5)]"
                          : "bg-white/[0.18] text-white/90 shadow-[0_0_24px_rgba(255,255,255,0.16),inset_0_1px_0_rgba(255,255,255,0.4),inset_0_0_0_1px_rgba(255,255,255,0.14)] backdrop-blur-md hover:bg-white/25",
                      )}
                    >
                      {item.title}
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          </div>
        </div>

        {/* Headline, the active reason and its screen */}
        <div
          className={cn(
            "flex flex-col justify-start gap-7 overflow-hidden px-5 py-14 md:px-16 md:py-20",
            LIGHT_PANEL,
          )}
        >
          <div className="text-center">
            <h2 className="mb-4 text-[32px] font-medium leading-[1.2] tracking-[-0.045em] sm:text-[40px] lg:text-[46px]">
              Why Tech Companies <Accent>Choose Studio1</Accent>
            </h2>
            <div className="relative mx-auto min-h-[84px] max-w-[520px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={feature.title}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "text-[clamp(1rem,1.3vw,1.12rem)] leading-relaxed",
                    MUTED,
                  )}
                >
                  <NumericText>{feature.description}</NumericText>
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
          <div className="relative mx-auto mt-6 aspect-[7/4] w-full max-w-[min(500px,78vw)]">
            {REASON_SHOTS.map((src, index) => (
              <span
                key={src}
                className="absolute inset-0 overflow-hidden rounded-[12px] bg-white shadow-[0_18px_44px_-18px_rgba(20,20,20,0.4)] ring-1 ring-[#141414]/10 transition-[transform,opacity] duration-[1100ms] ease-[cubic-bezier(0.65,0,0.35,1)] will-change-transform"
                style={shotStyle(mod(index - active, total), total)}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="560px"
                  className="object-cover object-top"
                />
              </span>
            ))}
          </div>
        </div>
      </div>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 06 — Testimonials (paper)                                           */
/* ------------------------------------------------------------------ */

/** Company marks for the testimonial picker, keyed by the company in each role. */
const COMPANY_MARKS: Record<string, string> = {
  Jozu: "/assets/jozu.webp",
  "Nebius AI": "/assets/nebius.webp",
  Ittybit: "/assets/ittybit.webp",
  "Entelligence.AI": "/assets/enteligence.webp",
  "Readyset.io": "/assets/readyset.webp",
  CopilotKit: "/assets/copilotkit.webp",
  Crawlee: "/assets/crawlee.webp",
  Opire: "/assets/opire.webp",
  "Permit.io": "/assets/permit.webp",
  "VDK(VMware)": "/assets/vmware.webp",
  Tolgee: "/assets/tolgee.webp",
  WebCrumbs: "/assets/webcrumbs.webp",
  "Pieces.app": "/assets/pieces.webp",
  Latitude: "/assets/latitude.webp",
  "Novita AI": "/assets/novita-ai-mark-green.webp",
};

/** "CEO & Founder Opire" / "COO, Tolgee" -> the company name. */
function companyOf(role: string) {
  if (role.includes(",")) return role.slice(role.lastIndexOf(",") + 1).trim();
  return role.split(" ").pop() ?? role;
}

export function PaperTestimonials() {
  const t = useTranslations("Testimonials");
  const [index, setIndex] = useState(0);
  const total = homeTestimonials.length;
  const current = homeTestimonials[index];
  const go = (next: number) => setIndex(((next % total) + total) % total);

  return (
    <PaperSection id="testimonials" tone="paper">
      <Container>
        <IndexBar index={6} name="Testimonials" aside={t("description")} />
        <SectionHead title={t("title")} />
        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16">
          <figure aria-live="polite" className="relative flex flex-col">
            <SelectionFrame
              label="quote / client"
              labelPosition="top-left"
              className="flex flex-1 items-center p-6 md:p-10"
            >
              <blockquote className="text-[20px] font-medium leading-[1.4] tracking-[-0.035em] sm:text-[22px] lg:text-[24px]">
                <Accent>&ldquo;</Accent>
                <NumericText>{current.content.trim()}</NumericText>
                <Accent>&rdquo;</Accent>
              </blockquote>
            </SelectionFrame>
            <figcaption className="mt-6 flex items-center gap-4">
              <Image
                src={current.avatar}
                alt={`${current.name} portrait`}
                width={112}
                height={112}
                sizes="56px"
                className="size-14 rounded-full object-cover ring-2 ring-white shadow-[0_6px_16px_-8px_rgba(20,20,20,0.5)]"
              />
              <span>
                <cite className="flex items-center gap-1.5 text-[17px] font-medium not-italic">
                  {current.name}
                  <SealCheck
                    weight="fill"
                    aria-label="Verified client"
                    className="size-[18px] shrink-0 text-[#1d9bf0]"
                  />
                </cite>
                <span className={cn("text-[14px]", MUTED)}>{current.role}</span>
              </span>
            </figcaption>
          </figure>

          <div
            className={cn(
              "flex flex-col justify-between gap-10 lg:border-l lg:pl-12",
              LINE,
            )}
          >
            <ul role="list" className="grid grid-cols-2 gap-2">
              {homeTestimonials.map((person, personIndex) => {
                const company = companyOf(person.role);
                const mark = COMPANY_MARKS[company];
                const isActive = personIndex === index;
                return (
                  <li key={person.name}>
                    <button
                      type="button"
                      onClick={() => setIndex(personIndex)}
                      aria-label={`Show testimonial from ${person.name}, ${company}`}
                      aria-pressed={isActive}
                      className={cn(
                        "flex h-12 w-full items-center gap-3 px-3.5 text-left text-[15px] font-medium tracking-[-0.02em] ring-1 ring-inset ring-[#141414]/10 transition-all duration-300",
                        isActive
                          ? "bg-white text-[#141414] ring-2 ring-[#f97316]"
                          : "bg-white/60 text-[#141414]/55 hover:bg-white hover:text-[#141414]",
                      )}
                    >
                      {/* Logo lockup: mark + name; marks stay mono until selected */}
                      <span
                        className={cn(
                          "relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-[#141414]/10 transition-[filter,opacity] duration-300",
                          isActive ? "" : "opacity-90",
                          !mark &&
                            "bg-[#141414] text-[12px] font-semibold text-white",
                        )}
                      >
                        {mark ? (
                          <Image
                            src={mark}
                            alt=""
                            fill
                            sizes="28px"
                            className="object-cover"
                          />
                        ) : (
                          company.charAt(0)
                        )}
                      </span>
                      <span className="truncate">
                        {company.replace(/\s*\(.*\)|\.(io|app)$/g, "")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-3">
              {[
                { label: "Previous testimonial", icon: ArrowLeft, step: -1 },
                { label: "Next testimonial", icon: ArrowRight, step: 1 },
              ].map(({ label, icon: ArrowIcon, step }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  onClick={() => go(index + step)}
                  className="flex size-12 items-center justify-center rounded-full border-[1.5px] border-[var(--p-fg)] transition-colors hover:bg-[var(--p-fg)] hover:text-[var(--p-bg)]"
                >
                  <ArrowIcon weight="bold" className="size-4" />
                </button>
              ))}
              <span className={cn("ml-3 text-[14px] tabular-nums", MUTED)}>
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(total).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 07 — Process (paper)                                                */
/* ------------------------------------------------------------------ */

const STAGES = [
  { key: "discover", icon: Compass },
  { key: "engage", icon: PenNib },
  { key: "adopt", icon: RocketLaunch },
] as const;

export function PaperProcess() {
  const t = useTranslations("DeveloperJourney");
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(
      () => setActive((value) => (value + 1) % STAGES.length),
      3200,
    );
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  return (
    <PaperSection id="process" tone="paper">
      <Container>
        <IndexBar index={7} name={t("eyebrow")} />
      </Container>
      {/* Same full-bleed split as Why Studio1 */}
      <div className="mt-8 grid md:grid-cols-2">
        <div
          className={cn(
            "relative isolate flex flex-col justify-between gap-10 px-5 py-14 text-white md:py-20 md:pr-16",
            EDGE_PAD,
          )}
          style={ORANGE_PANEL}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
            style={{ backgroundImage: GRAIN }}
          />
          <h2 className="max-w-[520px] text-[32px] font-medium leading-[1.2] tracking-[-0.045em] sm:text-[40px] lg:text-[46px]">
            {t("titlePrefix")} {t("titleHighlight")} {t("titleSuffix")}
          </h2>
          <p className="max-w-[420px] text-[clamp(1rem,1.3vw,1.12rem)] leading-relaxed text-white/90">
            {t("description")}
          </p>
        </div>
        <ol
          className={cn(
            "flex flex-col justify-center px-5 py-10 md:px-16 md:py-14",
            LIGHT_PANEL,
          )}
        >
          {STAGES.map((stage, index) => {
            const isActive = index === active;
            return (
              <li
                key={stage.key}
                onPointerEnter={() => setActive(index)}
                className={cn(
                  "py-7",
                  index > 0 && "border-t border-[#141414]/10",
                )}
              >
                <h3 className="flex items-center gap-3 text-[20px] font-medium tracking-[-0.035em] md:text-[24px]">
                  <span
                    className={cn(
                      "w-7 text-[12px] tabular-nums transition-colors duration-500",
                      isActive ? "text-[#f97316]" : FAINT,
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "transition-colors duration-500",
                      isActive ? FG : "text-[#141414]/45",
                    )}
                  >
                    {t(`stages.${stage.key}.title`)}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-500",
                      isActive
                        ? "border-[#f97316] bg-[#f97316] text-white"
                        : "border-[#141414]/25 text-[#141414]/45",
                    )}
                  >
                    <ArrowRight weight="bold" className="size-3.5" />
                  </span>
                </h3>
                <p
                  className={cn(
                    "mt-2 max-w-[520px] pl-10 text-[15px] leading-[1.6] transition-opacity duration-500",
                    MUTED,
                    isActive ? "opacity-100" : "opacity-60",
                  )}
                >
                  {t(`stages.${stage.key}.description`)}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 08 — Global reach (paper)                                           */
/* ------------------------------------------------------------------ */

const COUNTRIES = [
  "India",
  "USA",
  "Brazil",
  "France",
  "Netherlands",
  "Israel",
  "Singapore",
  "Vietnam",
  "Australia",
];

export function PaperReach() {
  const t = useTranslations("GlobalReach");
  const [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => preloadLocators(), []);
  return (
    <PaperSection id="global-reach" tone="paper">
      <Container>
        <IndexBar
          index={8}
          name={t("eyebrow")}
          aside={`${COUNTRIES.length} countries`}
        />
        <SectionHead
          title={
            <>
              {t("titlePrefix")} <Accent>{t("titleHighlight")}</Accent>
            </>
          }
          description={t("description")}
        />
        <div className={cn("mt-10 px-5 pb-6 pt-8 md:px-10 md:pt-10", CELL)}>
          <WorldReachMap
            hq={COUNTRIES[0]}
            highlight={hovered}
            onHighlight={setHovered}
            className="mx-auto w-full max-w-[1040px]"
          />
          <ul
            role="list"
            className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[14px] font-medium"
          >
            {COUNTRIES.map((country, index) => (
              <li
                key={country}
                onPointerEnter={() => setHovered(country)}
                onPointerLeave={() => setHovered(null)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 transition-colors",
                  hovered && hovered !== country ? FAINT : FG,
                )}
              >
                <CountryFlag country={country} />
                {country}
                {index === 0 ? (
                  <span
                    className="px-1.5 py-[3px] text-[10px] font-medium leading-none text-white"
                    style={{ background: PRINT }}
                  >
                    HQ
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </PaperSection>
  );
}

/* ------------------------------------------------------------------ */
/* 09 — Contact (paper)                                                */
/* ------------------------------------------------------------------ */

export function PaperCta() {
  const t = useTranslations("CTA");
  const bullets = ["savings", "lockIn", "content", "turnaround"] as const;
  return (
    <PaperSection tone="paper">
      <Container>
        <IndexBar index={9} name="Contact" aside="contact@studio1hq.com" />
        <div className="mt-10 grid gap-14 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end lg:gap-20">
          <h2 className="text-[32px] font-medium leading-[1.2] tracking-[-0.045em] sm:text-[40px] lg:text-[46px]">
            <span className="block">
              <span className="bg-[var(--p-card)] px-[0.14em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                {t("titleLine1")}
              </span>
            </span>
            <span className="block">
              <span
                className="bg-[var(--p-card)] px-[0.14em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
                style={{ color: PRINT }}
              >
                {t("titleLine2")}
              </span>
            </span>
          </h2>

          <div>
            <p className={cn("max-w-[440px] text-[17px] leading-[1.6]", MUTED)}>
              {t("descriptionLine1")} {t("descriptionLine2")}
            </p>
            <div className="relative mt-9 w-fit">
              <SelectionFrame
                label="button-filled-enabled"
                labelPosition="top-left"
                className="p-1.5"
              >
                <a
                  href="https://cal.com/studio1/collab"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-14 items-center gap-3 rounded-full py-2 pl-7 pr-2 text-[16px] font-medium transition-opacity hover:opacity-90"
                  style={{ background: INK, color: PAPER }}
                >
                  {t("button")}
                  <span
                    className="flex size-10 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45"
                    style={{ background: PRINT }}
                  >
                    <ArrowUpRight weight="bold" className="size-4" />
                  </span>
                </a>
              </SelectionFrame>
              <Cursor className="absolute -bottom-8 -right-6" />
            </div>
          </div>
        </div>

        <div className={cn("mt-10 sm:grid-cols-2 lg:grid-cols-4", GRID)}>
          {bullets.map((key, index) => (
            <div
              key={key}
              className={cn(
                "flex items-center gap-3 px-6 py-6 text-[15px] font-medium",
                CELL,
              )}
            >
              <span className={cn("text-[12px] tabular-nums", FAINT)}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                aria-hidden
                className="size-2 shrink-0"
                style={{ background: PRINT }}
              />
              {t(`bullets.${key}`)}
            </div>
          ))}
        </div>
      </Container>
    </PaperSection>
  );
}
