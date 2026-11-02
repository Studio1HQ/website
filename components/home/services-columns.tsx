"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenText,
  Lightbulb,
  Megaphone,
  PenNib,
  RocketLaunch,
  TrendUp,
  UsersThree,
  VideoCamera,
  type Icon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Container, Rise } from "./ui";
import { Component, useRef, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useInView, useReducedMotion } from "motion/react";
import GlassLogo from "./glass-logo";
import AsciiHands from "./ascii-hands";

const GlassLogo3D = dynamic(() => import("./glass-logo-3d"), { ssr: false });

/** Falls back to the 2D glass logo if WebGL is unavailable on the device. */
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

type OfferingCopy = { label: string; description: string };

/** One line icon per offering, in the same order as HomeDomains.offerings. */
const OFFERING_ICONS: Icon[] = [
  PenNib,
  Megaphone,
  VideoCamera,
  Lightbulb,
  BookOpenText,
  TrendUp,
  RocketLaunch,
  UsersThree,
];

const OFFERING_LINKS = [
  "/technical-content-marketing#technical-content-writing",
  "/developer-relations-growth-campaigns#developer-advocacy",
  "/developer-video-production#tech-video-production",
  "/developer-video-production#content-creation",
  "/developer-documentation-dx-audit#documentation-dx-audits",
  "/developer-relations-growth-campaigns#organic-growth-campaign",
  "/developer-relations-growth-campaigns#product-launch-support",
  "/developer-relations-growth-campaigns#influencer-management",
];

/** Offerings split into the two disciplines the services pages cover. */
const GROUPS = [
  {
    key: "content",
    href: "/technical-content-marketing",
    icon: PenNib,
    items: [0, 2, 3, 4],
  },
  {
    key: "growth",
    href: "/developer-relations-growth-campaigns",
    icon: Megaphone,
    items: [1, 5, 6, 7],
  },
] as const;

export default function ServicesColumns() {
  const t = useTranslations("HomeDomains");
  const nav = useTranslations("Nav");
  const footer = useTranslations("Footer");
  const offerings = t.raw("offerings") as OfferingCopy[];
  const reduceMotion = useReducedMotion();
  // Load the 3D logo shortly before it scrolls in; render only while visible.
  const logoRef = useRef<HTMLDivElement>(null);
  const logoNear = useInView(logoRef, { once: true, margin: "600px 0px" });
  const logoVisible = useInView(logoRef);
  const groupTitle = {
    content: nav("items.content"),
    growth: footer("links.growth"),
  };

  return (
    <section
      id="service-offerings"
      className="bg-[var(--home-cream)] py-24 text-[var(--home-ink)] md:py-36"
    >
      <Container>
        <Rise className="mx-auto max-w-[980px] text-center">
          <div
            ref={logoRef}
            aria-hidden
            className="relative mx-auto mb-8 size-[200px] sm:size-[240px]"
          >
            <AsciiHands />
            {logoNear ? (
              <SceneBoundary fallback={<GlassLogo />}>
                <GlassLogo3D running={logoVisible} reduceMotion={!!reduceMotion} />
              </SceneBoundary>
            ) : null}
          </div>
          <h2 className="text-[42px] font-medium leading-[1.02] tracking-[-0.05em] sm:text-[60px] lg:text-[80px]">
            {t("titlePrefix")}{" "}
            <span className="font-editorial text-primary">
              {t("titleHighlight")}
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-[520px] text-[17px] leading-[1.6] text-[var(--home-ink-soft)]">
            {t("description")}
          </p>
        </Rise>

        <div className="mt-20 grid gap-16 md:mt-28 md:grid-cols-2 md:gap-14 lg:gap-24">
          {GROUPS.map(({ key, href, icon: Icon, items }, groupIndex) => (
            <Rise key={key} delay={groupIndex * 0.1}>
              <div className="flex items-center justify-between border-b border-[var(--home-line)] pb-8">
                <h3 className="font-editorial text-[40px] leading-[1.05] sm:text-[56px] md:text-[60px] lg:text-[68px]">
                  {groupTitle[key]}
                </h3>
                <Link
                  href={href}
                  aria-label={groupTitle[key]}
                  className="group flex items-center"
                >
                  <span className="flex size-14 items-center justify-center rounded-full border border-[var(--home-line)] transition-colors duration-300 group-hover:border-primary">
                    <ArrowUpRight
                      weight="bold"
                      className="size-5 transition-transform duration-300 group-hover:rotate-45"
                    />
                  </span>
                  <span className="-ml-2 flex size-14 items-center justify-center rounded-full bg-gradient-to-b from-primarySurface to-primary text-white shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.9)]">
                    <Icon weight="duotone" className="size-6" />
                  </span>
                </Link>
              </div>

              <ul role="list">
                {items.map((id) => {
                  const OfferingIcon = OFFERING_ICONS[id];
                  return (
                    <li key={id} className="border-b border-[var(--home-line)]">
                      <Link
                        href={OFFERING_LINKS[id]}
                        className="group grid grid-cols-[minmax(0,1fr)_20px] items-start gap-x-6 py-6"
                      >
                        <span className="flex items-center gap-4">
                          <span
                            aria-hidden
                            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--home-line)] bg-[var(--home-paper)] text-[var(--home-ink)] shadow-[0_6px_16px_-10px_rgba(60,20,0,0.35)] transition-[background-color,border-color,color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:bg-primary group-hover:text-white"
                          >
                            <OfferingIcon
                              weight="duotone"
                              className="size-[22px]"
                            />
                          </span>
                          <span className="text-[19px] font-medium tracking-[-0.03em] transition-colors duration-300 group-hover:text-primary md:text-[21px]">
                            {offerings[id].label}
                          </span>
                        </span>
                        <ArrowUpRight
                          weight="bold"
                          className="mt-1.5 size-4 text-[var(--home-ink-soft)] opacity-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100 max-lg:opacity-60"
                        />
                        <span className="col-span-2 grid grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-s1 lg:grid-rows-[0fr] lg:group-hover:grid-rows-[1fr] lg:group-focus-visible:grid-rows-[1fr]">
                          <span className="overflow-hidden">
                            <span className="block max-w-[460px] pl-[60px] pt-2 text-[14px] leading-[1.6] text-[var(--home-ink-soft)]">
                              {offerings[id].description}
                            </span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Rise>
          ))}
        </div>
      </Container>
    </section>
  );
}
