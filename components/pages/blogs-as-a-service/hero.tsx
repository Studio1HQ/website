"use client";

import { useTranslations } from "next-intl";
import { ServiceNightHero } from "@/components/pages/shared/service-night-hero";

export default function Hero() {
  const t = useTranslations("ServiceHero.technicalContent");

  return (
    <ServiceNightHero
      badge={t("badge")}
      titleAccent={t("titleAccent")}
      titleRest={t("titleRest")}
      description={t("description")}
      primaryCta={t("primaryCta")}
      secondaryCta={t("secondaryCta")}
      stats={[
        { value: "300+", label: t("stats.views") },
        { value: "25+", label: t("stats.teams") },
        { value: "<7 days", label: t("stats.reddit") },
      ]}
    />
  );
}
