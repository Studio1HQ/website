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
      description="Developer creators on X, YouTube, LinkedIn, Instagram, and TikTok, vetted for credibility, briefed on your product, and measured against the KPIs you set."
      primaryCta="Book a Call"
      secondaryCta="Explore Services"
      stats={[
        { value: "5", label: "platforms, from X to TikTok" },
        { value: "3", label: "ways to work with creators" },
        { value: "Nano–mega", label: "creator tiers, sized to budget" },
        { value: "US + EU", label: "developer audiences" },
      ]}
      highlights={["vetted for credibility", "measured against the KPIs"]}
      sides={INFLUENCER_SIDES}
    />
  );
}
