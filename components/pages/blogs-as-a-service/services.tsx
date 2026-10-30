"use client";

import { Code, PencilLine, ShareNetwork } from "@phosphor-icons/react";
import {
  StoryRows,
  type StoryOffer,
} from "@/components/pages/shared/service-story";

const offerings: StoryOffer[] = [
  {
    id: "technical-content-writing",
    icon: PencilLine,
    badges: ["Blogs", "Tutorials"],
    accent: "Technical",
    rest: "Writing",
    description:
      "Engineer-written articles, tutorials, and explainers that make complex developer products easier to understand and trust.",
    features: [
      "Technical blogs and deep-dives",
      "Step-by-step tutorials",
      "Product education articles",
      "Ghostwriting in your technical voice",
    ],
  },
  {
    icon: Code,
    badges: ["Repos", "Use cases"],
    accent: "Implementation",
    rest: "Guides",
    description:
      "Code-rich guides built around real workflows, integrations, and product use-cases developers can follow.",
    features: [
      "Integration walkthroughs",
      "Comparison and decision content",
      "Working code examples",
      "Review with your product team",
    ],
  },
  {
    icon: ShareNetwork,
    badges: ["SEO", "Distribution"],
    accent: "Content",
    rest: "Repurposing",
    description:
      "Optional publishing and repurposing support so strong articles can travel across the right developer channels.",
    features: [
      "Dev.to and Medium syndication",
      "X and LinkedIn post copy",
      "Developer-community snippets",
      "Performance review after publish",
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
      description="Three connected workstreams for developer content: write technical pieces, build implementation guides, and distribute them where developers already read."
      offers={offerings}
    />
  );
}
