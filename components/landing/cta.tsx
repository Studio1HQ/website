"use client";

import { useRef, type PointerEvent } from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  animate,
  useMotionValue,
  useScroll,
  useTime,
  useTransform,
} from "motion/react";
import { Check } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Container, EASE, PillLink } from "@/components/home/ui";

const BULLET_KEYS = ["savings", "lockIn", "content", "turnaround"] as const;

/** Real Studio1 work, set around a ring that frames the call to action. */
const RING_SHOTS = [
  "/case-studies/jozu/devfest-pune-2025.webp",
  "/case-studies/corsair/slideflow-demo.webp",
  "/case-studies/jozu/kubecon-jozu-booth.webp",
  "/case-studies/tensorlake/Toon-blog.webp",
  "/case-studies/brightdata/brightdata-homepage.webp",
  "/case-studies/nebius/workshop-dublin-poster.webp",
  "/case-studies/corsair/corsair-homepage.webp",
  "/case-studies/tensorlake/tensorlake-home.webp",
  "/case-studies/nebius/token-factory.webp",
  "/case-studies/jozu/jozu-platform-overview.webp",
  "/case-studies/entelligence-ai/entelligence-homepage.webp",
  "/case-studies/tensorlake/Claude-Cowork-dev.webp",
  "/case-studies/nebius/workshop-dublin-recap.webp",
  "/case-studies/brightdata/docs-deep-research-architecture.webp",
];

/**
 * Full ring at the original card spacing (~19deg apart), so the arc looks as
 * before but continues all the way round and can loop forever.
 */
const RING_COUNT = 19;
const RING = Array.from(
  { length: RING_COUNT },
  (_, index) => RING_SHOTS[index % RING_SHOTS.length],
);

export default function CTA() {
  const t = useTranslations("CTA");
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  // The ring turns gently while the section scrolls past.
  const scrollRotate = useTransform(scrollYProgress, [0, 1], [8, -8]);

  // Drag (mouse or finger, horizontally) to spin the ring; it glides to a
  // stop with momentum. Vertical swipes still scroll the page.
  const dragRotate = useMotionValue(0);
  // Continuous loop: the ring slowly circles on its own (paused for
  // reduced-motion users), on top of scroll and drag.
  const time = useTime();
  const autoRotate = useTransform(time, (ms) => (reduceMotion ? 0 : ms * -0.004));
  const rotate = useTransform(
    [scrollRotate, dragRotate, autoRotate],
    ([s, d, a]: number[]) => s + d + a,
  );
  const drag = useRef<{ x: number; t: number; v: number } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("a, button")) return;
    dragRotate.stop();
    drag.current = { x: event.clientX, t: performance.now(), v: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state) return;
    const now = performance.now();
    const dx = event.clientX - state.x;
    const deg = dx * 0.12;
    dragRotate.set(dragRotate.get() + deg);
    state.v = deg / Math.max(1, now - state.t); // deg per ms
    state.x = event.clientX;
    state.t = now;
  };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!state || reduceMotion) return;
    animate(dragRotate, dragRotate.get() + state.v * 420, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    });
  };

  const step = 360 / RING_COUNT;

  return (
    <section
      ref={sectionRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative cursor-grab touch-pan-y select-none overflow-hidden text-[var(--home-ink)] active:cursor-grabbing [--ring-r:430px] [--card-w:150px] sm:[--ring-r:560px] sm:[--card-w:200px] lg:[--ring-r:720px] lg:[--card-w:250px]"
      style={{
        background:
          "linear-gradient(180deg, var(--home-cream) 0%, var(--home-peach) 22%, var(--home-cream) 62%)",
      }}
    >
      {/* Ring of project shots, centred on the headline block */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[calc(var(--ring-r)+80px)]"
        style={{ width: 0, height: 0, rotate: reduceMotion ? 0 : rotate }}
      >
        {RING.map((src, index) => {
          const angle = index * step;
          return (
            <div
              key={index}
              className="absolute left-0 top-0"
              style={{
                transform: `rotate(${angle}deg) translateY(calc(var(--ring-r) * -1))`,
                transformOrigin: "0 0",
              }}
            >
              <motion.div
                className="relative aspect-[16/10] w-[var(--card-w)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-[0_30px_60px_-24px_rgba(60,20,0,0.45)] ring-1 ring-black/5 dark:ring-white/10"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.9,
                  ease: EASE,
                  delay: 0.03 * Math.min(index, RING_COUNT - index),
                }}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="250px"
                  className="object-cover"
                />
              </motion.div>
            </div>
          );
        })}
      </motion.div>

      <Container className="relative flex min-h-[760px] flex-col items-center justify-center pb-40 pt-56 text-center sm:min-h-[860px] lg:min-h-[960px] lg:pt-64">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: EASE }}
          className="flex max-w-[640px] flex-col items-center"
        >
          <h2 className="text-[36px] font-medium leading-[1.04] tracking-[-0.05em] sm:text-[52px] lg:text-[64px]">
            {t("titleLine1")}
            <br />
            <span className="font-editorial text-primary">
              {t("titleLine2")}
            </span>
          </h2>
          <p className="mt-6 max-w-[480px] text-[16px] leading-[1.6] text-[var(--home-ink-soft)] sm:text-[17px]">
            {t("descriptionLine1")} {t("descriptionLine2")}
          </p>
          <PillLink
            href="https://cal.com/studio1/collab"
            tone="brand"
            external
            className="mt-10"
          >
            {t("button")}
          </PillLink>

          <ul
            role="list"
            className="mt-9 flex flex-col items-center gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6"
          >
            {BULLET_KEYS.map((key) => (
              <li
                key={key}
                className="flex items-center gap-2 text-[13px] text-[var(--home-ink-soft)] sm:text-[14px]"
              >
                <Check
                  weight="bold"
                  className="size-3.5 shrink-0 text-primary"
                />
                {t(`bullets.${key}`)}
              </li>
            ))}
          </ul>
        </motion.div>
      </Container>
    </section>
  );
}
