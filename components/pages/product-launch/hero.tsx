"use client";

import { StoryHero } from "@/components/pages/shared/service-story";
import { LAUNCH_SIDES } from "@/components/pages/shared/hero-sides";

export default function Hero() {
  return (
    <StoryHero
      eyebrow="Services"
      pill="Launch plan · Assets · Launch day · Launch week"
      titleAccent="Product Launch"
      titleRest="Service for Developer Tools"
      description="Launch plans, demo videos, and launch-day support across Reddit, Hacker News, X, LinkedIn, and Product Hunt."
      primaryCta="Book a Call"
      secondaryCta="Explore Services"
      stats={[
        { value: "50K+", label: "Memori Reddit launch" },
        { value: "136", label: "points on Hacker News" },
        { value: "#3", label: "Webcrumbs on Product Hunt" },
        { value: "2", label: "Nebius launches" },
      ]}
      highlights={["Launch plans", "launch-day support"]}
      sides={LAUNCH_SIDES}
    />
  );
}
