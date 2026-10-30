"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Code,
  RocketLaunch,
  Wrench,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/home/ui";
import {
  Accent,
  IndexBar,
  MUTED,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";
import { PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/*
 * The night band between the products and what comes next: why a content
 * and DevRel studio ships its own software, and a way into the services
 * that came out of it.
 */

const POINTS = [
  { key: "friction", icon: Wrench },
  { key: "launches", icon: RocketLaunch },
  { key: "builders", icon: Code },
] as const;

const SERVICES = [
  { navKey: "technicalContent", href: "/technical-content-marketing" },
  { navKey: "video", href: "/developer-video-production" },
  { navKey: "docs", href: "/developer-documentation-dx-audit" },
  { navKey: "devrel", href: "/developer-relations-growth-campaigns" },
  { navKey: "githubGrowth", href: "/github-growth-agency" },
] as const;

export default function WhyWeBuild({ index }: { index: number }) {
  const t = useTranslations("ProductPage.why");
  const nav = useTranslations("Nav.items");

  return (
    <PaperSection tone="night" className="md:py-24">
      <Container>
        <IndexBar index={index} name={t("indexName")} aside={t("aside")} />
        <SectionHead
          title={t.rich("title", {
            accent: (chunks) => <Accent>{chunks}</Accent>,
          })}
          description={t("description")}
        />

        <div className="mt-12 grid gap-2 md:grid-cols-3">
          {POINTS.map((point, position) => {
            const PointIcon = point.icon;
            return (
              <article
                key={point.key}
                className="group relative flex flex-col overflow-hidden rounded-[6px] bg-[var(--p-card)] p-6 ring-1 ring-inset ring-white/[0.08] md:p-7"
              >
                {/* Warm light that gathers in the corner on hover */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: "rgba(249,115,22,0.22)" }}
                />
                <div className="relative flex items-center justify-between">
                  <span
                    className="text-[13px] font-medium tabular-nums"
                    style={{ color: PRINT }}
                  >
                    {String(position + 1).padStart(2, "0")}
                  </span>
                  <span className="flex size-10 items-center justify-center rounded-[8px] bg-white/[0.05] ring-1 ring-inset ring-white/[0.08]">
                    <PointIcon
                      aria-hidden
                      weight="duotone"
                      className="size-5"
                      style={{ color: PRINT }}
                    />
                  </span>
                </div>
                <h3 className="relative mt-10 text-[22px] font-medium leading-[1.2] tracking-[-0.035em] md:mt-14">
                  {t(`points.${point.key}.title`)}
                </h3>
                <p
                  className={cn(
                    "relative mt-3 text-[15px] leading-[1.6]",
                    MUTED,
                  )}
                >
                  {t(`points.${point.key}.body`)}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-[var(--p-line)] pt-8">
          <p className="text-[15px] font-medium">{t("playbook")}</p>
          <ul className="flex flex-wrap gap-2">
            {SERVICES.map((service) => (
              <li key={service.href}>
                <Link
                  href={service.href}
                  className="group inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-medium ring-1 ring-inset ring-white/15 transition-colors hover:bg-[#f4efe7] hover:text-[#141414] hover:ring-transparent"
                >
                  {nav(service.navKey)}
                  <ArrowUpRight
                    aria-hidden
                    weight="bold"
                    className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </PaperSection>
  );
}
