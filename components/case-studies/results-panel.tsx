"use client";

import type { StaticImageData } from "next/image";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { Star } from "@phosphor-icons/react";
import { GRAIN } from "@/lib/paper";

type Metric = { value: string; label: string };

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * A value that counts up from zero the first time it is seen. Only the
 * leading number moves ("12,000+", "50K+"); anything that is not a number
 * is shown as written.
 */
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduceMotion = useReducedMotion();
  const match = value.match(/^([^0-9]*)([\d,]*\.?\d+)(.*)$/);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (!match || !inView || reduceMotion) return;
    const [, before, digits, after] = match;
    const target = Number(digits.replace(/,/g, ""));
    const decimals = digits.includes(".") ? digits.split(".")[1].length : 0;
    const grouped = digits.includes(",");
    const controls = animate(0, target, {
      duration: 1.6,
      ease: EASE,
      onUpdate: (n) => {
        const text = grouped
          ? Math.round(n).toLocaleString("en-US")
          : n.toFixed(decimals);
        setShown(`${before}${text}${after}`);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduceMotion, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown}
    </span>
  );
}

/**
 * The headline results, set beside the case study title: an orange print
 * panel with the lead number counting up, the rest beneath, and the
 * client's own mark tilted into the corner.
 */
export function ResultsPanel({
  client,
  metrics,
  logo,
}: {
  client: string;
  metrics: Metric[];
  logo?: StaticImageData;
}) {
  const reduceMotion = useReducedMotion();
  const [lead, ...rest] = metrics.slice(0, 3);
  if (!lead) return null;

  const rise = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: EASE, delay },
  });

  return (
    <motion.aside
      aria-label={`Results with ${client}`}
      className="relative isolate flex h-full flex-col overflow-hidden rounded-[6px] bg-[linear-gradient(155deg,#fb923c_0%,#f97316_45%,#ea580c_100%)] p-6 text-white shadow-[0_34px_60px_-30px_rgba(234,88,12,0.6),inset_0_1px_0_rgba(255,255,255,0.35)]"
      initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
    >
      {/* Print grain and a soft light across the top */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -left-1/4 -top-1/3 -z-10 h-2/3 w-[90%] rounded-full bg-white/25 blur-3xl"
      />

      <motion.p
        className="text-[11.5px] font-medium uppercase tracking-[0.16em] text-white/80"
        {...rise(0.3)}
      >
        The results
      </motion.p>

      <motion.div className="mb-6 mt-5" {...rise(0.4)}>
        <p className="text-[56px] font-medium leading-[0.9] tracking-[-0.06em] md:text-[64px]">
          <CountUp value={lead.value} />
        </p>
        <p className="mt-3 flex max-w-[260px] items-start gap-2 text-[14px] leading-snug text-white/90">
          {/star/i.test(lead.label) ? (
            <Star weight="bold" className="mt-px size-4 shrink-0" />
          ) : null}
          {lead.label}
        </p>
      </motion.div>

      {rest.length ? (
        <motion.dl className="mt-auto grid grid-cols-2 gap-2" {...rise(0.55)}>
          {rest.map((metric) => (
            <div
              key={metric.label}
              className="flex min-w-0 flex-col-reverse justify-end rounded-[6px] bg-white/10 p-3.5 shadow-[inset_0_2px_6px_rgba(124,45,18,0.35),inset_0_1px_2px_rgba(124,45,18,0.25),inset_0_-1px_0_rgba(255,255,255,0.3)] ring-1 ring-inset ring-white/20 backdrop-blur-md"
            >
              <dt className="mt-2 text-[12px] leading-snug text-white/80">
                {metric.label}
              </dt>
              <dd className="text-[28px] font-medium leading-none tracking-[-0.05em]">
                <CountUp value={metric.value} />
              </dd>
            </div>
          ))}
        </motion.dl>
      ) : null}
    </motion.aside>
  );
}
