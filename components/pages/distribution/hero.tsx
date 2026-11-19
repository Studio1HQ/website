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
      description="Developer content, rebuilt for Reddit, X, LinkedIn, daily.dev, Dev.to, and YouTube."
      primaryCta="Book a Strategy Call"
      secondaryCta="Explore Services"
      stats={[
        { value: "304K+", label: "Reddit impressions for Entelligence AI" },
        { value: "100K+", label: "OpenLore impressions in one month" },
        { value: "50K", label: "on one daily.dev post" },
        // need-review
        // { value: "40+", label: "videos and shorts for Nebius" },
      ]}
      highlights={["rebuilt for"]}
      sides={DISTRIBUTION_SIDES}
    />
  );
}
