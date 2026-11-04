import type { Metadata } from "next";
import Link from "next/link";
import { Buildings, Plant, TrendUp } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import Hero from "@/components/pages/influencer/hero";
import Services from "@/components/pages/influencer/services";
import type { FAQItem } from "@/components/landing/faq";
import { Container } from "@/components/home/ui";
import {
  Accent,
  IndexBar,
  PaperCta,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";
import { PaperServiceFaq } from "@/components/pages/shared/paper-service-kit";
import {
  StoryCards,
  StoryLogos,
} from "@/components/pages/shared/service-story";
import { INK, PAPER_SCOPE, PRINT } from "@/lib/paper";
import { breadcrumbJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";
import { DEFAULT_LOCALE } from "@/lib/i18n";

const PATH = "/influencer-marketing-agency";
const TITLE = "Influencer Marketing Agency for Developer Tools";
const DESCRIPTION =
  "Influencer marketing for devtools and AI: developer creator campaigns on X, YouTube, and LinkedIn, UGC programs, launch amplification, and reporting.";

/** Same card as the services hub (paper-sections is a client module). */
const CARD =
  "rounded-[6px] bg-white/80 ring-1 ring-inset ring-[#141414]/10 transition-[transform,box-shadow,background-color] duration-500 ease-out hover:-translate-y-1 hover:bg-white hover:shadow-[0_24px_40px_-28px_rgba(20,20,20,0.45)] motion-reduce:transform-none";

const linkClass =
  "font-medium text-[#141414] underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: PATH,
    locale: DEFAULT_LOCALE,
    keywords: [
      "influencer marketing agency",
      "developer influencer marketing",
      "tech influencer marketing",
      "influencer management for developer tools",
      "UGC for SaaS",
      "AI launch influencer campaign",
    ],
  });
}

const influencerFaqItems: FAQItem[] = [
  {
    question:
      "What does an influencer marketing agency for developer tools do?",
    answer:
      "It connects your product with the creators developers already follow, and runs the campaign for you. Studio1 handles creator research, outreach, briefs, campaign management, and reporting across X, YouTube, LinkedIn, Instagram, and TikTok, for devtool, AI, and open-source teams reaching developers in the US and Europe.",
  },
  {
    question: "Does influencer marketing work for developer tools?",
    answer:
      "Yes, when the creators fit. Developers pay attention to people they already follow, so we focus on creators who build with tools like yours and speak to the developers you want to reach.",
  },
  {
    question: "Which platforms do you cover?",
    answer:
      "X, YouTube, LinkedIn, Instagram, and TikTok. We pick the platforms for each campaign based on where your audience spends time.",
  },
  {
    question: "How do you choose creators?",
    answer:
      "We start from your audience, not follower counts. You get a shortlist of creators who match your product and audience, and you approve it before any outreach.",
  },
  {
    question: "What is a UGC program?",
    answer:
      "An ongoing stream of short-form videos about your product, made by creators and published on Instagram, TikTok, and YouTube Shorts.",
  },
  {
    question: "How much does influencer marketing cost?",
    answer:
      "It depends on your goals, the platforms, and the creators involved. We plan every campaign around your budget, from a focused launch push to an ongoing creator program.",
  },
  {
    question: "How do you measure influencer campaigns?",
    answer:
      "Against goals agreed at the start, such as reach, engagement, clicks, and signups. You get a report on each campaign, with results by creator and platform.",
  },
];

const influencerWorkflow = [
  {
    title: "Plan the campaign",
    description:
      "We agree on your goals, audience, and budget, then choose the platforms and the creator mix.",
    points: [
      "Campaign goals and KPIs",
      "Target audience",
      "Platform plan",
      "Creator mix and budget",
    ],
  },
  {
    title: "Build the influencer shortlist",
    description:
      "We research creators who fit your product and audience, and share a shortlist for your approval.",
    points: [
      "Creator research",
      "Audience fit",
      "Shortlist for your review",
      "Creator outreach",
    ],
  },
  {
    title: "Draft briefs",
    description:
      "Every creator gets a clear brief on your product, the story to tell, and what to deliver.",
    points: [
      "Product brief",
      "Key messages",
      "Deliverables and timelines",
      "Creator agreements",
    ],
  },
  {
    title: "Run the campaign",
    description:
      "We review content, schedule posts, and coordinate creators with your team through launch.",
    points: [
      "Content reviews",
      "Posting schedule",
      "Launch-day coordination",
      "Creator management",
    ],
  },
  {
    title: "Report and feedback",
    description:
      "We report results against your goals and recommend what to do next.",
    points: [
      "Campaign report",
      "Results by creator and platform",
      "What worked",
      "Next steps",
    ],
  },
];

/** Who it suits: the creator mix changes with stage and budget. */
const STAGES: { icon: Icon; stage: string; title: string; text: string }[] = [
  {
    icon: Plant,
    stage: "Early stage",
    title: "First launch",
    text: "Smaller creators and short-form video to get your product in front of the right developers.",
  },
  {
    icon: TrendUp,
    stage: "Growth",
    title: "Ongoing reach",
    text: "Creator campaigns and UGC that keep your product visible across releases.",
  },
  {
    icon: Buildings,
    stage: "Large launches",
    title: "Big moments",
    text: "Top creators, YouTube reviews, and launch video around one launch date.",
  },
];

function StageTiers() {
  return (
    <PaperSection id="stages" tone="paper" className="!pt-0">
      <Container>
        <IndexBar
          index={2}
          name="Sized to your stage"
          aside="Nano · Micro · Mid-tier · Macro · Mega"
        />
        <SectionHead
          title={
            <>
              The right creators for <Accent>your budget</Accent>
            </>
          }
          description="Every stage needs a different creator mix. We plan it around your goals, budget, and audience."
        />
        <ul role="list" className="mt-10 grid gap-2 md:grid-cols-3">
          {STAGES.map(({ icon: StageIcon, stage, title, text }) => (
            <li key={stage} className={`flex flex-col gap-6 p-6 ${CARD}`}>
              <span className="flex items-center justify-between">
                <span
                  className="flex size-11 items-center justify-center text-[#f4efe7]"
                  style={{ background: INK }}
                >
                  <StageIcon className="size-5" />
                </span>
                <span
                  className="text-[12px] font-medium uppercase tracking-[0.12em]"
                  style={{ color: PRINT }}
                >
                  {stage}
                </span>
              </span>
              <span className="block">
                <span className="block text-[20px] font-medium leading-tight tracking-[-0.03em]">
                  {title}
                </span>
                <span className="mt-2 block text-[14.5px] leading-[1.55] text-[#141414]/60">
                  {text}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </PaperSection>
  );
}

export default function Page() {
  const serviceSchema = serviceJsonLd({
    name: TITLE,
    description: DESCRIPTION,
    path: PATH,
    serviceType: "Influencer Marketing",
  });

  return (
    <div className="overflow-x-clip" style={PAPER_SCOPE}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Influencer Marketing Agency", path: PATH },
            ]),
          ),
        }}
      />
      <Hero />
      <StoryLogos />
      <Services />
      <StageTiers />
      <StoryCards
        index={3}
        name="How we run creator campaigns"
        title="From the first plan to the final report"
        description="Five steps we run for every creator campaign, from planning to reporting."
        steps={influencerWorkflow}
        workflow="creator-campaign.yml"
      />
      <PaperSection tone="paper">
        <Container>
          <PaperServiceFaq
            index={4}
            subtitle="Common questions about influencer marketing for developer tools."
            items={influencerFaqItems}
          />
          <p className="mt-8 text-center text-[15px] text-[var(--p-muted)]">
            Creators work best alongside a{" "}
            <Link href="/product-launch-service" className={linkClass}>
              launch plan
            </Link>{" "}
            and{" "}
            <Link href="/developer-content-distribution" className={linkClass}>
              content distribution
            </Link>
            , or see our{" "}
            <Link
              href="/developer-relations-growth-campaigns"
              className={linkClass}
            >
              DevRel and growth campaigns
            </Link>
            .
          </p>
        </Container>
      </PaperSection>
      <PaperCta
        index={5}
        title="Ready to Work With Developer Creators?"
        description="Creator campaigns, UGC programs, and launch amplification for developer tools, planned around your goals and budget."
      />
    </div>
  );
}
