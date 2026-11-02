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
      description="An AEO agency for developer tools: we track what ChatGPT, Perplexity, and Google AI say, then fix why you're missing."
      primaryCta="Book a Call"
      secondaryCta="Explore Services"
      stats={[
        { value: "12/30", label: "Bright Data queries in Google's top five" },
        { value: "8", label: "of them in the top three" },
        { value: "50+", label: "Bright Data posts live" },
      ]}
      highlights={["AEO agency for developer tools", "fix why you're missing"]}
      sides={AEO_SIDES}
    />
  );
}
