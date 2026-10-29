"use client";

import { useTranslations } from "next-intl";
import { StoryHero } from "@/components/pages/shared/service-story";
import { VIDEO_SIDES } from "@/components/pages/shared/hero-sides";

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
      sides={VIDEO_SIDES}
    />
  );
}
