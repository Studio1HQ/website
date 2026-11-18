"use client";

import { StoryHero } from "@/components/pages/shared/service-story";
import { AEO_SIDES } from "@/components/pages/shared/hero-sides";

export default function Hero() {
  return (
    <StoryHero
      eyebrow="Services"
      pill="ChatGPT · Perplexity · Gemini · AI Overviews"
      titleAccent="Show Up"
      titleRest="When Developers Ask AI"
      description="Answer engine optimization for developer tools: content and docs made to be cited by ChatGPT, Perplexity, and Google AI."
      primaryCta="Book a Strategy Call"
      secondaryCta="Explore Services"
      stats={[
        {
          value: "69.9%",
          label: "of developers ask AI for answers · Stack Overflow",
        },
        { value: "78%", label: "of Mintlify docs traffic is AI agents" },
        { value: "400+", label: "technical tutorials and guides written" },
      ]}
      highlights={["made to be cited"]}
      sides={AEO_SIDES}
    />
  );
}
