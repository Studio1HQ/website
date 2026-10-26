"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Books, PenNib, VideoCamera } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/svgs/logo";
import { Container, Rise } from "./ui";

/** Headline numbers from the proof points in Studio1's own copy. */
const STATS = [
  { value: "35+", label: ["Devtool and", "SaaS teams"] },
  { value: "2M+", label: ["Total content", "views"] },
  { value: "10+", label: ["High-impact", "developer events"] },
  { value: "30+", label: ["Successful", "partnerships"] },
];

function InlineLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-baseline gap-2 underline decoration-white/40 decoration-1 underline-offset-[0.18em] transition-colors hover:decoration-white"
    >
      <span className="inline-flex size-[0.9em] translate-y-[0.1em] items-center justify-center rounded-[0.22em] bg-white/20 ring-1 ring-inset ring-white/30 [&_svg]:size-[0.62em]">
        {icon}
      </span>
      {children}
    </Link>
  );
}

export default function Positioning() {
  const cta = useTranslations("CTA");

  return (
    <section
      className="relative text-white"
      style={{
        background:
          "linear-gradient(180deg, #c2410c 0%, var(--home-ember-soft) 30%, var(--home-peach) 70%, var(--home-cream) 100%)",
      }}
    >
      <Container className="pb-28 pt-10 md:pb-40">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-20">
          <Rise className="flex flex-col gap-5">
            {/* Frosted glass tile: lit top edge, soft inner glow, white mark */}
            <span className="relative flex size-[88px] items-center justify-center overflow-hidden rounded-[6px] bg-[linear-gradient(160deg,rgba(255,255,255,0.38)_0%,rgba(255,255,255,0.12)_55%,rgba(255,255,255,0.06)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-10px_24px_rgba(255,255,255,0.08),0_24px_48px_-20px_rgba(90,25,0,0.55)] ring-1 ring-inset ring-white/40 backdrop-blur-xl">
              <span aria-hidden className="absolute inset-x-3 top-0 h-1/2 rounded-b-[40%] bg-gradient-to-b from-white/30 to-transparent" />
              <Logo className="relative size-12 brightness-0 invert drop-shadow-[0_2px_6px_rgba(90,25,0,0.35)]" />
            </span>
            <p className="text-[14px] font-medium leading-[1.5] text-white/90">
              {cta("bullets.content")}.
              <br />
              {cta("bullets.turnaround")}.
            </p>
          </Rise>

          <Rise delay={0.1}>
            <p className="text-[28px] font-medium leading-[1.22] tracking-[-0.035em] sm:text-[36px] lg:text-[42px]">
              Studio1 is a technical content and developer growth partner for
              SaaS and devtool teams. We produce{" "}
              <InlineLink
                href="/technical-content-marketing"
                icon={<PenNib weight="fill" />}
              >
                tutorials
              </InlineLink>
              ,{" "}
              <InlineLink
                href="/developer-documentation-dx-audit"
                icon={<Books weight="fill" />}
              >
                docs
              </InlineLink>
              ,{" "}
              <InlineLink
                href="/developer-video-production"
                icon={<VideoCamera weight="fill" />}
              >
                videos
              </InlineLink>
              , launches, and developer programs that drive adoption.
            </p>
          </Rise>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-2 md:mt-28">
          {STATS.map((stat, index) => (
            <Rise key={stat.value} delay={(index % 2) * 0.08}>
              <div className="s1-glass-card flex items-center justify-between gap-6 rounded-[6px] px-7 py-8 md:px-10 md:py-10">
                <p className="text-[15px] leading-[1.45] text-[var(--home-ink-soft)] dark:text-white/85">
                  {stat.label[0]}
                  <br />
                  {stat.label[1]}
                </p>
                <p className="font-editorial text-[64px] leading-[0.9] text-[var(--home-ink)] dark:text-white md:text-[84px]">
                  {stat.value}
                </p>
              </div>
            </Rise>
          ))}
        </div>
      </Container>
    </section>
  );
}
