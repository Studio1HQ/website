"use client";

import { useTranslations } from "next-intl";
import { ServiceNightHero } from "@/components/pages/shared/service-night-hero";

export default function Hero() {
  const t = useTranslations("ServiceHero.devrel");

  return (
    <ServiceNightHero
      badge={t("badge")}
      titleAccent={t("titleAccent")}
      titleRest={t("titleRest")}
      description={t("description")}
      primaryCta={t("primaryCta")}
      secondaryCta={t("secondaryCta")}
      stats={[
        { value: "10+", label: t("stats.events") },
        { value: "7+", label: t("stats.teams") },
        { value: "35+", label: t("stats.partners") },
        { value: "5+", label: t("stats.launch") },
      ]}
    />
  );
}
