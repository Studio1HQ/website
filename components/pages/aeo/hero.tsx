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
      description="An AEO agency for developer tools: we write the content and docs ChatGPT, Perplexity, and Google AI quote, and check whether you show up."
      primaryCta="Book a Strategy Call"
      secondaryCta="Explore Services"
      stats={[
        { value: "69.9%", label: "of developers ask AI for answers · Stack Overflow" },
        { value: "78%", label: "of Mintlify docs traffic is AI agents" },
        { value: "400+", label: "technical tutorials and guides written" },
      ]}
      highlights={["AEO agency for developer tools", "check whether you show up"]}
      sides={AEO_SIDES}
    />
  );
}
