"use client";

import Image, { type StaticImageData } from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { GRAIN } from "@/lib/paper";

const EASE = [0.16, 1, 0.3, 1] as const;

const RIM =
  "relative flex size-[92px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_32%_24%,#ffffff_0%,#ffffff_40%,#f5f2ed_72%,#e6e0d6_100%)] p-[8px] shadow-[0_24px_40px_-18px_rgba(0,0,0,0.7),inset_0_1px_0_#fff] md:size-[108px]";

/**
 * The hero artwork, drawn rather than photographed: Studio1 and the client
 * glide together over an ink sheet.
 */
export function CaseVisual({
  client,
  industry,
  logo,
  services,
}: {
  client: string;
  industry?: string;
  logo?: StaticImageData;
  services: string[];
}) {
  const reduceMotion = useReducedMotion();
  const enter = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: EASE, delay },
  });

  return (
    <div className="relative isolate flex h-full min-h-[340px] flex-col justify-between overflow-hidden rounded-[6px] bg-[#141414] p-6 text-white xl:min-h-[560px]">
      {/* Ink sheet: grain and a fine dot grid */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 opacity-40 mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />

      <motion.div {...enter(0.1)}>
        <p className="text-[11.5px] font-medium uppercase tracking-[0.16em] text-white/55">
          Case study
        </p>
        <p className="mt-2 text-[26px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[30px]">
          Studio1 <span className="text-[#fb923c]">×</span> {client}
        </p>
      </motion.div>

      {/* The pairing: Studio1 and the client glide together */}
      <div className="relative my-8 flex items-center justify-center">
        <motion.span
          className={`${RIM} z-[1]`}
          initial={reduceMotion ? false : { x: -70, opacity: 0, rotate: -12 }}
          animate={{ x: 14, opacity: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 90,
            damping: 16,
            delay: 0.3,
          }}
        >
          <span className="flex size-full items-center justify-center rounded-full bg-white">
            <Image
              src="/assets/studio1-logo.svg"
              alt=""
              width={44}
              height={44}
              unoptimized
              className="size-[40px] md:size-[46px]"
            />
          </span>
        </motion.span>
        <motion.span
          className={`${RIM} z-[2]`}
          initial={reduceMotion ? false : { x: 70, opacity: 0, rotate: 12 }}
          animate={{ x: -14, opacity: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 90,
            damping: 16,
            delay: 0.3,
          }}
        >
          <span className="relative block size-full overflow-hidden rounded-full bg-white">
            {logo ? (
              <Image
                src={logo}
                alt={`${client} logo`}
                fill
                sizes="92px"
                className="object-cover"
              />
            ) : null}
          </span>
        </motion.span>
      </div>

      <motion.div {...enter(0.55)}>
        {industry ? (
          <p className="text-[13px] text-white/60">{industry}</p>
        ) : null}
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {services.slice(0, 3).map((service) => (
            <li
              key={service}
              className="rounded-[6px] bg-white/[0.08] px-2.5 py-1 text-[12px] font-medium text-white/85 ring-1 ring-inset ring-white/10 backdrop-blur-sm"
            >
              {service}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

/** A hero tile that rises into place, one after another. */
export function Rise({
  index,
  className,
  children,
}: {
  index: number;
  className?: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.08 * index }}
    >
      {children}
    </motion.div>
  );
}

/** A block that rises in as it scrolls into view, after the one before. */
export function Reveal({
  index = 0,
  className,
  children,
}: {
  index?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.1 * index }}
    >
      {children}
    </motion.div>
  );
}
