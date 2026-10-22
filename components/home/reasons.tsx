"use client";

import { homeFeatures } from "@/data/home";
import { useCursorGlow } from "@/components/ui/cursor-glow-card";
import { NumericText } from "@/components/ui/num";
import { cn } from "@/lib/utils";
import type { Feature } from "@/types";
import { FeatureIllustration } from "./feature-illustration";
import { Container, Eyebrow, GlassIcon, Rise } from "./ui";

/** Card surface colour; edge fades reuse it so artwork melts into the card. */
const CARD_BG = "#100c0b";


function ReasonCard({ feature, index }: { feature: Feature; index: number }) {
  const { ref, onPointerMove } = useCursorGlow<HTMLElement>();

  return (
    <article
      ref={ref}
      onPointerMove={onPointerMove}
      className="group relative isolate flex h-full min-h-[24rem] flex-col overflow-hidden rounded-[20px] p-7 ring-1 ring-inset ring-white/[0.08] transition-[box-shadow,transform] duration-500 ease-s1 hover:-translate-y-1 hover:ring-[#fb923c]/30 sm:min-h-[26rem] md:p-8"
      style={{ backgroundColor: CARD_BG }}
    >
      {/* Cursor-following brand light */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(440px circle at var(--mx,50%) var(--my,0%), rgba(249,115,22,0.16), transparent 60%)",
        }}
      />

      <FeatureIllustration title={feature.title} forceDark />

      {/* Soft edges so artwork running off the card fades out instead of clipping */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-20"
        style={{ background: `linear-gradient(to top, ${CARD_BG}, transparent)` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-10"
        style={{ background: `linear-gradient(to right, ${CARD_BG}, transparent)` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10"
        style={{ background: `linear-gradient(to left, ${CARD_BG}, transparent)` }}
      />

      <div className="relative z-[2] flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-4">
            <GlassIcon className="transition-transform duration-500 group-hover:-translate-y-0.5">
              <feature.icon />
            </GlassIcon>
            <h3 className="text-[22px] font-medium tracking-[-0.04em] text-white md:text-[24px]">
              {feature.title}
            </h3>
          </div>
          <p className="mt-5 max-w-[460px] text-[14px] leading-[1.65] text-white/55 md:text-[15px]">
            <NumericText>{feature.description}</NumericText>
          </p>
        </div>
        <span
          aria-hidden
          className="hidden shrink-0 pt-3 font-editorial text-[18px] text-white/25 transition-colors duration-300 group-hover:text-[#fdba74] sm:block"
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
    </article>
  );
}

export default function Reasons() {
  return (
    <section
      id="why-us"
      className="dark relative overflow-hidden py-24 text-white md:py-36"
      style={{
        background: "linear-gradient(180deg, #07050a 0%, #0b0706 70%, #12090a 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_70%_45%_at_50%_22%,black,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-16 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.24),transparent_65%)] blur-2xl"
      />

      <Container className="relative">
        <Rise className="mx-auto mb-14 max-w-[820px] text-center md:mb-20">
          <Eyebrow>Features</Eyebrow>
          <h2 className="mt-6 text-[38px] font-medium leading-[1.04] tracking-[-0.05em] sm:text-[56px] lg:text-[68px]">
            Why Tech Companies Choose{" "}
            <span className="font-editorial text-[#fdba74]">Studio1</span>
          </h2>
          <p className="mx-auto mt-6 max-w-[560px] text-[16px] leading-[1.6] text-white/55 sm:text-[17px]">
            High-quality technical tutorials, documentation, and DevRel
            execution that drives developer adoption and trust.
          </p>
        </Rise>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {homeFeatures.map((feature, index) => (
            <Rise
              key={feature.title}
              delay={(index % 3) * 0.08}
              className={cn(
                "h-full",
                (index === 0 || index === 3) && "md:col-span-2",
                index === 6 && "md:col-span-2 lg:col-span-1",
              )}
            >
              <ReasonCard feature={feature} index={index} />
            </Rise>
          ))}
        </div>
      </Container>
    </section>
  );
}
