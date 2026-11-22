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
      description="Engineer-written posts, launch threads, and answers for developer subreddits."
      primaryCta="Book a Strategy Call"
      secondaryCta="Explore Services"
      stats={[
        { value: "304K+", label: "Reddit impressions for Entelligence AI" },
        // need-review
        // { value: "44K", label: "views on one Nebius launch-day post" },
        { value: "50K+", label: "impressions on Memori's Reddit launch" },
        { value: "100+", label: "comments on one Memori thread" },
      ]}
      highlights={["Engineer-written", "developer subreddits"]}
      sides={REDDIT_SIDES}
    />
  );
}
