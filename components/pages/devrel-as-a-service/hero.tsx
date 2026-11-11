"use client";

import { useTranslations } from "next-intl";
import { StoryHero } from "@/components/pages/shared/service-story";
import { DEVREL_SIDES } from "@/components/pages/shared/hero-sides";

export default function Hero() {
  const t = useTranslations("ServiceHero.devrel");

  return (
    <StoryHero
      eyebrow={t("badge")}
      pill="Advocacy · Community · Launches · Creators"
      titleAccent={t("titleAccent")}
      titleRest={t("titleRest")}
      description={t("description")}
      primaryCta={t("primaryCta")}
      secondaryCta={t("secondaryCta")}
      stats={[
        { value: "40+", label: t("stats.events") },
        { value: "10+", label: t("stats.teams") },
        { value: "30+", label: t("stats.partners") },
        { value: "3M+", label: t("stats.views") },
      ]}
      highlights={[
        "Developer advocacy",
        "launch campaigns",
        "creator programs",
      ]}
      sides={DEVREL_SIDES}
    />
  );
}
