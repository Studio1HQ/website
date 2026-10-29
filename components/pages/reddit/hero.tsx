"use client";

import { StoryHero } from "@/components/pages/shared/service-story";
import { REDDIT_SIDES } from "@/components/pages/shared/hero-sides";

export default function Hero() {
  return (
    <StoryHero
      eyebrow="Services"
      pill="Subreddits · Posts · Launches · Comments"
      titleAccent="Reddit Marketing"
      titleRest="for Devtools"
      description="A Reddit marketing agency for developer tools: technical posts, launch threads, and answers developers upvote."
      primaryCta="Book a Call"
      secondaryCta="Explore Services"
      stats={[
        { value: "304K+", label: "Reddit impressions for Entelligence" },
        { value: "205K", label: "views on one r/LLMDevs post" },
        { value: "50K+", label: "Memori launch post" },
        { value: "100+", label: "comments on one Memori thread" },
      ]}
      highlights={[
        "Reddit marketing agency for developer tools",
        "answers developers upvote",
      ]}
      sides={REDDIT_SIDES}
    />
  );
}
