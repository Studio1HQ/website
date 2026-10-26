"use client";

import { useTranslations } from "next-intl";
import { StoryHero } from "@/components/pages/shared/service-story";

export default function Hero() {
  const t = useTranslations("ServiceHero.video");

  return (
    <StoryHero
      eyebrow={t("badge")}
      pill="Demos · Tutorials · Edits · Shorts"
      titleAccent={t("titleAccent")}
      titleRest={t("titleRest")}
      description={t("description")}
      primaryCta={t("primaryCta")}
      secondaryCta={t("secondaryCta")}
      highlights={["Technical demos", "upload-ready assets"]}
      photo={{
        src: "/case-studies/jozu/devfest-pune-2025.webp",
        alt: "Studio1 at DevFest Pune 2025",
        position: "center 40%",
      }}
    />
  );
}
