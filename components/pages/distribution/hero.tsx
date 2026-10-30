"use client";

import { StoryHero } from "@/components/pages/shared/service-story";
import { DISTRIBUTION_SIDES } from "@/components/pages/shared/hero-sides";

export default function Hero() {
  return (
    <StoryHero
      eyebrow="Services"
      pill="Reddit · X · daily.dev · Dev.to · YouTube"
      titleAccent="Developer Content"
      titleRest="Distribution"
      description="Developer content distribution: we rebuild each piece for Reddit, X, LinkedIn, daily.dev, Dev.to, and YouTube."
      primaryCta="Book a Call"
      secondaryCta="Explore Services"
      stats={[
        { value: "304K+", label: "Reddit impressions for Entelligence" },
        { value: "100K+", label: "OpenLore impressions in one month" },
        { value: "50K", label: "on one daily.dev post" },
        { value: "40+", label: "videos and shorts for Nebius" },
      ]}
      highlights={["Developer content distribution", "rebuild each piece"]}
      sides={DISTRIBUTION_SIDES}
    />
  );
}
