"use client";

import type { Icon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { SectionIntro } from "@/components/home/ui";
import { staggerChildren, serviceItemVariants } from "@/lib/animations";
import { cn } from "@/lib/utils";

export type ServiceOfferCard = {
  icon: Icon;
  badges: string[];
  accent: string;
  rest?: string;
  description: string;
  features: string[];
  id?: string;
  anchorIds?: string[];
};

type ServiceOfferCardsProps = {
  eyebrow?: string;
  titlePrefix?: string;
  titleAccent?: string;
  subtitle: string;
  cards: ServiceOfferCard[];
  id?: string;
};

const cardMotion = [
  { hoverClass: "hover:-translate-y-4", offsetClass: "" },
  { hoverClass: "hover:translate-y-4", offsetClass: "md:translate-y-16" },
  { hoverClass: "hover:-translate-y-4", offsetClass: "" },
] as const;

export function ServiceOfferCards({
  eyebrow,
  titlePrefix = "What We",
  titleAccent = "Offer",
  subtitle,
  cards,
  id = "work",
}: ServiceOfferCardsProps) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={staggerChildren}
      id={id}
      className="relative mb-28 px-4 pb-20 pt-24 md:pt-32"
    >
      <motion.div variants={serviceItemVariants}>
        <SectionIntro eyebrow={eyebrow} title={titlePrefix} accent={titleAccent} description={subtitle} />
      </motion.div>

      <div className="mx-auto flex max-w-7xl flex-col">
        <motion.div
          variants={serviceItemVariants}
          className="relative mt-20 flex w-full flex-col items-center justify-center md:flex-row md:items-start md:gap-5 md:pb-20"
        >
          {cards.map((card, index) => {
            const IconComponent = card.icon;
            const motionClasses = cardMotion[index % cardMotion.length];

            return (
              <div
                key={card.accent}
                id={card.id}
                className={cn(
                  "s1-glass-card s1-glass-raised group relative mb-8 flex min-h-[30rem] w-full max-w-[23rem] flex-col items-start justify-start rounded-[24px] p-8 transition-transform duration-700 md:mb-0",
                  "motion-reduce:transition-none",
                  motionClasses.hoverClass,
                  motionClasses.offsetClass,
                )}
              >
                {card.anchorIds?.map((anchorId) => (
                  <span key={anchorId} id={anchorId} className="absolute -top-24" />
                ))}

                <div className="relative z-10 flex w-full flex-1 flex-col">
                  <span className="s1-glass-dark flex size-14 items-center justify-center rounded-2xl text-white">
                    <IconComponent className="size-7" weight="duotone" />
                  </span>

                  <div className="mt-auto flex flex-col gap-2 pt-8">
                    <div className="flex flex-wrap gap-1.5">
                      {card.badges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full border border-[var(--home-line)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--home-ink-soft)]"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[32px] font-medium leading-[1.08] tracking-[-0.04em] text-[var(--home-ink)]">
                      <span className="s1-accent-text">{card.accent}</span>
                      {card.rest ? (
                        <>
                          <br />
                          {card.rest}
                        </>
                      ) : null}
                    </p>
                    <p className="mt-2 text-[14px] leading-[1.6] text-[var(--home-ink-soft)]">{card.description}</p>

                    <ul className="mt-5 space-y-2 border-t border-[var(--home-line)] pt-4">
                      {card.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5 text-[14px] text-[var(--home-ink)]">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </motion.section>
  );
}
