"use client";

import { useTranslations } from "next-intl";
import {
  BookOpenText,
  CheckCircle,
  Gauge,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { ServiceNightHero } from "@/components/pages/shared/service-night-hero";

export default function Hero() {
  const t = useTranslations("ServiceHero.docs");

  return (
    <ServiceNightHero
      badge={t("badge")}
      titleAccent={t("titleAccent")}
      titleRest={t("titleRest")}
      description={t("description")}
      primaryCta={t("primaryCta")}
      secondaryCta={t("secondaryCta")}
      stats={[
        { value: "15+", label: t("stats.audits") },
        { value: "4+", label: t("stats.pages") },
      ]}
      decor={{
        tiles: [BookOpenText, MagnifyingGlass],
        tabs: [
          { icon: MagnifyingGlass, label: "Docs audits" },
          { icon: Gauge, label: "DX reviews" },
          { icon: BookOpenText, label: "Quickstarts" },
          { icon: CheckCircle, label: "First success" },
        ],
      }}
    />
  );
}
