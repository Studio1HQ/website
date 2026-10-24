"use client";

import { AnimatePresence, motion } from "motion/react";
import world from "@/data/world-reach.json";
import { EASE } from "@/components/home/ui";
import Logo from "@/components/ui/svgs/logo";
import { LocaleFlag } from "@/components/localization/locale-flag";
import { MAP_FLAGS } from "@/components/ui/map-flags";
import { cn } from "@/lib/utils";
import { CountryLocator, dotsPath } from "./country-locator";
import { INK, PRINT } from "./paper-hero";

type WorldReach = {
  width: number;
  height: number;
  /** Land dots, [x, y]. */
  base: [number, number][];
  /** Dots inside each country's real border. */
  lit: Record<string, [number, number][]>;
  /** Each country's marker position. */
  pins: Record<string, [number, number]>;
};

const MAP = world as unknown as WorldReach;
const DOT = 0.36;
// Marker sizes were tuned on a 220-column map; scale them with the grid.
const K = MAP.width / 220;
/** Where each country's marker sits: the middle of its lit dots, else its pin. */
const ANCHORS: Record<string, [number, number]> = Object.fromEntries(
  Object.entries(MAP.pins).map(([name, pin]) => {
    const dots = MAP.lit[name] ?? [];
    if (!dots.length) return [name, pin];
    const x = dots.reduce((sum, [dx]) => sum + dx, 0) / dots.length;
    const y = dots.reduce((sum, [, dy]) => sum + dy, 0) / dots.length;
    return [name, [x, y]];
  }),
);
/** Countries too small to read as a shape get a single clean dot. */
const isTiny = (name: string) => (MAP.lit[name]?.length ?? 0) < 40;

const LIT_PATHS = Object.fromEntries(
  Object.entries(MAP.lit).map(([name, points]) => [
    name,
    dotsPath(points, DOT * 1.12),
  ]),
);

/** Round flag for a reach country (India comes from the locale flags). */
export function CountryFlag({
  country,
  className,
}: {
  country: string;
  className?: string;
}) {
  if (country === "India")
    return <LocaleFlag locale="hi" className={cn("size-4", className)} />;
  const flag = MAP_FLAGS[country];
  if (!flag) return null;
  return (
    <svg
      viewBox="0 0 10 10"
      aria-hidden
      className={cn(
        "size-4 shrink-0 rounded-full ring-1 ring-black/10",
        className,
      )}
    >
      {flag}
    </svg>
  );
}

/**
 * Dotted world map with every country Studio1 works with lit in orange
 * (precomputed from dotted-map's country outlines into data/world-reach.json).
 * Hovering a country, on the map or in the list, dims the rest and opens a
 * card with that country's own regional map.
 */
export function WorldReachMap({
  hq,
  highlight,
  onHighlight,
  className,
}: {
  hq: string;
  highlight: string | null;
  onHighlight: (country: string | null) => void;
  className?: string;
}) {
  const pin = highlight ? ANCHORS[highlight] : null;
  // Card sits below pins in the top part of the map, above the rest.
  const below = pin ? pin[1] / MAP.height < 0.42 : false;

  return (
    <div className={className}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${MAP.width} ${MAP.height}`}
          className="block h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ color: `var(--p-fg, ${INK})` }}
          onPointerLeave={() => onHighlight(null)}
        >
          <title>Countries Studio1 works with</title>
          <path
            d={dotsPath(MAP.base, DOT)}
            fill="currentColor"
            opacity={0.24}
          />
          {Object.entries(LIT_PATHS).map(([name, d]) => (
            <path
              key={name}
              d={d}
              fill={PRINT}
              style={{
                opacity: highlight && highlight !== name ? 0.3 : 1,
                transition: "opacity 300ms ease",
              }}
            />
          ))}
          {Object.keys(MAP.pins).map((name) => {
            const [x, y] = ANCHORS[name];
            const dimmed = highlight && highlight !== name;
            return (
              <g key={name}>
                {isTiny(name) ? (
                  <circle
                    cx={x}
                    cy={y}
                    r={1.5 * K}
                    fill={PRINT}
                    stroke="#fff"
                    strokeWidth={0.6 * K}
                    style={{
                      opacity: dimmed ? 0.35 : 1,
                      transition: "opacity 300ms ease",
                    }}
                  />
                ) : null}
                {/* Invisible hit area over the country */}
                <circle
                  cx={x}
                  cy={y}
                  r={
                    Math.max(7, Math.sqrt(MAP.lit[name]?.length ?? 0) * 0.55) *
                    K
                  }
                  fill="transparent"
                  className="cursor-pointer"
                  onPointerEnter={() => onHighlight(name)}
                />
              </g>
            );
          })}
        </svg>

        <AnimatePresence>
          {/* Studio1 mark on HQ, and on whichever country is hovered */}
          {Array.from(new Set([hq, ...(highlight ? [highlight] : [])])).map(
            (name) => {
              const [x, y] = ANCHORS[name];
              const active = name === highlight;
              return (
                <motion.span
                  key={`pin-${name}`}
                  aria-hidden
                  className="pointer-events-none absolute z-20 flex flex-col items-center"
                  style={{
                    left: `${(x / MAP.width) * 100}%`,
                    top: `${(y / MAP.height) * 100}%`,
                    x: "-50%",
                    y: "-100%",
                  }}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: active ? 1 : 0.8 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                >
                  <span
                    className="flex size-8 items-center justify-center rounded-[9px] shadow-[0_10px_22px_-8px_rgba(249,115,22,0.75)] ring-2 ring-white"
                    style={{ background: PRINT }}
                  >
                    <Logo className="size-[18px] brightness-0 invert" />
                  </span>
                  <span
                    className="-mt-px h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent"
                    style={{ borderTopColor: PRINT }}
                  />
                </motion.span>
              );
            },
          )}
          {highlight && pin ? (
            <motion.div
              key={highlight}
              aria-hidden
              className="pointer-events-none absolute z-10 w-[220px] bg-white p-2 shadow-[0_24px_48px_-24px_rgba(20,20,20,0.45)] ring-1 ring-[#141414]/10"
              style={{
                left: `${(pin[0] / MAP.width) * 100}%`,
                top: `${(pin[1] / MAP.height) * 100}%`,
                x: "-50%",
                y: below ? "16px" : "calc(-100% - 52px)",
              }}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              <CountryLocator
                country={highlight}
                className="aspect-[3/2] w-full bg-[#f4efe7]"
              />
              <div className="flex items-center justify-between px-1 pb-0.5 pt-2">
                <span className="flex items-center gap-2 text-[14px] font-medium tracking-[-0.02em] text-[#141414]">
                  <span
                    className="flex size-5 items-center justify-center rounded-[5px]"
                    style={{ background: PRINT }}
                  >
                    <Logo className="size-3 brightness-0 invert" />
                  </span>
                  Studio1 in {highlight}
                </span>
                {highlight === hq ? (
                  <span
                    className="px-1.5 py-[3px] text-[10px] font-medium leading-none text-white"
                    style={{ background: PRINT }}
                  >
                    HQ
                  </span>
                ) : (
                  <CountryFlag country={highlight} />
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
