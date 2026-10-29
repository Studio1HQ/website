import type { Metadata } from "next";
import Hero from "@/components/pages/github-growth/hero";
import Services from "@/components/pages/github-growth/services";
import type { FAQItem } from "@/components/landing/faq";
import { Container } from "@/components/home/ui";
import { PaperCta, PaperSection } from "@/components/paper/paper-sections";
import { PaperServiceFaq } from "@/components/pages/shared/paper-service-kit";
import {
  StoryCards,
  StoryLogos,
  StoryProof,
} from "@/components/pages/shared/service-story";
import type { CaseStudyResultData } from "@/components/case-studies/case-study-result";
import { PAPER_SCOPE } from "@/lib/paper";
import { breadcrumbJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";
import { DEFAULT_LOCALE } from "@/lib/i18n";

const TITLE = "GitHub Growth Agency for Open-Source Devtools";
const DESCRIPTION =
  "GitHub growth agency for open-source devtools: README and onboarding fixes, demo projects, launches, and distribution. Memori grew from 0 to 12,000+ stars.";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: "/github-growth-agency",
    locale: DEFAULT_LOCALE,
    keywords: [
      "GitHub growth agency",
      "open source marketing agency",
      "how to get more GitHub stars",
      "open source launch",
      "GitHub stars growth",
      "developer adoption for open source",
    ],
  });
}

const githubFaqItems: FAQItem[] = [
  {
    question: "What does a GitHub growth agency do?",
    answer:
      "A GitHub growth agency helps an open-source project get found, tried, and adopted by developers. At Studio1 that means fixing the README, quickstart, and docs so the first run works, building demo projects, planning the launch, and distributing it across developer communities such as Reddit, daily.dev, X, and LinkedIn, plus talks, workshops, and hackathons.",
  },
  {
    question: "How do you get more GitHub stars for an open-source project?",
    answer:
      "Stars follow developers who tried the project and liked it. The work that moves them is a clear README, a first run that works, demos people can copy, and launch posts in the communities your users already read. Memori grew from launch to 12,000+ stars with a community-led launch and 12 demo agents, and Corsair went from about 300 to 2,000 stars in roughly five weeks after onboarding fixes, example projects, and hackathons.",
  },
  {
    question: "How long does it take to see results?",
    answer:
      "It depends on the product and how ready the repo is. In recent engagements, OpenLore grew from about 135 to 1,700+ stars in one month and Corsair from about 300 to 2,000 in roughly five weeks. Projects that need onboarding or docs fixes first take longer before a launch is worth running.",
  },
  {
    question: "Are GitHub stars the right metric?",
    answer:
      "Stars are a visibility signal, not adoption on their own. Pair them with signals that show developers used the project: forks, issues, contributors, docs traffic, and first successful runs. For OpenLore, the launch also produced 200+ developer posts and comments and feature requests that went straight back to the founders.",
  },
  {
    question: "Can you get our repo trending on GitHub or Trendshift?",
    answer:
      "Nobody can promise a trending spot, but the same work that earns stars also earns trending runs. Nebius's open-source library of 130+ agent examples reached 16K+ stars and trended on GitHub twice, and OpenLore reached #3 in Go on Trendshift.",
  },
  {
    question: "Do you buy stars or use star-for-star schemes?",
    answer:
      "No. Our results come from repo, onboarding, demo, launch, and community work aimed at developers who will actually use the project. Bought or traded stars do not bring users, and they damage trust when developers notice.",
  },
];

const growthWorkflow = [
  {
    title: "Audit the repo and first run",
    description:
      "We go through the README, quickstart, and docs the way a new developer would, then hand over fixes in priority order.",
    points: [
      "README and repo page review",
      "Time to first working run",
      "Docs and quickstart gaps",
      "Fix list ranked by impact",
    ],
  },
  {
    title: "Sharpen the positioning",
    description:
      "One clear line on who the project is for and what it does, so the README, posts, and talks all lead with the same promise.",
    points: [
      "One-line positioning",
      "Comparison with alternatives",
      "Pricing and positioning research",
      "Launch narrative",
    ],
  },
  {
    title: "Build demos developers can run",
    description:
      "Example projects and demo apps show the project inside real workflows, which gives every launch post something to try.",
    points: [
      "Demo agents and sample apps",
      "Examples repos",
      "Supporting guides",
      "Short videos when they help",
    ],
  },
  {
    title: "Launch where developers gather",
    description:
      "Launch posts go out to the communities that fit the project, timed together so the repo picks up momentum in the same week.",
    points: [
      "Reddit and daily.dev posts",
      "X and LinkedIn threads",
      "Creator and influencer support",
      "Launch day coordination",
    ],
  },
  {
    title: "Keep developers arriving",
    description:
      "After launch, talks, hackathons, integrations, and steady posts keep new developers finding the repo and feed requests back to maintainers.",
    points: [
      "Talks, workshops, and hackathons",
      "Framework integrations",
      "Ongoing community posts",
      "Feedback loop to maintainers",
    ],
  },
];

const githubCaseStudyProofs: CaseStudyResultData[] = [
  {
    company: "Memori",
    category: "Open-Source Launch",
    href: "/case-studies/memori",
    heroValue: "12,000+",
    heroLabel: "GitHub stars, from launch to today",
    proof:
      "A community-led launch, 12 hands-on demo agents, and thought leadership that brought 100+ detailed developer comments into onboarding, docs, and the roadmap.",
    stats: [
      { value: "50K+", label: "Reddit launch impressions" },
      { value: "12", label: "demo agents shipped" },
      { value: "100+", label: "developer comments" },
    ],
  },
  {
    company: "Corsair",
    category: "Onboarding & Community Growth",
    href: "/case-studies/corsair",
    heroValue: "2K+",
    heroLabel: "GitHub stars in five weeks, up from about 300",
    proof:
      "Onboarding audits, example projects, README work, and student hackathons for an early open-source integration layer for AI agents.",
    stats: [
      { value: "~300", label: "stars at the start" },
      { value: "5 weeks", label: "to 2,000 stars" },
      { value: "Hackathons", label: "with a Corsair track" },
    ],
  },
  {
    company: "OpenLore",
    category: "Launch Positioning & DevRel",
    href: "/case-studies/openlore",
    heroValue: "1,700+",
    heroLabel: "GitHub stars in one month, up from ~135",
    proof:
      "A DX audit, launch positioning, talks, and community distribution for a docs server for coding agents.",
    stats: [
      { value: "12x", label: "star growth" },
      { value: "100K+", label: "impressions in a month" },
      { value: "#3", label: "trending in Go on Trendshift" },
    ],
  },
  {
    company: "Nebius",
    category: "Open-Source Examples & Integrations",
    href: "/case-studies/nebius",
    heroValue: "16K+",
    heroLabel: "GitHub stars on the agent examples library",
    proof:
      "130+ agent examples built on Token Factory, 29 framework integrations, workshops, and launch support. The examples repo trended on GitHub twice.",
    stats: [
      { value: "130+", label: "agent examples" },
      { value: "29", label: "framework integrations" },
      { value: "300+", label: "deliverables" },
    ],
  },
];

export default function Page() {
  const serviceSchema = serviceJsonLd({
    name: "GitHub Growth Services",
    description: DESCRIPTION,
    path: "/github-growth-agency",
    serviceType: "GitHub Growth and Open-Source Marketing",
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
              { name: "GitHub Growth Agency", path: "/github-growth-agency" },
            ]),
          ),
        }}
      />
      <Hero />
      <StoryLogos />
      <Services />
      <StoryCards
        index={2}
        name="How we grow a repo"
        title="From README to launch week and beyond"
        description="Five steps we run for open-source projects, from the first run a developer sees to the communities that keep them coming."
        steps={growthWorkflow}
        workflow="repo-growth.yml"
      />
      <StoryProof
        index={3}
        title="GitHub growth case studies"
        description="Open-source launches, examples repos, and community programs, with the star counts to show for them."
        studies={githubCaseStudyProofs}
      />
      <PaperSection tone="paper">
        <Container>
          <PaperServiceFaq
            index={4}
            subtitle="Common questions about growing an open-source project on GitHub."
            items={githubFaqItems}
          />
        </Container>
      </PaperSection>
      <PaperCta
        index={5}
        title="Ready to Grow Your Open-Source Project?"
        description="README and onboarding fixes, demos, launches, and community distribution for open-source devtools."
      />
    </div>
  );
}
