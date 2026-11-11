"use client";

import type { Icon } from "@phosphor-icons/react";
import { Container, Rise } from "@/components/home/ui";
import { MUTED, PaperSection } from "@/components/paper/paper-sections";
import {
  PaperChip,
  PaperPoints,
  ServiceHead,
} from "@/components/pages/shared/paper-service-kit";
import { INK, PRINT } from "@/lib/paper";
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
  /** Position in the page's printed section index. */
  index?: number;
};

export function ServiceOfferCards({
  eyebrow,
  titlePrefix = "What We",
  titleAccent = "Offer",
  subtitle,
  cards,
  id = "work",
  index = 1,
}: ServiceOfferCardsProps) {
  return (
    <PaperSection id={id} tone="paper" className="scroll-mt-28">
      <Container>
        <ServiceHead
          index={index}
          name={eyebrow ?? "Services"}
          title={titlePrefix}
          accent={titleAccent}
          description={subtitle}
        />

        <ul role="list" className="mt-10 grid gap-2 md:grid-cols-3">
          {cards.map((card, position) => {
            const IconComponent = card.icon;
            return (
              <li key={card.accent} id={card.id} className="relative min-w-0">
                {card.anchorIds?.map((anchorId) => (
                  <span
                    key={anchorId}
                    id={anchorId}
                    className="absolute -top-24"
                  />
                ))}
                <Rise delay={position * 0.08} className="h-full">
                  <article className="group relative isolate flex h-full min-h-[440px] flex-col overflow-hidden rounded-[6px] bg-white/80 p-6 shadow-[inset_0_1px_0_#fff] ring-1 ring-inset ring-[#141414]/[0.08] transition-[background-color,box-shadow,transform] duration-500 hover:-translate-y-1 hover:bg-white hover:shadow-[inset_0_1px_0_#fff,0_24px_40px_-28px_rgba(20,20,20,0.45)] motion-reduce:transform-none md:p-7">
                    {/* Hover: a soft orange wash rises from the bottom edge */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -z-[5] translate-y-8 opacity-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:translate-y-0"
                      style={{
                        background:
                          "radial-gradient(120% 60% at 50% 115%, rgba(249,115,22,0.16) 0%, rgba(249,115,22,0) 70%)",
                      }}
                    />
                    <div className="flex items-start justify-between gap-4">
                      <span
                        className="flex size-12 items-center justify-center text-[#f4efe7]"
                        style={{ background: INK }}
                      >
                        <IconComponent className="size-6" weight="regular" />
                      </span>
                      <span
                        className="text-[13px] font-medium tabular-nums"
                        style={{ color: PRINT }}
                      >
                        {String(position + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="mt-auto flex flex-col pt-10">
                      <div className="flex flex-wrap gap-1.5">
                        {card.badges.map((badge) => (
                          <PaperChip key={badge}>{badge}</PaperChip>
                        ))}
                      </div>
                      <h3 className="mt-4 text-[28px] font-medium leading-[1.08] tracking-[-0.045em] md:text-[30px]">
                        <span style={{ color: PRINT }}>{card.accent}</span>
                        {card.rest ? (
                          <>
                            <br />
                            {card.rest}
                          </>
                        ) : null}
                      </h3>
                      <p
                        className={cn(
                          "mt-3 text-[14.5px] leading-[1.6]",
                          MUTED,
                        )}
                      >
                        {card.description}
                      </p>
                      <PaperPoints
                        points={card.features}
                        className="mt-5 border-t border-[#141414]/10 pt-4"
                      />
                    </div>
                  </article>
                </Rise>
              </li>
            );
          })}
        </ul>
      </Container>
    </PaperSection>
  );
}
