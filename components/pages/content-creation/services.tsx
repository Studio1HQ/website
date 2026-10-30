"use client";

import { Code, Scissors, YoutubeLogo } from "@phosphor-icons/react";
import {
  StoryRows,
  type StoryOffer,
} from "@/components/pages/shared/service-story";

const offerings: StoryOffer[] = [
  {
    id: "tech-video-production",
    icon: YoutubeLogo,
    badges: ["YouTube", "Demos"],
    accent: "Technical",
    rest: "Videos",
    description:
      "Long-form tutorials, product walkthroughs, and technical explainers built around real developer workflows.",
    features: [
      "Developer tutorials",
      "Product demos",
      "Technical explainers",
      "Script, edit, and publishing support",
    ],
  },
  {
    id: "content-creation",
    icon: Scissors,
    badges: ["Shorts", "Social"],
    accent: "Shorts",
    rest: "Cutdowns",
    description:
      "Short-form clips and social-ready assets that keep the core technical point clear.",
    features: [
      "Launch teasers",
      "Feature clips",
      "Captioned social cuts",
      "Supporting post copy",
    ],
  },
  {
    icon: Code,
    badges: ["Repos", "Series"],
    accent: "Demo",
    rest: "Production",
    description:
      "Repo-led videos and campaign assets that give developers something concrete to inspect or try.",
    features: [
      "Demo project builds",
      "GitHub repo packaging",
      "Walkthrough structure",
      "Blog and social asset support",
    ],
  },
];

export default function Services() {
  return (
    <StoryRows
      index={1}
      title={
        <>
          What We <span className="text-[#f97316]">Offer</span>
        </>
      }
      description="Three connected video workstreams for developer brands: teach the workflow, cut it for social, and package demos developers can inspect."
      offers={offerings}
    />
  );
}
