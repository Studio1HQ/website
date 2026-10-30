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
        { value: "10+", label: t("stats.events") },
        { value: "7+", label: t("stats.teams") },
        { value: "35+", label: t("stats.partners") },
        { value: "5+", label: t("stats.launch") },
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
