"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  JesseImg,
  JuliaImg,
  MarketaImg,
  SauravImg,
} from "@/constants/image";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import {
  ArrowUpRight,
  Books,
  Megaphone,
  PenNib,
  VideoCamera,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Particles } from "@/components/ui/particles";
import { Container, EASE, PillLink } from "./ui";
import { DitherField } from "./dither-field";

type OfferingCopy = { label: string; description: string };

const TRUSTED_FACES = [
  { src: SauravImg, alt: "Saurav" },
  { src: JesseImg, alt: "Jesse" },
  { src: MarketaImg, alt: "Marketa" },
  { src: JuliaImg, alt: "Julia" },
] as const;

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

/** Shows one offering at a time, sliding the next one up into place. */
function CyclingLabel({ items, offset }: { items: string[]; offset: number }) {
  const reduceMotion = useReducedMotion();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (items.length < 2 || reduceMotion) return;
    let interval: number | undefined;
    // Stagger the rows so they don't all change at the same moment.
    const start = window.setTimeout(() => {
      interval = window.setInterval(
        () => setCurrent((value) => (value + 1) % items.length),
        2600,
      );
    }, offset * 1000);
    return () => {
      window.clearTimeout(start);
      if (interval) window.clearInterval(interval);
    };
  }, [items.length, offset, reduceMotion]);

  return (
    <span className="relative block h-[1.4em] w-full overflow-hidden text-[12.5px] leading-[1.4] text-white/45">
      <span className="sr-only">{items.join(", ")}</span>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={items[current]}
          aria-hidden
          className="absolute inset-x-0 top-0 truncate text-center"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {items[current]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function NightHero() {
  const t = useTranslations("Hero");
  const nav = useTranslations("Nav");
  const domains = useTranslations("HomeDomains");
  const offerings = domains.raw("offerings") as OfferingCopy[];
  const reduceMotion = useReducedMotion();
  const introDelay = useIntroDelay();
  // Only animate the starfield while the hero is on screen; fewer stars on phones.
  const sectionRef = useRef<HTMLElement>(null);
  const heroVisible = useInView(sectionRef, { margin: "100px 0px" });
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setIsPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const enter = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1.1, ease: EASE, delay: introDelay + delay },
  });

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative isolate overflow-hidden text-white"
      style={{
        background:
          "linear-gradient(180deg, #07050a 0%, #0b0706 55%, #1c0d07 100%)",
      }}
    >
      {/* Starfield */}
      {reduceMotion || !heroVisible ? null : (
        <>
          <Particles
            className="pointer-events-none absolute inset-0 -z-10"
            quantity={isPhone ? 70 : 170}
            staticity={90}
            ease={90}
            size={0.55}
            color="#ffffff"
          />
          <Particles
            className="pointer-events-none absolute inset-0 -z-10"
            quantity={isPhone ? 15 : 35}
            staticity={70}
            ease={90}
            size={0.8}
            color="#fdba74"
          />
        </>
      )}

      {/* Melts the planet into the showreel's background so there is no seam */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-[5] h-48 bg-[linear-gradient(180deg,rgba(28,13,7,0)_0%,rgba(28,13,7,0.85)_60%,#1c0d07_100%)]"
      />

      {/* Ember planet horizon */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[74%] -z-10 h-[1600px] w-[2600px] -translate-x-1/2 rounded-[50%] bg-[#0a0605]"
        style={{
          boxShadow:
            "0 -2px 0 0 rgba(253,186,116,0.55), 0 -30px 90px -10px rgba(249,115,22,0.55), 0 -120px 220px 0 rgba(194,65,12,0.35), inset 0 30px 120px -40px rgba(249,115,22,0.35)",
        }}
        initial={reduceMotion ? false : { y: 160, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 2.2, ease: EASE, delay: introDelay }}
      />

      <Container className="relative flex min-h-[calc(100svh/var(--s1-zoom,1))] flex-col justify-end pb-10 pt-40">
        <div className="mx-auto mb-auto mt-auto flex max-w-[1100px] flex-col items-center pt-10 text-center">
          <motion.div
            {...enter(0.1)}
            role="group"
            aria-label={t("trustedAria")}
            className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.06] py-1.5 pl-1.5 pr-4 backdrop-blur-md"
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
                  className="relative size-7 rounded-full object-cover ring-2 ring-[#0b0706]"
                  style={{ zIndex: TRUSTED_FACES.length - index }}
                />
              ))}
            </span>
            <span className="text-[13px] font-medium tracking-[-0.01em] text-white/80 sm:text-[14px]">
              {t("trustedPrefix")} 35+ {t("trustedSuffix")}
            </span>
          </motion.div>

          <h1 className="mt-6 text-[44px] font-medium leading-[1.02] tracking-[-0.05em] sm:text-[64px] lg:text-[84px]">
            {[
              <>
                {t("titleLine1")} <span className="s1-accent-text">DevRel</span>
              </>,
              <>
                {t("titleLine2")}{" "}
                <span className="s1-accent-text">DevTools</span>
              </>,
            ].map((line, index) => (
              <span key={index} className="block overflow-hidden pb-[0.08em]">
                <motion.span
                  className="block"
                  initial={reduceMotion ? false : { y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{
                    duration: 1.2,
                    ease: EASE,
                    delay: introDelay + 0.25 + index * 0.12,
                  }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            {...enter(0.55)}
            className="mt-7 max-w-[620px] text-[16px] leading-[1.6] text-white/60 sm:text-[18px]"
          >
            {t("description")}
          </motion.p>

          <motion.div
            {...enter(0.7)}
            className="mt-10 flex flex-col items-center gap-5 sm:flex-row"
          >
            <PillLink
              href="https://cal.com/studio1/collab"
              tone="brand"
              external
            >
              {t("primaryCta")}
            </PillLink>
            <a
              href="/case-studies"
              className="s1-glass-btn-light group inline-flex h-12 items-center gap-2 rounded-full px-6 text-[13px] font-medium uppercase tracking-[0.06em] text-white"
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
          className="mt-20 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
        >
          {TEAMS.map(({ navKey, href, icon: Icon, offerings: ids }, index) => (
            <li key={navKey} className="min-w-0">
              <Link
                href={href}
                className="group relative isolate flex h-full flex-col items-start overflow-hidden rounded-[6px] bg-[#16130f] p-5 ring-1 ring-inset ring-white/[0.05] transition-colors duration-300 hover:bg-[#1d1915] [&>*:not(canvas)]:relative"
              >
                {/* Animated orange dither on the right side, fading into the card */}
                <DitherField
                  seed={index * 1.7}
                  className="absolute inset-y-0 right-0 -z-10 h-full w-[55%] opacity-70 [mask-image:linear-gradient(to_left,black_30%,transparent)] transition-opacity duration-700 group-hover:opacity-100"
                />
                {/* Icon on top, then the heading, then the offerings cycling */}
                <span className="flex w-full items-start justify-between">
                  <span className="relative flex size-11 items-center justify-center overflow-hidden rounded-[6px] bg-[linear-gradient(160deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.04)_60%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_24px_-12px_rgba(249,115,22,0.55)] ring-1 ring-inset ring-white/15 backdrop-blur-md transition-transform duration-500 group-hover:-translate-y-0.5">
                    <Icon weight="regular" className="size-5" />
                  </span>
                  <ArrowUpRight
                    weight="bold"
                    className="size-4 text-white/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
                  />
                </span>
                <span className="mt-6 block text-[16px] font-medium leading-tight tracking-[-0.025em] text-white">
                  {nav(`items.${navKey}`)}
                </span>
                <span className="mt-1.5 block w-full [&_.truncate]:text-left">
                  <CyclingLabel
                    items={ids.map((id) => offerings[id]?.label).filter(Boolean)}
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
