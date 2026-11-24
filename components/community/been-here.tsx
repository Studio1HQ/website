"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import type { CommunityItem } from "@/lib/community";
import { PRINT } from "@/lib/paper";
import { PaperSection } from "@/components/paper/paper-sections";

/*
 * "Picture a world where you were here": past events as big cards, two to a
 * row. The event's photo, a wash of one of the hero colours rising from the
 * bottom, its name and a line about it, a button, and its date on a tag in
 * the corner.
 */

const TONES = ["#ef5a2c", "#2451d6", "#b8456f", "#14874b"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dated = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

function Wrap({ item, className, children }: { item: CommunityItem; className: string; children: ReactNode }) {
  if (!item.href) return <div className={className}>{children}</div>;
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
  ) : (
    <Link href={item.href} className={className}>{children}</Link>
  );
}

export function BeenHere({ items }: { items: CommunityItem[] }) {
  const reduce = !!useReducedMotion();
  const cards = [...items.filter((e) => e.image && e.summary && e.logo), ...items.filter((e) => e.image && e.summary && !e.logo)].slice(0, 4);
  if (!cards.length) return null;
  return (
    <PaperSection id="past-events" tone="paper" className="relative isolate scroll-mt-24 overflow-hidden">
      <Container>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.1, ease: EASE }}
          className="ml-auto max-w-[640px] text-right"
        >
          <h2 className="text-[34px] font-medium leading-[1.04] tracking-[-0.045em] md:text-[48px]">
            Picture a world where
            <br />
            <span style={{ color: PRINT }}>you were here:</span>
          </h2>
          <p className="mt-4 text-[16px] leading-[1.6] text-[#141414]/60 md:text-[17px]">
            A few of the rooms we&apos;ve filled. The next one could be yours.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-5">
          {cards.map((e, i) => {
            const tone = TONES[i % TONES.length];
            return (
              <motion.div
                key={e.id}
                initial={reduce ? false : { opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 1, ease: EASE, delay: (i % 2) * 0.1 }}
              >
                <Wrap
                  item={e}
                  className="group relative isolate flex min-h-[240px] flex-col justify-end overflow-hidden rounded-[12px] p-6 text-white md:min-h-[250px] md:p-7"
                >
                  {/* the photo, under a wash of the card's colour */}
                  <Image src={e.image as string} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="-z-20 object-cover" />
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-10"
                    style={{ background: `linear-gradient(to top, ${tone} 0%, ${tone}f0 45%, ${tone}b3 75%, ${tone}80 100%)` }}
                  />

                  {/* the event's mark, big, as the card's art */}
                  {e.logo ? (
                    <span
                      aria-hidden
                      className="absolute left-6 top-6 block size-[40px] bg-white md:left-7 md:top-7 md:size-[46px]"
                      style={{ WebkitMask: `url(${e.logo}) left top / contain no-repeat`, mask: `url(${e.logo}) left top / contain no-repeat` }}
                    />
                  ) : null}

                  <h3 className="max-w-[90%] text-[22px] sm:pr-24 font-semibold leading-[1.1] tracking-[-0.03em] md:text-[26px]">{e.name}</h3>
                  <p className="mt-2 line-clamp-2 max-w-[460px] text-[14.5px] sm:line-clamp-1 sm:pr-24 leading-[1.5] text-white/85">{e.summary}</p>
                  <span className="mt-4 inline-flex h-9 w-fit items-center gap-2 rounded-[8px] bg-white px-4 text-[13.5px] font-semibold text-[#141414]">
                    {e.cta === "Recap" ? "See the recap" : e.cta} <ArrowRight weight="bold" className="size-4" />
                  </span>

                  {/* the date, on a tag in the corner */}
                  <span className="absolute bottom-0 right-0 rounded-tl-[10px] bg-[#141414] px-4 py-2 text-[13px] font-semibold text-white">
                    {dated(e.date)}
                  </span>
                </Wrap>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </PaperSection>
  );
}
