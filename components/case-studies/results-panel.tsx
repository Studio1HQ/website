"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
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
      className="relative isolate overflow-hidden rounded-[6px] bg-[linear-gradient(155deg,#fb923c_0%,#f97316_45%,#ea580c_100%)] p-6 text-white shadow-[0_34px_60px_-30px_rgba(234,88,12,0.6),inset_0_1px_0_rgba(255,255,255,0.35)]"
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
      {logo ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-6 -right-6 -z-10 size-24 rotate-[-12deg] overflow-hidden rounded-[6px]"
        >
          <Image
            src={logo}
            alt=""
            fill
            sizes="128px"
            className="object-cover"
          />
        </span>
      ) : null}

      <motion.p
        className="flex items-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.16em] text-white/80"
        {...rise(0.3)}
      >
        <span className="relative flex size-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/70 motion-reduce:hidden" />
          <span className="relative size-1.5 rounded-full bg-white" />
        </span>
        The results
      </motion.p>

      <motion.div className="mt-5" {...rise(0.4)}>
        <p className="text-[56px] font-medium leading-[0.9] tracking-[-0.06em] md:text-[64px]">
          <CountUp value={lead.value} />
        </p>
        <p className="mt-3 max-w-[240px] text-[14px] leading-snug text-white/90">
          {lead.label}
        </p>
      </motion.div>

      {rest.length ? (
        <motion.dl
          className="mt-6 grid grid-cols-2 gap-4 border-t border-white/25 pt-5 pr-14"
          {...rise(0.55)}
        >
          {rest.map((metric) => (
            <div key={metric.label} className="min-w-0">
              <dd className="text-[26px] font-medium leading-none tracking-[-0.05em]">
                <CountUp value={metric.value} />
              </dd>
              <dt className="mt-2 text-[12px] leading-snug text-white/80">
                {metric.label}
              </dt>
            </div>
          ))}
        </motion.dl>
      ) : null}
    </motion.aside>
  );
}
