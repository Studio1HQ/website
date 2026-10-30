"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, LinkedinLogo } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/home/ui";
import { Construction, Cursor } from "@/components/paper/paper-hero";
import {
  IndexBar,
  MUTED,
  PaperSection,
} from "@/components/paper/paper-sections";
import { INK, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/*
 * Product 03, still on the workbench: the facts we can share on one side
 * and, on the other, a dashed wireframe on a dot grid with a cursor still
 * moving blocks around.
 */

const LINKEDIN = "https://www.linkedin.com/company/studio1hq/";

/** A block in the wireframe: dashed outline with a slow shimmer. */
function Sketch({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative block overflow-hidden rounded-[4px] border border-dashed border-[#141414]/25 bg-white/40",
        className,
      )}
    >
      {children}
      <span className="absolute inset-0 -translate-x-full animate-sweep bg-[linear-gradient(90deg,transparent,rgba(249,115,22,0.12),transparent)] motion-reduce:hidden" />
    </span>
  );
}

/** A card's contents, roughed in: an icon, a chart, two lines of copy. */
function CardSketch({ tint = "rgba(20,20,20,0.08)" }: { tint?: string }) {
  return (
    <span className="flex h-full flex-col gap-1.5 p-2.5">
      <span
        className="size-4 rounded-full border border-dashed"
        style={{ borderColor: tint }}
      />
      <span className="mt-auto flex h-[38%] items-end gap-1">
        {[45, 70, 55, 90, 65].map((height) => (
          <span
            key={height}
            className="flex-1 rounded-t-[2px]"
            style={{ height: `${height}%`, background: tint }}
          />
        ))}
      </span>
      <span
        className="mt-1 h-1.5 w-4/5 rounded-full"
        style={{ background: tint }}
      />
      <span className="h-1.5 w-1/2 rounded-full" style={{ background: tint }} />
    </span>
  );
}

function Blueprint() {
  const t = useTranslations("ProductPage.next");
  const reduceMotion = useReducedMotion();
  return (
    <div
      aria-hidden
      className="relative min-h-[340px] overflow-hidden bg-[#fbfaf7] shadow-[inset_0_3px_10px_rgba(20,20,20,0.10),inset_0_1px_2px_rgba(20,20,20,0.08)] [background-image:radial-gradient(rgba(20,20,20,0.16)_1px,transparent_1px)] [background-size:18px_18px] lg:min-h-0"
    >
      <Construction className="absolute -right-6 -top-4 w-[180px] opacity-[0.18]" />

      {/* The wireframe */}
      <div className="absolute inset-x-[8%] bottom-[14%] top-[14%] flex flex-col rounded-[6px] border-[1.5px] border-dashed border-[#141414]/30 bg-[#fbfaf7]/80 p-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="size-2 rounded-full border border-dashed border-[#141414]/30"
            />
          ))}
          <Sketch className="ml-3 h-3 w-1/3" />
        </div>
        <div className="mt-3 flex flex-1 gap-3">
          <div className="hidden w-[22%] flex-col gap-2 sm:flex">
            <Sketch className="h-3 w-4/5" />
            <Sketch className="h-3 w-3/5" />
            <Sketch className="h-3 w-4/5" />
            <Sketch className="h-3 w-2/5" />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <Sketch className="h-5 w-1/2" />
            <div className="grid flex-1 grid-cols-3 gap-2">
              <Sketch>
                <CardSketch />
              </Sketch>
              {/* The block being moved: selected, in print orange */}
              <motion.div
                className="relative rounded-[4px] border-[1.5px] bg-[#f97316]/10"
                style={{ borderColor: PRINT }}
                animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {[
                  "-left-[4px] -top-[4px]",
                  "-right-[4px] -top-[4px]",
                  "-bottom-[4px] -left-[4px]",
                  "-bottom-[4px] -right-[4px]",
                ].map((corner) => (
                  <span
                    key={corner}
                    className={cn(
                      "absolute size-[7px] border-[1.5px] bg-[#fbfaf7]",
                      corner,
                    )}
                    style={{ borderColor: PRINT }}
                  />
                ))}
                <span
                  className="absolute -top-[20px] left-[-1.5px] whitespace-nowrap px-1.5 py-[3px] text-[10px] font-medium leading-none text-white"
                  style={{ background: PRINT }}
                >
                  product-03
                </span>
                <motion.span
                  className="absolute -bottom-5 -right-5"
                  animate={
                    reduceMotion
                      ? undefined
                      : { x: [0, 10, -4, 0], y: [0, 6, 12, 0] }
                  }
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Cursor color={INK} className="size-6" />
                </motion.span>
                <CardSketch tint="rgba(249,115,22,0.35)" />
              </motion.div>
              <Sketch>
                <CardSketch />
              </Sketch>
            </div>
            <Sketch className="h-8" />
          </div>
        </div>
      </div>

      {/* Building, with no promise of when */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-full bg-white/90 py-1.5 pl-2.5 pr-3.5 text-[12px] font-medium ring-1 ring-inset ring-[#141414]/10">
        <span className="relative h-1.5 w-12 overflow-hidden rounded-full bg-[#141414]/10">
          <span
            className="absolute inset-y-0 w-1/2 animate-sweep rounded-full [animation-duration:1.6s] motion-reduce:hidden"
            style={{ background: PRINT }}
          />
        </span>
        {t("building")}
      </div>
    </div>
  );
}

export default function NextProduct({ index }: { index: number }) {
  const t = useTranslations("ProductPage.next");
  return (
    <PaperSection id="next" tone="paper" className="scroll-mt-24">
      <Container>
        <IndexBar index={index} name={t("indexName")} aside={t("aside")} />

        <div className="mt-8 grid overflow-hidden rounded-[6px] bg-white/80 shadow-[inset_0_1px_0_#fff,0_24px_50px_-36px_rgba(20,20,20,0.45)] ring-1 ring-inset ring-[#141414]/[0.08] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="flex flex-col p-6 sm:p-8 md:p-10">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-[12px] border-[1.5px] border-dashed border-[#141414]/25">
                <span
                  aria-hidden
                  className="h-5 w-[2px] animate-pulse rounded-full"
                  style={{ background: PRINT }}
                />
              </span>
              <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-[#141414]/60">
                <span>{t("category")}</span>
                <span aria-hidden className="text-[#141414]/30">
                  ·
                </span>
                <span className="inline-flex items-center px-1.5 py-[3px] text-[11px] leading-none text-[#141414] ring-1 ring-inset ring-[#141414]/30">
                  {t("status")}
                </span>
              </div>
            </div>

            <h2 className="mt-8 text-[30px] font-medium leading-[1.15] tracking-[-0.045em] md:text-[40px]">
              {t("title")}
            </h2>

            <p className="mt-5 flex items-center gap-3 text-[14px]">
              <span className="text-[#141414]/55">{t("codename")}</span>
              <span
                role="img"
                aria-label={t("redacted")}
                className="inline-block h-[1.1em] w-[8ch] rounded-[2px] bg-[repeating-linear-gradient(-45deg,#141414_0_6px,#262626_6px_12px)]"
              />
            </p>

            <p
              className={cn(
                "mt-5 max-w-[440px] text-[15.5px] leading-[1.65]",
                MUTED,
              )}
            >
              {t("description")}
            </p>

            <div className="mt-8 lg:mt-auto lg:pt-10">
              <a
                href={LINKEDIN}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-12 items-center gap-2.5 rounded-full border-[1.5px] border-[#141414] px-6 text-[15px] font-medium transition-colors hover:bg-[#141414] hover:text-[#f4efe7]"
              >
                <LinkedinLogo aria-hidden weight="fill" className="size-4" />
                {t("follow")}
                <ArrowUpRight
                  aria-hidden
                  weight="bold"
                  className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </a>
            </div>
          </div>

          <Blueprint />
        </div>
      </Container>
    </PaperSection>
  );
}
