"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { Container } from "@/components/home/ui";
import {
  Accent,
  IndexBar,
  MUTED,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";
import { pad } from "@/components/hackathons/hackathon-ui";
import { CityIcon } from "@/components/hackathons/city-icons";
import type { PastPartnership } from "@/data/hackathons";
import type { IndiaMap } from "@/lib/india-map";
import { PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/** Real work that included hackathons, from the case studies. */
const PROOF = [
  {
    name: "Corsair",
    detail: "student hackathons",
    href: "/case-studies/corsair",
  },
  {
    name: "OpenLore",
    detail: "talks and hackathons",
    href: "/case-studies/openlore",
  },
];

const DOT = 0.36;

/**
 * Hackathons Studio1 has backed across India: a dot map with a pin per
 * city beside the list. Hovering a row lights its pin, and the reverse.
 */
export function TrackRecord({
  index,
  partnerships,
  map,
}: {
  index: number;
  partnerships: PastPartnership[];
  map: IndiaMap;
}) {
  const [active, setActive] = useState<number | null>(null);
  const cities = new Set(partnerships.map((item) => item.city)).size;
  const placeholder = partnerships.some((item) => item.placeholder);

  return (
    <PaperSection id="track-record" tone="paper" className="scroll-mt-24 !pt-0">
      <Container>
        <IndexBar
          index={index}
          name="Track record"
          aside={
            placeholder ? (
              <span className="border border-dashed border-[#141414]/30 px-1.5 py-[2px] text-[11px] text-[#141414]/50">
                Placeholder list
              </span>
            ) : (
              "Across India"
            )
          }
        />
        <SectionHead
          title={
            <>
              Hackathons we&apos;ve backed <Accent>across India</Accent>
            </>
          }
          description="Before running our own, we partnered with hackathons around the country as mentors, judges, sponsors, and community partners."
        />

        <div className="mt-12 grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
          {/* The map: dots straight on the paper, a pin per city */}
          <div className="relative mx-auto w-full max-w-[460px]">
            <svg
              viewBox={`-1 -1 ${map.width + 2} ${map.height + 2}`}
              className="h-auto w-full"
              role="img"
              aria-label={`Map of India with ${cities} cities where we've partnered on hackathons`}
            >
              <g fill="#141414" fillOpacity={0.2}>
                {map.dots.map(([x, y]) => (
                  <circle key={`${x},${y}`} cx={x} cy={y} r={DOT} />
                ))}
              </g>
              {partnerships.map((item, i) => {
                const pin = map.pins[`${i}`];
                if (!pin) return null;
                const lit = active === null || active === i;
                return (
                  <g
                    key={`${item.city}-${i}`}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                    className="cursor-default"
                  >
                    {active === i ? (
                      <circle
                        cx={pin[0]}
                        cy={pin[1]}
                        r={4.6}
                        fill={PRINT}
                        fillOpacity={0.16}
                      />
                    ) : null}
                    <circle
                      cx={pin[0]}
                      cy={pin[1]}
                      r={active === i ? 1.9 : 1.4}
                      fill={PRINT}
                      fillOpacity={lit ? 1 : 0.35}
                      className="transition-all duration-300"
                    />
                    {active === i ? (
                      <text
                        x={pin[0] + 3.6}
                        y={pin[1] + 1.5}
                        fontSize={4.4}
                        fontWeight={600}
                        fill="#141414"
                        // A paper-coloured halo keeps the name readable over the dots
                        stroke="#f4efe7"
                        strokeWidth={1.6}
                        paintOrder="stroke"
                      >
                        {item.city}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>

          <div>
            <div className="grid max-w-[420px] grid-cols-2 gap-2">
              {[
                [partnerships.length, "hackathons"],
                [cities, "cities"],
              ].map(([value, label]) => (
                <p
                  key={label}
                  className="flex items-baseline gap-2 rounded-[6px] px-5 py-4 bg-[#ebe6de] shadow-[inset_0_2px_6px_rgba(20,20,20,0.09),inset_0_1px_2px_rgba(20,20,20,0.07),inset_0_-1px_0_rgba(255,255,255,0.8)]"
                >
                  <span className="text-[44px] font-medium leading-none tracking-[-0.05em] tabular-nums sm:text-[56px]">
                    {value}
                  </span>
                  <span className={cn("text-[15px]", MUTED)}>{label}</span>
                </p>
              ))}
            </div>

            <ol
              className="mt-8 border-t border-[#141414]/[0.14]"
              onMouseLeave={() => setActive(null)}
            >
              {partnerships.map((item, i) => (
                <li
                  key={`${item.name}-${i}`}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "group grid grid-cols-[32px_44px_minmax(0,1fr)_auto_auto] items-center gap-x-3 border-b border-[#141414]/[0.14] py-3.5 transition-colors",
                    active !== null && active !== i && "text-[#141414]/45",
                  )}
                >
                  <span
                    className="text-[12px] font-medium tabular-nums"
                    style={{ color: PRINT }}
                  >
                    {pad(i + 1)}
                  </span>
                  {/* The city's landmark, engraved into a small tile */}
                  <span
                    className={cn(
                      "flex size-11 items-center justify-center rounded-[6px] text-[#141414]/70 transition-colors duration-300 group-hover:text-[#ea580c]",
                      "bg-[#ebe6de] shadow-[inset_0_2px_6px_rgba(20,20,20,0.09),inset_0_1px_2px_rgba(20,20,20,0.07),inset_0_-1px_0_rgba(255,255,255,0.8)]",
                    )}
                  >
                    <CityIcon city={item.city} className="size-7" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-medium tracking-[-0.015em]">
                      {item.href ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline decoration-[#141414]/20 underline-offset-4 hover:decoration-[#f97316]"
                        >
                          {item.name}
                        </a>
                      ) : (
                        item.name
                      )}
                    </span>
                    <span className={cn("block text-[13px]", MUTED)}>
                      {item.city} · {item.year}
                    </span>
                  </span>
                  <span className="text-right text-[12.5px] font-medium text-[#141414]/60">
                    {item.role}
                  </span>
                  {/* Points to the city on the map; turns orange with it */}
                  <ArrowUpRight
                    aria-hidden
                    weight="bold"
                    className="size-3.5 text-[#141414]/30 transition-[color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#f97316]"
                  />
                </li>
              ))}
            </ol>

            <p className={cn("mt-6 text-[14px]", MUTED)}>
              See it in practice:{" "}
              {PROOF.map((proof, i) => (
                <span key={proof.href}>
                  {i > 0 ? " · " : null}
                  <Link
                    href={proof.href}
                    className="group inline-flex items-center gap-1 font-medium text-[#141414] underline decoration-[#f97316] decoration-2 underline-offset-4"
                  >
                    {proof.name}
                    <ArrowUpRight
                      weight="bold"
                      className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </Link>{" "}
                  <span>({proof.detail})</span>
                </span>
              ))}
            </p>
          </div>
        </div>
      </Container>
    </PaperSection>
  );
}
