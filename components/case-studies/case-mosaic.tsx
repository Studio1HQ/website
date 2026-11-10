"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { GRAIN } from "@/lib/paper";
import { cn } from "@/lib/utils";

export type MosaicLogo = {
  slug: string;
  client: string;
  logo: StaticImageData;
};
export type MosaicPhoto = { slug: string; src: string; alt: string };

/*
 * 16 x 8 grid. Key:
 *   .  open paper (the heading sits here)   c  paper cell
 *   L  client logo   P  photo, 2 x 2 (x = covered by it)
 *   o  print orange   p  peach   k  ink   s  sand
 */
const MAP = [
  "PxcocLcccscPxpcL",
  "xxcsLccckccxxckc",
  "cLcc........ccLc",
  "oc............cL",
  "cL............pc",
  "Lccc........cLsc",
  "PxkcLccscocLcPxc",
  "xxcspcLcccccsxxL",
];
const COLS = 16;
const ROWS = MAP.length;

const FILL: Record<string, string> = {
  o: "#f97316",
  p: "#f6c39a",
  k: "#1c1917",
  s: "#e7dccb",
};

/** Each mark's own background colour, and how large it sits in its cell. */
const TILE: Record<string, { bg: string; scale?: number }> = {
  brightdata: { bg: "#3c7ffc" },
  "entelligence-ai": { bg: "#000000" },
  ittybit: { bg: "#170a31" },
  jozu: { bg: "#fbf9f5", scale: 0.62 },
  litellm: { bg: "#9dcbd7", scale: 0.96 },
  memori: { bg: "#0f0f0f" },
  nebius: { bg: "#e0ff53" },
  permit: { bg: "#ffffff", scale: 0.92 },
  scrapegraph: { bg: "#5034c2" },
  webcrumbs: { bg: "#fa5b31", scale: 1.14 },
  corsair: { bg: "#fbf9f5", scale: 0.66 },
  openlore: { bg: "#574191" },
  tensorlake: { bg: "#1d1f1c" },
};

/**
 * On hover: a small name pill beside the tile. Above it normally; below it
 * on the top row, where the navbar would cover it.
 */
function HoverLabel({ name, below }: { name: string; below?: boolean }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#141414] px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-[0_8px_18px_-8px_rgba(20,20,20,0.6)] transition-[opacity,transform] duration-300 group-hover:opacity-100",
        below
          ? "-bottom-3 translate-y-full group-hover:translate-y-[calc(100%+4px)]"
          : "-top-3 -translate-y-full group-hover:-translate-y-[calc(100%+4px)]",
      )}
    >
      {name}
      <span className="ml-1.5 text-[#fb923c]">↗</span>
    </span>
  );
}

const pct = (n: number) => `${((n / COLS) * 100).toFixed(4)}%`;
const pctY = (n: number) => `${((n / ROWS) * 100).toFixed(4)}%`;

/**
 * The case studies hero as a mosaic: a grid of paper cells around a clear,
 * stepped space for the heading. Some cells carry client marks, a few are
 * filled with brand colour, and the corners hold photos from the work.
 * Cells settle in from the edges toward the middle.
 */
export function CaseMosaic({
  logos,
  photos,
  children,
}: {
  logos: MosaicLogo[];
  photos: MosaicPhoto[];
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  let logoAt = 0;
  let photoAt = 0;

  const cells: ReactNode[] = [];
  MAP.forEach((row, r) => {
    [...row].forEach((key, c) => {
      if (key === "." || key === "x") return;
      const span = key === "P" ? 2 : 1;
      // Outer cells first, settling toward the middle
      const dist = Math.hypot((c - 7.5) / 8, (r - 3.5) / 4);
      const delay = 0.05 + (1.3 - dist) * 0.35;
      let body: ReactNode = null;
      let href: string | null = null;
      let label = "";
      let hoverName = "";

      if (key === "L" && logos.length) {
        const item = logos[logoAt++ % logos.length];
        href = `/case-studies/${item.slug}`;
        label = `${item.client} case study`;
        hoverName = item.client;
        body = (
          <>
            <span
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: TILE[item.slug]?.bg ?? "#fbf9f5" }}
            >
              {/* The mark, uncropped, centred on its own colour */}
              <span
                className="relative aspect-square h-full max-w-full"
                style={{ transform: `scale(${TILE[item.slug]?.scale ?? 1})` }}
              >
                <span className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]">
                  <Image
                    src={item.logo}
                    alt=""
                    fill
                    sizes="140px"
                    className="object-contain"
                  />
                </span>
              </span>
            </span>
          </>
        );
      } else if (key === "P" && photos.length) {
        const item = photos[photoAt++ % photos.length];
        href = `/case-studies/${item.slug}`;
        label = item.alt;
        hoverName = item.alt;
        body = (
          <Image
            src={item.src}
            alt=""
            fill
            // A photo covers 2 of the 16 full-bleed columns.
            sizes="(min-width: 1024px) 13vw, 200px"
            quality={95}
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
          />
        );
        body = <>{body}</>;
      } else if (FILL[key]) {
        body = (
          <span
            className="absolute inset-0 opacity-25 mix-blend-multiply"
            style={{ backgroundImage: GRAIN }}
          />
        );
      }

      const style = {
        left: pct(c),
        top: pctY(r),
        width: pct(span),
        height: pctY(span),
        background: FILL[key] ?? "#fbf9f5",
      };
      const className = cn(
        "group absolute shadow-[inset_0_0_0_0.5px_rgba(20,20,20,0.16)]",
        href &&
          "transition-[box-shadow] duration-300 hover:z-30 hover:shadow-[0_0_0_2px_#f97316,0_18px_30px_-14px_rgba(20,20,20,0.45)]",
      );

      cells.push(
        <motion.div
          key={`${r}-${c}`}
          className={className}
          style={style}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.7,
            ease: [0.16, 1, 0.3, 1],
            delay: Math.max(0, delay),
          }}
        >
          {href ? (
            <Link
              href={href}
              aria-label={label}
              className="absolute inset-0 overflow-hidden"
            >
              {body}
            </Link>
          ) : (
            body
          )}
          {hoverName ? <HoverLabel name={hoverName} below={r === 0} /> : null}
        </motion.div>,
      );
    });
  });

  return (
    <div className="relative">
      {/* Large screens: the mosaic, full bleed */}
      <div
        // 100vw / 100svh are divided by the page zoom (body zoom >= 1800px),
        // otherwise the mosaic overflows and its edge photos fall off-screen.
        className="relative left-1/2 hidden w-[calc(100vw/var(--s1-zoom,1))] -translate-x-1/2 lg:block"
        // Fills the first screen, under the 80px navbar
        style={{ height: "max(560px, calc(100svh / var(--s1-zoom, 1) - 80px))" }}
      >
        {cells}
        <div className="absolute inset-x-[14%] top-1/2 z-10 -translate-y-1/2">
          {children}
        </div>
      </div>

      {/* Smaller screens: heading, then the marks in a row */}
      <div className="px-4 lg:hidden">
        {children}
        <div className="-mx-4 mt-10 flex gap-2 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {logos.map((item) => (
            <Link
              key={item.slug}
              href={`/case-studies/${item.slug}`}
              aria-label={`${item.client} case study`}
              className={cn(
                "relative size-[64px] shrink-0 overflow-hidden rounded-[6px] shadow-[0_10px_20px_-12px_rgba(20,20,20,0.5)]",
              )}
            >
              <Image
                src={item.logo}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
