"use client";

import { RocketLaunch, Target, VideoCamera } from "@phosphor-icons/react";
import {
  StoryRows,
  type StoryOffer,
} from "@/components/pages/shared/service-story";

const offerings: StoryOffer[] = [
  {
    id: "launch-strategy",
    icon: Target,
    badges: ["Positioning", "Plan"],
    accent: "Launch",
    rest: "Strategy",
    description:
      "We decide what is new, who it is for, and where it launches, then plan every channel and the launch week as one sequence.",
    features: [
      "Launch angle and one-line pitch",
      "Date and channel plan",
      "Launch week sequencing",
      "Try-it-now readiness check",
    ],
  },
  {
    id: "launch-assets",
    icon: VideoCamera,
    badges: ["Demo video", "Posts"],
    accent: "Launch",
    rest: "Assets",
    description:
      "Everything a developer sees in the first few seconds, and everything they find after they click through.",
    features: [
      "Demo video and screenshots",
      "Launch posts for each channel",
      "Product Hunt listing and maker comment",
      "Demo projects and use-case posts",
    ],
  },
  {
    id: "launch-day",
    icon: RocketLaunch,
    badges: ["Launch day", "Follow-up"],
    accent: "Launch Day",
    rest: "& After",
    description:
      "We work launch day with your team and keep going after it, so the spike turns into signups, docs fixes, and content that lasts.",
    features: [
      "Replies to every comment",
      "Reddit, Hacker News, X, and LinkedIn posts",
      "Recap and follow-up posts",
      "Comparison and tutorial content",
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
      description="Three connected workstreams for a developer tool launch: plan it, build what developers see, then run launch day and the week after."
      offers={offerings}
    />
  );
}
