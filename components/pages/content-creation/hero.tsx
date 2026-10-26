"use client";

import { useTranslations } from "next-intl";
import {
  FilmSlate,
  PlayCircle,
  Scissors,
  VideoCamera,
} from "@phosphor-icons/react";
import { ServiceNightHero } from "@/components/pages/shared/service-night-hero";

export default function Hero() {
  const t = useTranslations("ServiceHero.video");

  return (
    <ServiceNightHero
      badge={t("badge")}
      titleAccent={t("titleAccent")}
      titleRest={t("titleRest")}
      description={t("description")}
      primaryCta={t("primaryCta")}
      secondaryCta={t("secondaryCta")}
      decor={{
        tiles: [PlayCircle, FilmSlate],
        tabs: [
          { icon: PlayCircle, label: "Demos" },
          { icon: VideoCamera, label: "Tutorials" },
          { icon: Scissors, label: "Edits" },
          { icon: FilmSlate, label: "Shorts" },
        ],
      }}
    />
  );
}
