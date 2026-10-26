"use client";

import { Books, MagnifyingGlass, Path } from "@phosphor-icons/react";
import {
  StoryRows,
  type StoryOffer,
} from "@/components/pages/shared/service-story";

const offerings: StoryOffer[] = [
  {
    icon: MagnifyingGlass,
    badges: ["Onboarding", "API docs"],
    accent: "Docs",
    rest: "Audit",
    description:
      "Review onboarding, API usability, and documentation quality to surface friction before you write more pages.",
    features: [
      "Developer onboarding path review",
      "API and SDK docs usability check",
      "Coverage and findability gaps",
      "Prioritized findings report",
    ],
  },
  {
    icon: Books,
    badges: ["Quickstarts", "Reference"],
    accent: "Documentation",
    description:
      "Ship quickstarts, how-tos, and API or SDK reference with real code, matched to your stack.",
    features: [
      "Quickstarts with working code",
      "Task-based how-tos",
      "API and SDK reference pages",
      "Concept and architecture guides",
    ],
  },
  {
    icon: Path,
    badges: ["Flows", "Follow-up"],
    accent: "DX",
    rest: "Improvements",
    description:
      "Fix high-friction paths, examples, and error handling, then follow through until activation moves.",
    features: [
      "High-friction flow rewrites",
      "Clearer examples and error paths",
      "Docs IA and contribution habits",
      "Follow-up and activation review",
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
      description="Three connected workstreams for AI and DevTool products: audit the docs, write what is missing, then improve the developer path."
      offers={offerings}
    />
  );
}
