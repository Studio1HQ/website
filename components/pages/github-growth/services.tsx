"use client";

import { GithubLogo, RocketLaunch, UsersThree } from "@phosphor-icons/react";
import {
  StoryRows,
  type StoryOffer,
} from "@/components/pages/shared/service-story";

const offerings: StoryOffer[] = [
  {
    id: "repo-readiness",
    icon: GithubLogo,
    badges: ["README", "Onboarding"],
    accent: "Repo",
    rest: "Readiness",
    description:
      "We walk the path from repo page to first working run, then fix what stops developers from trying the project.",
    features: [
      "README and repo page rewrite",
      "Onboarding and quickstart audit",
      "Docs fixes before launch",
      "Example projects that run first time",
    ],
  },
  {
    id: "launches-and-demos",
    icon: RocketLaunch,
    badges: ["Positioning", "Demos"],
    accent: "Launches",
    rest: "& Demos",
    description:
      "A launch plan with demos to back it, written for the communities most likely to star, try, and talk about the repo.",
    features: [
      "Positioning and launch strategy",
      "Demo agents and sample apps",
      "Reddit, daily.dev, X, and LinkedIn posts",
      "Creator and influencer support",
    ],
  },
  {
    id: "community-distribution",
    icon: UsersThree,
    badges: ["Community", "Ecosystem"],
    accent: "Community",
    rest: "Distribution",
    description:
      "Distribution that keeps going after launch day, so new developers keep finding the repo and maintainers hear what they need.",
    features: [
      "Talks, workshops, and hackathons",
      "Framework and ecosystem integrations",
      "Ongoing community posts",
      "Developer feedback back to maintainers",
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
      description="Three connected workstreams for open-source growth: get the repo ready, launch it with demos, then keep developers arriving."
      offers={offerings}
    />
  );
}
