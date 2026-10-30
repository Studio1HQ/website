"use client";

import { ChartLineUp, ShareNetwork, Strategy } from "@phosphor-icons/react";
import {
  StoryRows,
  type StoryOffer,
} from "@/components/pages/shared/service-story";

const offerings: StoryOffer[] = [
  {
    id: "channel-plan",
    icon: Strategy,
    badges: ["Channels", "Rhythm"],
    accent: "Channel",
    rest: "Plan",
    description:
      "We find where your users already read and ask questions, then set a posting rhythm across those channels instead of posting everywhere.",
    features: [
      "Subreddits, feeds, and newsletters by topic",
      "Which pieces suit which channel",
      "A weekly schedule per article",
      "Rules for each community",
    ],
  },
  {
    id: "native-posts",
    icon: ShareNetwork,
    badges: ["Reddit", "X", "daily.dev"],
    accent: "Native",
    rest: "Posts",
    description:
      "Each article is rebuilt for each channel: a problem-first Reddit post, an X thread or Article, a LinkedIn takeaway, a daily.dev post, and a Dev.to republish.",
    features: [
      "Problem-first Reddit discussions",
      "X threads and Articles with demos",
      "Dev.to and Medium with canonical links",
      "YouTube walkthroughs and Shorts",
    ],
  },
  {
    id: "engage-measure",
    icon: ChartLineUp,
    badges: ["Comments", "Results"],
    accent: "Engage",
    rest: "& Measure",
    description:
      "We stay in the comments, pass what developers ask back to your team, and track what each post led to beyond views.",
    features: [
      "Replies from people who know the product",
      "Questions logged for docs and content",
      "Impressions, clicks, signups, and stars",
      "Next month's plan from what worked",
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
      description="Three connected workstreams: plan the channels, rebuild each piece so it fits, then stay in the conversation and measure what it did."
      offers={offerings}
    />
  );
}
