"use client";

import { useTranslations } from "next-intl";
import { StoryHero } from "@/components/pages/shared/service-story";

export default function Hero() {
  const t = useTranslations("ServiceHero.docs");

  return (
    <StoryHero
      eyebrow={t("badge")}
      pill="Docs audits · DX reviews · Quickstarts · First success"
      titleAccent={t("titleAccent")}
      titleRest={t("titleRest")}
      description={t("description")}
      primaryCta={t("primaryCta")}
      secondaryCta={t("secondaryCta")}
      stats={[
        { value: "15+", label: t("stats.audits") },
        { value: "4+", label: t("stats.pages") },
      ]}
      highlights={["Documentation audits, DX reviews", "first success"]}
      photo={{
        src: "/case-studies/jozu/kubecon-india-2025.webp",
        alt: "A live product demo on a laptop at KubeCon India",
        position: "center 60%",
      }}
    />
  );
}
