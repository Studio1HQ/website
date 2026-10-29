"use client";

import { useTranslations } from "next-intl";
import { StoryHero } from "@/components/pages/shared/service-story";
import { CONTENT_SIDES } from "@/components/pages/shared/hero-sides";

export default function Hero() {
  const t = useTranslations("ServiceHero.technicalContent");

  return (
    <StoryHero
      eyebrow={t("badge")}
      pill="Tutorials · Guides · SEO content"
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
      highlights={[
        "technical content marketing agency for developer tools",
        "engineer-written",
      ]}
      sides={CONTENT_SIDES}
    />
  );
}
