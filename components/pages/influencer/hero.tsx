"use client";

import { StoryHero } from "@/components/pages/shared/service-story";
import { INFLUENCER_SIDES } from "@/components/pages/shared/hero-sides";

export default function Hero() {
  return (
    <StoryHero
      eyebrow="Services"
      pill="Creators · UGC · Launches · Reporting"
      titleAccent="Influencer Management"
      titleRest="for Devtools"
      description="Vetted developer creators on X, YouTube, LinkedIn, Instagram, and TikTok, briefed on your product."
      primaryCta="Book a Strategy Call"
      secondaryCta="Explore Services"
      stats={[
        { value: "5", label: "platforms, from X to TikTok" },
        { value: "3", label: "ways to work with creators" },
        { value: "Nano–mega", label: "creator tiers, sized to budget" },
        { value: "US + EU", label: "developer audiences" },
      ]}
      highlights={["Vetted developer creators"]}
      sides={INFLUENCER_SIDES}
    />
  );
}
