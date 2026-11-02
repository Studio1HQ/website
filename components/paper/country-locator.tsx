"use client";

import { useEffect, useState } from "react";
import { INK, PRINT } from "./paper-hero";

type Locator = {
  width: number;
  height: number;
  /** Land dots around the country, [x, y]. */
  base: [number, number][];
  /** Dots inside the country's real border. */
  lit: [number, number][];
  /** Country centre, for the marker on very small countries. */
  pin: [number, number];
};

type Locators = Record<string, Locator>;

const DOT = 0.36;

// The regional maps are only needed on hover, so they load on first use.
let cache: Promise<Locators> | null = null;
function loadLocators() {
  cache ??= import("@/data/country-locators.json").then(
    (module) => module.default as unknown as Locators,
  );
  return cache;
}

/** Every dot as one path (a full circle per dot), so each map is one element. */
export function dotsPath(points: [number, number][], r: number) {
  return points
    .map(
      ([x, y]) =>
        `M${(x - r).toFixed(2)} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`,
    )
    .join("");
}

/**
 * Regional dotted map with the country's real border lit in orange
 * (precomputed from dotted-map's country outlines into
 * data/country-locators.json). Very small countries also get a ring.
 */
export function CountryLocator({
  country,
  className,
}: {
  country: string;
  className?: string;
}) {
  const [locators, setLocators] = useState<Locators | null>(null);

  useEffect(() => {
    let live = true;
    loadLocators().then((data) => live && setLocators(data));
    return () => {
      live = false;
    };
  }, []);

  const map = locators?.[country];
  if (!map) return <div className={className} />;
  const [px, py] = map.pin;
  // Marker sizes scale with the grid resolution.
  const k = map.width / 72;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${map.width} ${map.height}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      style={{ color: INK }}
    >
      <path d={dotsPath(map.base, DOT)} fill="currentColor" opacity={0.26} />
      <path d={dotsPath(map.lit, DOT * 1.12)} fill={PRINT} />
      {map.lit.length < 160 ? (
        <>
          <circle
            cx={px}
            cy={py}
            r={2.6 * k}
            fill="none"
            stroke={PRINT}
            strokeWidth={0.4 * k}
          />
          {map.lit.length === 0 ? (
            <circle cx={px} cy={py} r={0.9 * k} fill={PRINT} />
          ) : null}
        </>
      ) : null}
    </svg>
  );
}

/** Warms the regional maps so the first hover has nothing to wait for. */
export function preloadLocators() {
  void loadLocators();
}
