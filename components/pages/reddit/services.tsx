"use client";

import {
  ChatsCircle,
  MagnifyingGlass,
  RedditLogo,
} from "@phosphor-icons/react";
import {
  StoryRows,
  type StoryOffer,
} from "@/components/pages/shared/service-story";

const offerings: StoryOffer[] = [
  {
    id: "subreddit-research",
    icon: MagnifyingGlass,
    badges: ["Research", "Rules"],
    accent: "Subreddit",
    rest: "Research",
    description:
      "We find the subreddits where your users already talk, learn each one's rules, and see what gets upvoted and what gets removed.",
    features: [
      "Subreddits mapped to your use cases",
      "Self-promotion rules for each one",
      "Threads where competitors come up",
      "Post formats that work in each room",
    ],
  },
  {
    id: "technical-posts",
    icon: RedditLogo,
    badges: ["Posts", "Launches"],
    accent: "Technical",
    rest: "Posts",
    description:
      "We turn your blogs, demos, and launches into posts that stand on their own as technical discussions, not links with a pitch.",
    features: [
      "Problem-first post angles",
      "Launch and Show-and-tell posts",
      "Demos and code developers can try",
      "Posting schedule across subreddits",
    ],
  },
  {
    id: "community-engagement",
    icon: ChatsCircle,
    badges: ["Comments", "Feedback"],
    accent: "Community",
    rest: "Engagement",
    description:
      "We stay in the comments, answer real questions, and send what developers ask for back to your product and docs teams.",
    features: [
      "Replies from people who know the product",
      "Helpful answers in existing threads",
      "Mention and sentiment tracking",
      "Feedback loop to product and docs",
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
      description="Three connected workstreams for Reddit: find the right subreddits, post what developers want to read, then stay in the conversation."
      offers={offerings}
    />
  );
}
