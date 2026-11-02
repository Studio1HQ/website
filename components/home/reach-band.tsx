"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { type WorldMapDot } from "@/components/ui/world-map";
import { CTA_GLOBE_MARKERS } from "@/components/landing/globe-markers";
import { Container, Rise } from "./ui";

function MapPlaceholder() {
  return <div className="aspect-[2/1] w-full rounded-[6px] bg-white/[0.03]" />;
}

const LazyWorldMap = dynamic(
  () => import("@/components/ui/world-map").then((module) => module.WorldMap),
  { ssr: false, loading: MapPlaceholder },
);

const LOCATION_LABELS: Record<string, string> = {
  australia: "Australia",
  brazil: "Brazil",
  france: "France",
  india: "India",
  israel: "Israel",
  netherlands: "Netherlands",
  us: "USA",
  singapore: "Singapore",
  vietnam: "Vietnam",
};

const LABEL_OFFSETS: Record<string, { x: number; y: number }> = {
  france: { x: -5, y: 3.8 },
  israel: { x: 6, y: 4.8 },
  netherlands: { x: 6, y: -5.2 },
};

function markerPoint(id: string) {
  const marker = CTA_GLOBE_MARKERS.find((m) => m.id === id);
  if (!marker) {
    throw new Error(`Missing globe marker: ${id}`);
  }
  const [lat, lng] = marker.location;
  return {
    lat,
    lng,
    label: LOCATION_LABELS[id] ?? id,
    labelOffset: LABEL_OFFSETS[id],
  };
}

/** Arcs flow out from India westward, in from the east. */
const HUB = "india";
const WEST_SPOKE_IDS = ["us", "france", "netherlands", "israel", "brazil"] as const;
const EAST_SPOKE_IDS = ["singapore", "vietnam", "australia"] as const;

const DOTS: WorldMapDot[] = [
  ...WEST_SPOKE_IDS.map((id) => ({ start: markerPoint(HUB), end: markerPoint(id) })),
  ...EAST_SPOKE_IDS.map((id) => ({
    start: markerPoint(HUB),
    end: markerPoint(id),
    reverse: true,
  })),
];

export default function ReachBand() {
  const t = useTranslations("GlobalReach");
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [loadMap, setLoadMap] = useState(false);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setIsPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const target = mapRef.current;
    if (!target || loadMap) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setLoadMap(true);
          observer.disconnect();
        }
      },
      { rootMargin: "650px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMap]);

  return (
    <section
      id="global-reach"
      className="relative pb-24 pt-6 md:pb-32"
      style={{
        background:
          "linear-gradient(180deg, #c2410c 0%, var(--home-ember-soft) 30%, var(--home-peach) 62%, var(--home-cream) 100%)",
      }}
    >
      <Container>
        <Rise>
          {/* Always-dark panel, like the night sections, in both themes */}
          <div className="dark s1-glass-dark relative isolate overflow-hidden rounded-[6px] text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.3),transparent_65%)] blur-2xl"
            />

            <div className="mx-auto max-w-[820px] px-6 pt-14 text-center sm:px-10 md:pt-20">
              <p className="font-editorial text-[20px] text-[#fdba74] md:text-[22px]">
                {t("eyebrow")}
              </p>
              <h2 className="mt-5 text-[36px] font-medium leading-[1.04] tracking-[-0.05em] sm:text-[52px] lg:text-[64px]">
                {t("titlePrefix")}{" "}
                <span className="font-editorial text-[#fdba74]">{t("titleHighlight")}</span>
              </h2>
              <p className="mx-auto mt-6 max-w-[600px] text-[15px] leading-[1.65] text-white/60 sm:text-[17px]">
                {t("description")}
              </p>
            </div>

            <div ref={mapRef} className="px-2 pb-6 pt-6 text-[#fb923c] sm:px-8 sm:pb-10 md:px-12 md:pt-10">
              {loadMap ? (
                <LazyWorldMap
                  dots={DOTS}
                  lineColor="currentColor"
                  // Labels are unreadable at phone width; the copy names every country.
                  showLabels={!isPhone}
                  animationDuration={1.4}
                  loop
                  tone="dark"
                  showFlags
                />
              ) : (
                <MapPlaceholder />
              )}
            </div>
          </div>
        </Rise>
      </Container>
    </section>
  );
}
