"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowCounterClockwise,
  ArrowUpRight,
  Article,
  ChartLineUp,
  Eye,
  EyeSlash,
  FrameCorners,
  ImageBroken,
  SealCheck,
  UsersThree,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/home/ui";
import { cn } from "@/lib/utils";
import { GRAIN, INK, PAPER, PRINT } from "@/lib/paper";
import { Construction, Cursor, PrintBlock, SelectionFrame } from "./paper-hero";

/* ------------------------------------------------------------------ */
/* Canvas: the hero's paper sheet, reused for 404 and error pages      */
/* ------------------------------------------------------------------ */

const highlight =
  "bg-white px-[0.14em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";

/** Design-file artefacts around the page (large screens only). */
function CanvasArtefacts({ missingLayer }: { missingLayer: string }) {
  const layers = ["navbar", missingLayer, "footer"];
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-[5] hidden xl:block"
    >
      <Construction className="absolute left-[4%] top-[22%] w-[210px] opacity-60" />

      {/* Layers panel, with the page that should be here switched off */}
      <div className="absolute right-[4%] top-[24%] w-[230px]">
        <SelectionFrame label="panel-layers" className="p-1.5">
          <div className="bg-white p-2 shadow-[0_1px_0_rgba(27,23,20,0.06)]">
            <p className="px-1 pb-2 pt-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[#141414]/55">
              Layers
            </p>
            <ul className="text-[12.5px]">
              {layers.map((layer) => {
                const missing = layer === missingLayer;
                const Visibility = missing ? EyeSlash : Eye;
                return (
                  <li
                    key={layer}
                    className={cn(
                      "flex items-center gap-2 px-1.5 py-1.5",
                      missing && "bg-[#fdf0e4]",
                    )}
                    style={missing ? { color: PRINT } : undefined}
                  >
                    <FrameCorners
                      weight="bold"
                      className={cn("size-3.5", !missing && "text-[#141414]/40")}
                    />
                    <span
                      className={cn(
                        "flex-1 truncate font-medium",
                        missing && "line-through",
                      )}
                    >
                      {layer}
                    </span>
                    <Visibility
                      weight="bold"
                      className={cn("size-3.5", !missing && "text-[#141414]/30")}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </SelectionFrame>
        <Cursor className="absolute -bottom-7 left-[24%]" />
      </div>
    </div>
  );
}

/**
 * A collaborator's cursor, Figma-style, drifting around the mark as if it
 * were looking for the missing frame. Stays parked with reduced motion.
 */
function SearchingCursor() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute z-10 hidden items-start sm:flex"
      initial={{ left: "88%", top: "74%" }}
      animate={
        reduceMotion
          ? undefined
          : {
              left: ["88%", "52%", "62%", "12%", "32%", "88%"],
              top: ["74%", "34%", "82%", "58%", "18%", "74%"],
            }
      }
      transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
    >
      <Cursor className="size-6" color={PRINT} />
      <span
        className="-ml-1 mt-5 px-1.5 py-[3px] text-[11px] font-medium leading-none text-white"
        style={{ background: PRINT }}
      >
        studio1
      </span>
    </motion.div>
  );
}

/** "404" with a hollow, hatched zero: the empty frame where the page was. */
function NotFoundMark() {
  return (
    <span
      aria-hidden
      className="flex select-none items-center px-3 pt-2 text-[clamp(112px,26vw,300px)] font-medium leading-[0.86] tracking-[-0.06em] sm:px-5"
    >
      4
      <span
        style={{
          color: "transparent",
          WebkitTextStroke: `clamp(1.5px, 0.3vw, 3px) ${PRINT}`,
          backgroundImage: `repeating-linear-gradient(135deg, rgba(249,115,22,0.32) 0 1.5px, transparent 1.5px 9px)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
        }}
      >
        0
      </span>
      4
    </span>
  );
}

/** An artboard whose contents failed to render: the placeholder cross. */
function BrokenArtboardMark() {
  return (
    <span
      aria-hidden
      className="relative flex aspect-[5/2] w-[min(560px,78vw)] items-center justify-center bg-white shadow-[0_1px_0_rgba(27,23,20,0.06)]"
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
      >
        <path
          d="M0 0 L100 100 M100 0 L0 100"
          stroke={INK}
          strokeOpacity="0.14"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <PrintBlock className="flex size-16 items-center justify-center sm:size-20">
        <ImageBroken weight="bold" className="size-7 text-white sm:size-9" />
      </PrintBlock>
    </span>
  );
}

/** Ink pill label plus the orange icon dot, which turns on hover. */
function PrimaryPill({
  children,
  icon,
  turn = "group-hover:rotate-45",
}: {
  children: ReactNode;
  icon: ReactNode;
  turn?: string;
}) {
  return (
    <>
      <span>{children}</span>
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-full text-white transition-transform duration-500",
          turn,
        )}
        style={{ background: PRINT }}
      >
        {icon}
      </span>
    </>
  );
}

const primaryClass =
  "group inline-flex h-14 items-center gap-4 rounded-full py-2 pl-7 pr-2 text-[16px] font-medium transition-transform duration-300 hover:-translate-y-0.5";
const secondaryClass =
  "group inline-flex h-14 items-center gap-2 rounded-full border-[1.5px] px-7 text-[16px] font-medium transition-colors hover:bg-white";

export function PaperErrorCanvas({
  mark,
  frameLabel,
  sizeLabel,
  status,
  detail,
  title,
  description,
  actions,
  children,
}: {
  mark: ReactNode;
  /** Layer name on the selection frame around the mark. */
  frameLabel: string;
  /** Optional design-tool size readout under the frame. */
  sizeLabel?: string;
  /** Short status in the chip above the mark ("404", "Error"). */
  status: string;
  /** Secondary detail in the chip: the missing path, an error reference. */
  detail?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section
      data-hero-tone="light"
      className="relative isolate overflow-hidden"
      style={{ background: PAPER, color: INK }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70%] bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgba(249,115,22,0.10),transparent_70%)]"
      />
      <CanvasArtefacts missingLayer={frameLabel} />

      <Container className="relative flex min-h-[calc(100svh/var(--s1-zoom,1))] flex-col pb-10 pt-32 sm:pt-36">
        <div className="my-auto flex flex-col items-center text-center">
          <p className="inline-flex max-w-full items-center gap-2.5 bg-white py-1.5 pl-3 pr-4 text-[13px] font-medium shadow-[0_1px_0_rgba(27,23,20,0.06)] sm:text-[14px]">
            <span aria-hidden className="size-2 shrink-0" style={{ background: PRINT }} />
            <span className="tabular-nums">{status}</span>
            {detail ? (
              <>
                <span aria-hidden className="text-[#141414]/25">
                  /
                </span>
                <span className="min-w-0 truncate text-[#141414]/55">{detail}</span>
              </>
            ) : null}
          </p>

          <div className="relative mt-12">
            <SelectionFrame label={frameLabel} labelPosition="top-left">
              {mark}
            </SelectionFrame>
            {sizeLabel ? (
              <span
                aria-hidden
                className="absolute -bottom-[22px] left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-[3px] text-[11px] font-medium leading-none text-white tabular-nums"
                style={{ background: PRINT }}
              >
                {sizeLabel}
              </span>
            ) : null}
            <SearchingCursor />
          </div>

          <h1 className="mt-14 max-w-[760px] text-[32px] font-medium leading-[1.2] tracking-[-0.045em] sm:text-[40px] lg:text-[46px]">
            <span className={highlight}>{title}</span>
          </h1>

          <p className="mt-5 max-w-[520px] text-[16px] leading-[1.6] text-[#141414]/70 sm:text-[18px]">
            {description}
          </p>

          <div className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">
            {actions}
          </div>
        </div>

        {children}
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 404                                                                 */
/* ------------------------------------------------------------------ */

const SUGGESTIONS = [
  { key: "caseStudies", href: "/case-studies", icon: SealCheck },
  { key: "results", href: "/results", icon: ChartLineUp },
  { key: "blog", href: "/blog", icon: Article },
  { key: "about", href: "/about-us", icon: UsersThree },
] as const;

export function PaperNotFound() {
  const t = useTranslations("NotFound");
  const nav = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <PaperErrorCanvas
      mark={<NotFoundMark />}
      frameLabel="page-not-found"
      sizeLabel="404 × 404"
      status={t("eyebrow")}
      detail={
        pathname ? (
          <span className="line-through decoration-[#f97316] decoration-[1.5px]">
            {pathname}
          </span>
        ) : null
      }
      title={
        <>
          {t("titlePrefix")} <span style={{ color: PRINT }}>{t("titleHighlight")}</span>
        </>
      }
      description={t("description")}
      actions={
        <>
          <Link href="/" className={primaryClass} style={{ background: INK, color: PAPER }}>
            <PrimaryPill icon={<ArrowUpRight weight="bold" className="size-4" />}>
              {t("homeCta")}
            </PrimaryPill>
          </Link>
          <Link
            href="/technical-content-marketing"
            className={secondaryClass}
            style={{ borderColor: INK }}
          >
            {t("servicesCta")}
            <ArrowUpRight
              weight="bold"
              className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </>
      }
    >
      <nav aria-label={t("suggestions")} className="mt-20">
        <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-[#141414]/45">
          {t("suggestions")}
        </p>
        <ul role="list" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SUGGESTIONS.map(({ key, href, icon: Icon }) => (
            <li key={key} className="min-w-0">
              <Link
                href={href}
                className="group flex h-full items-center gap-4 rounded-[6px] bg-white/80 p-4 ring-1 ring-inset ring-[#141414]/10 transition-colors duration-300 hover:bg-white"
              >
                <span
                  className="flex size-11 shrink-0 items-center justify-center text-[#f4efe7]"
                  style={{ background: INK }}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-medium leading-tight tracking-[-0.025em]">
                    {nav(`items.${key}`)}
                  </span>
                  <span className="mt-1 block truncate text-[12.5px] text-[#141414]/55">
                    {href}
                  </span>
                </span>
                <ArrowUpRight
                  weight="bold"
                  className="size-4 shrink-0 text-[#141414]/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#141414]"
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </PaperErrorCanvas>
  );
}

/* ------------------------------------------------------------------ */
/* Runtime errors                                                      */
/* ------------------------------------------------------------------ */

type ErrorCopy = {
  status: string;
  titlePrefix: string;
  titleHighlight: string;
  description: string;
  retryCta: string;
  homeCta: string;
  reference: string;
};

/** Error page body; takes its copy as props so global-error can use it without i18n. */
export function PaperErrorView({
  error,
  retry,
  copy,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  copy: ErrorCopy;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PaperErrorCanvas
      mark={<BrokenArtboardMark />}
      frameLabel="render-failed"
      status={copy.status}
      detail={error.digest ? `${copy.reference} ${error.digest}` : null}
      title={
        <>
          {copy.titlePrefix} <span style={{ color: PRINT }}>{copy.titleHighlight}</span>
        </>
      }
      description={copy.description}
      actions={
        <>
          <button
            type="button"
            onClick={retry}
            className={primaryClass}
            style={{ background: INK, color: PAPER }}
          >
            <PrimaryPill
              turn="group-hover:-rotate-180"
              icon={<ArrowCounterClockwise weight="bold" className="size-4" />}
            >
              {copy.retryCta}
            </PrimaryPill>
          </button>
          <Link href="/" className={secondaryClass} style={{ borderColor: INK }}>
            {copy.homeCta}
            <ArrowUpRight
              weight="bold"
              className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </>
      }
    />
  );
}

/** Error boundary body for routes inside the site chrome (translated). */
export function PaperError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("ErrorPage");
  return (
    <PaperErrorView
      error={error}
      retry={retry}
      copy={{
        status: t("eyebrow"),
        titlePrefix: t("titlePrefix"),
        titleHighlight: t("titleHighlight"),
        description: t("description"),
        retryCta: t("retryCta"),
        homeCta: t("homeCta"),
        reference: t("reference"),
      }}
    />
  );
}
