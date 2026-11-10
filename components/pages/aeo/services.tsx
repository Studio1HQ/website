"use client";

import { FileText, MagnifyingGlass, UsersThree } from "@phosphor-icons/react";
import {
  StoryRows,
  type StoryOffer,
} from "@/components/pages/shared/service-story";

const offerings: StoryOffer[] = [
  {
    id: "answer-ready-content",
    icon: FileText,
    badges: ["Pages", "Docs"],
    accent: "Answer-Ready",
    rest: "Content",
    description:
      "We write the pages AI tools quote: direct answers up top, comparison pages, tutorials, and docs that answer the how-to.",
    features: [
      "Direct answers in the first lines",
      "Comparison and alternatives pages",
      "Tutorials, guides, and docs",
      "FAQs and structured data",
    ],
  },
  {
    id: "ai-readable-site",
    icon: UsersThree,
    badges: ["llms.txt", "Crawlers"],
    accent: "AI-Readable",
    rest: "Site",
    description:
      "We make sure AI tools can reach and read your content, so what you publish can be found and quoted.",
    features: [
      "llms.txt and sitemaps",
      "AI crawler access in robots.txt",
      "Pages that render without JavaScript",
      "One clear product description everywhere",
    ],
  },
  {
    id: "ai-answer-checks",
    icon: MagnifyingGlass,
    badges: ["ChatGPT", "Perplexity"],
    accent: "AI Answer",
    rest: "Checks",
    description:
      "We check ChatGPT, Perplexity, and Google AI for the questions that matter to see whether your pages and posts show up, and plan what to write next.",
    features: [
      "Checks across the main AI tools",
      "Which of your pages get cited",
      "Who gets named instead of you",
      "Gaps to cover next",
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
      description="Three connected workstreams for AI visibility: write the content AI tools quote, make your site easy for them to read, and check whether your pages show up."
      offers={offerings}
    />
  );
}
