"use client";

import { StoryHero } from "@/components/pages/shared/service-story";
import { GITHUB_SIDES } from "@/components/pages/shared/hero-sides";

export default function Hero() {
  return (
    <StoryHero
      eyebrow="Services"
      pill="README · Launches · Demos · Community"
      titleAccent="GitHub Growth"
      titleRest="for Open-Source Devtools"
      description="READMEs, demos, and community launches for open-source developer tools."
      primaryCta="Book a Strategy Call"
      secondaryCta="Explore Services"
      stats={[
        { value: "12K+", label: "stars for Memori" },
        { value: "16K+", label: "stars for Nebius" },
        { value: "12x", label: "OpenLore in a month" },
        { value: "+567%", label: "Corsair stars in 5 weeks" },
      ]}
      highlights={["READMEs, demos, and community launches"]}
      sides={GITHUB_SIDES}
    />
  );
}
