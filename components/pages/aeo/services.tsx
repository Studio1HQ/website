"use client";

import { FileText, MagnifyingGlass, UsersThree } from "@phosphor-icons/react";
import {
  StoryRows,
  type StoryOffer,
} from "@/components/pages/shared/service-story";

const offerings: StoryOffer[] = [
  {
    id: "ai-visibility-audit",
    icon: MagnifyingGlass,
    badges: ["Prompts", "Baseline"],
    accent: "AI Visibility",
    rest: "Audit",
    description:
      "We write the prompts your buyers actually type, run them across AI tools, and score every answer against your competitors.",
    features: [
      "Category, problem, comparison, and brand prompts",
      "ChatGPT, Perplexity, Gemini, and Google AI",
      "Recommended, cited, mentioned, or absent",
      "Who gets named instead of you",
    ],
  },
  {
    id: "answer-ready-content",
    icon: FileText,
    badges: ["Pages", "Docs"],
    accent: "Answer-Ready",
    rest: "Content",
    description:
      "We fix the pages AI tools read: direct answers up top, comparison pages, docs that win the how-to, and guides for prompts you lose.",
    features: [
      "Direct answers in the first lines",
      "Comparison and alternatives pages",
      "Docs and how-to guides",
      "FAQs and structured data",
    ],
  },
  {
    id: "citations-and-community",
    icon: UsersThree,
    badges: ["Citations", "Community"],
    accent: "Citations",
    rest: "& Community",
    description:
      "AI answers often lean on lists, threads, and reviews written by others. We find the sources that name your rivals and earn your place in them.",
    features: [
      "Roundup and list outreach",
      "Reddit and community answers",
      "Directory and review profiles",
      "One consistent description everywhere",
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
      description="Three connected workstreams for AI visibility: measure where you stand, fix the pages AI tools read, then earn the sources they trust."
      offers={offerings}
    />
  );
}
