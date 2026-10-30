"use client";

import { Rocket, UsersThree, ShareNetwork } from "@phosphor-icons/react";
import {
  StoryRows,
  type StoryOffer,
} from "@/components/pages/shared/service-story";

const offerings: StoryOffer[] = [
  {
    id: "developer-advocacy",
    icon: UsersThree,
    badges: ["Advocacy", "Community"],
    accent: "DevRel",
    rest: "Execution",
    description:
      "Embedded support across developer education, project tutorials, community replies, open-source maintenance, and feedback loops.",
    features: [
      "Developer advocacy and education",
      "Project tutorials and technical walkthroughs",
      "Community support across social and forums",
      "Open-source maintenance support",
    ],
  },
  {
    id: "organic-growth-campaign",
    anchorIds: ["product-launch-support"],
    icon: Rocket,
    badges: ["Launches", "Campaigns"],
    accent: "Growth",
    rest: "Campaigns",
    description:
      "Developer campaigns built around one strong technical story: repo, tutorial, demo video, and social distribution.",
    features: [
      "Product launch support",
      "Demo project or GitHub repo",
      "Technical blog and project demo video",
      "Hackathon and event collaboration support",
    ],
  },
  {
    id: "influencer-management",
    icon: ShareNetwork,
    badges: ["Creators", "Partnerships"],
    accent: "Influencer",
    rest: "Management",
    description:
      "End-to-end creator and partner coordination for developer audiences, from outreach to briefs, pricing, and integration-led content.",
    features: [
      "X, LinkedIn, YouTube, and newsletter creators",
      "Creator discovery and vetting",
      "Integration partner coordination",
      "Pricing, briefs, and deliverable management",
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
      description="Three connected workstreams for developer growth: run the DevRel motion, package launches into campaigns, and manage meaningful partner and creator collaborations."
      offers={offerings}
    />
  );
}
