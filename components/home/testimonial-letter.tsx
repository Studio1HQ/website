"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { homeTestimonials } from "@/data/home";
import { NumericText } from "@/components/ui/num";
import { cn } from "@/lib/utils";
import { Container, EASE, Rise } from "./ui";

const AUTO_ADVANCE_MS = 8000;

export default function TestimonialLetter() {
  const t = useTranslations("Testimonials");
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { margin: "-120px" });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = homeTestimonials.length;
  const current = homeTestimonials[index];

  const go = useCallback(
    (next: number) => setIndex(((next % total) + total) % total),
    [total],
  );

  useEffect(() => {
    if (!inView || paused || reduceMotion) return;
    const id = window.setTimeout(() => go(index + 1), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(id);
  }, [go, inView, index, paused, reduceMotion]);

  const arrow =
    "flex size-14 shrink-0 items-center justify-center rounded-full border border-[var(--home-line)] text-[var(--home-ink)] transition-colors duration-300 hover:border-primary hover:bg-primary hover:text-white";

  return (
    <section
      id="testimonials"
      className="relative overflow-hidden pb-32 pt-10 md:pb-40"
      style={{
        background:
          "linear-gradient(180deg, #12090a 0%, #3b1408 35%, #9a3412 75%, #c2410c 100%)",
      }}
    >
      <Container>
        <Rise className="relative mx-auto max-w-[1180px]">
          {/* Stacked letters behind the card */}
          <div
            aria-hidden
            className="absolute inset-y-6 -right-3 left-6 rotate-[2.2deg] rounded-[6px] bg-[var(--home-sheet-2)] md:-right-6"
          />
          <div
            aria-hidden
            className="absolute inset-y-3 -right-1 left-3 rotate-[1deg] rounded-[6px] bg-[var(--home-sheet-1)] md:-right-3"
          />

          <div
            ref={cardRef}
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
            className="relative rounded-[6px] bg-[var(--home-paper)] px-6 py-16 text-center text-[var(--home-ink)] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-[var(--home-line)] sm:px-12 md:px-20 md:py-24"
            aria-roledescription="carousel"
          >
            <h2 className="font-editorial text-[52px] leading-[0.95] md:text-[88px]">
              {t("title")}
            </h2>
            <p className="mx-auto mt-5 max-w-[460px] text-[16px] text-[var(--home-ink-soft)]">
              {t("description")}
            </p>

            <div className="mt-14 flex items-center gap-4 md:gap-10">
              <button
                type="button"
                aria-label="Previous testimonial"
                onClick={() => go(index - 1)}
                className={cn(arrow, "hidden sm:flex")}
              >
                <CaretLeft weight="bold" className="size-5" />
              </button>

              <div className="min-h-[300px] flex-1 md:min-h-[260px]">
                <AnimatePresence mode="wait">
                  <motion.figure
                    key={current.name}
                    initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    aria-live="polite"
                  >
                    <blockquote className="whitespace-pre-line text-[19px] leading-[1.5] tracking-[-0.03em] md:text-[24px]">
                      &ldquo;<NumericText>{current.content.trim()}</NumericText>
                      &rdquo;
                    </blockquote>
                    <figcaption className="mt-8 flex items-center justify-center gap-3 text-left">
                      <Image
                        src={current.avatar}
                        alt={`${current.name} portrait`}
                        width={112}
                        height={112}
                        sizes="52px"
                        className="size-[52px] rounded-full object-cover"
                      />
                      <span>
                        <cite className="block text-[16px] font-medium not-italic">
                          {current.name}
                        </cite>
                        <span className="block text-[14px] text-[var(--home-ink-soft)]">
                          {current.role}
                        </span>
                      </span>
                    </figcaption>
                  </motion.figure>
                </AnimatePresence>
              </div>

              <button
                type="button"
                aria-label="Next testimonial"
                onClick={() => go(index + 1)}
                className={cn(arrow, "hidden sm:flex")}
              >
                <CaretRight weight="bold" className="size-5" />
              </button>
            </div>

            {/* Phone controls: arrows sit under the quote */}
            <div className="mt-8 flex justify-center gap-3 sm:hidden">
              <button
                type="button"
                aria-label="Previous testimonial"
                onClick={() => go(index - 1)}
                className={arrow}
              >
                <CaretLeft weight="bold" className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Next testimonial"
                onClick={() => go(index + 1)}
                className={arrow}
              >
                <CaretRight weight="bold" className="size-5" />
              </button>
            </div>

            <div className="mx-auto mt-10 max-w-[900px] border-t border-[var(--home-line)] pt-10 sm:mt-14">
              <div className="-mx-6 flex snap-x items-center gap-2.5 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
                {homeTestimonials.map((person, personIndex) => (
                  <button
                    key={person.name}
                    type="button"
                    aria-label={`Show testimonial from ${person.name}`}
                    aria-current={personIndex === index ? "true" : undefined}
                    onClick={() => go(personIndex)}
                    className="relative size-10 shrink-0 snap-center rounded-full"
                  >
                    <Image
                      src={person.avatar}
                      alt=""
                      fill
                      sizes="40px"
                      className={cn(
                        "rounded-full object-cover transition-all duration-300",
                        personIndex === index
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-[var(--home-paper)]"
                          : "opacity-40 grayscale hover:opacity-100 hover:grayscale-0",
                      )}
                    />
                  </button>
                ))}
              </div>
              <p className="mt-6 font-editorial text-[18px] text-[var(--home-ink-soft)]">
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(total).padStart(2, "0")}
              </p>
            </div>
          </div>
        </Rise>
      </Container>
    </section>
  );
}
