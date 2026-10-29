"use client";

import { StoryHero } from "@/components/pages/shared/service-story";

export default function Hero() {
  return (
    <StoryHero
      eyebrow="Services"
      pill="README · Launches · Demos · Community"
      titleAccent="GitHub Growth"
      titleRest="for Open-Source Devtools"
      description="We grow open-source repos the way developers actually find them: a README and first run that work, demos worth trying, launches in the right communities, and steady distribution after launch day."
      primaryCta="Book a Call"
      secondaryCta="Explore Services"
      stats={[
        { value: "12K+", label: "stars for Memori" },
        { value: "16K+", label: "stars for Nebius" },
        { value: "12x", label: "OpenLore in a month" },
        { value: "2K+", label: "Corsair in 5 weeks" },
      ]}
      highlights={["a README and first run that work", "launches"]}
      photo={{
        src: "/case-studies/openlore/openlore-hackspire-talk.webp",
        alt: "Arindam presenting a Meet OpenLore slide to hackathon participants at Hackspire",
        // Keeps the speaker and the "Meet OpenLore." headline inside the 4:5 arch.
        position: "32% center",
      }}
    />
  );
}
