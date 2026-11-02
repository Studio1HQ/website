"use client";

import { StoryHero } from "@/components/pages/shared/service-story";
import { SERVICES_SIDES } from "@/components/pages/shared/hero-sides";

export default function Hero() {
  return (
    <StoryHero
      eyebrow="Services"
      pill="Content · DevRel · GitHub · Launches · AEO"
      titleAccent="Devtool Marketing"
      titleRest="Services"
      description="Content, DevRel, and growth for devtool, AI, and open-source teams. One service or several, one team."
      primaryCta="Book a Call"
      secondaryCta="Not sure where to start?"
      secondaryHref="#where-to-start"
      stats={[
        { value: "16K+", label: "GitHub stars on Nebius's examples" },
        { value: "100K+", label: "OpenLore impressions in one month" },
        { value: "50+", label: "technical posts for Bright Data" },
        { value: "35+", label: "devtool teams served" },
      ]}
      highlights={["Content, DevRel, and growth"]}
      sides={SERVICES_SIDES}
    />
  );
}
