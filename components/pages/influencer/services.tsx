"use client";

import { DeviceMobile, Megaphone, RocketLaunch } from "@phosphor-icons/react";
import {
  StoryRows,
  type StoryOffer,
} from "@/components/pages/shared/service-story";

const offerings: StoryOffer[] = [
  {
    id: "creator-campaigns",
    icon: Megaphone,
    badges: ["Sourcing", "Management"],
    accent: "Creator",
    rest: "Campaigns",
    description:
      "We find the developer creators your audience already follows and manage the campaign end to end, from first outreach to the final report.",
    features: [
      "Creator research and shortlists",
      "Outreach and partnerships",
      "Briefs and content reviews",
      "Campaign management and reporting",
    ],
  },
  {
    id: "ugc-programs",
    icon: DeviceMobile,
    badges: ["Reels", "Shorts"],
    accent: "UGC",
    rest: "Programs",
    description:
      "Short-form videos about your product, made by creators and published across Instagram, TikTok, and YouTube Shorts.",
    features: [
      "Creator recruitment",
      "Scripts and creative direction",
      "Ongoing short-form video",
      "Performance reports",
    ],
  },
  {
    id: "launch-amplification",
    icon: RocketLaunch,
    badges: ["Launch day", "Founders"],
    accent: "Launch",
    rest: "Amplification",
    description:
      "Creator support around your launch, so the people developers follow are talking about it on the day it ships.",
    features: [
      "Launch posts on X and LinkedIn",
      "YouTube reviews and walkthroughs",
      "Founder-led LinkedIn content",
      "Launch video production",
    ],
  },
];

export default function Services() {
  return (
    <StoryRows
      index={1}
      title={
        <>
          What We <span className="text-[#f97316]">Offer</span>
        </>
      }
      description="Three ways to work with developer creators: managed creator campaigns, short-form UGC, and launch-day amplification."
      offers={offerings}
    />
  );
}
