import Process from "@/components/pages/blogs-as-a-service/process";
import type { Metadata } from "next";
import Hero from "@/components/pages/blogs-as-a-service/hero";
import Services from "@/components/pages/blogs-as-a-service/services";
import type { FAQItem } from "@/components/landing/faq";
import { PaperSection } from "@/components/paper/paper-sections";
import { PaperServiceFaq } from "@/components/pages/shared/paper-service-kit";
import { PAPER_SCOPE } from "@/lib/paper";
import { breadcrumbJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";
import {
  StoryCards,
  StoryLogos,
  StoryProof,
} from "@/components/pages/shared/service-story";
import { PaperCta } from "@/components/paper/paper-sections";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { Container } from "@/components/home/ui";
import type { CaseStudyResultData } from "@/components/case-studies/case-study-result";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({
    locale: DEFAULT_LOCALE,
    namespace: "Metadata.services.technicalContent",
  });

  return pageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/technical-content-marketing",
    locale: DEFAULT_LOCALE,
  });
}

const blogFaqItems: FAQItem[] = [
  {
    question:
      "What does a technical content marketing agency for developer tools do?",
    answer:
      "It plans, writes, and distributes the content developers use to evaluate a tool: tutorials, integration guides, comparison posts, deep dives, and SEO articles that answer the questions developers search for. Studio1 does this for devtool, AI, and SaaS teams with engineers and technical writers matched to your stack, and can distribute each piece on Reddit, X, LinkedIn, Dev.to, and daily.dev. For Bright Data, that meant 50+ live posts on brightdata.com in a year.",
  },
  {
    question:
      "Why hire a technical content agency instead of a general content agency?",
    answer:
      "Developers check the code before they trust the claim. A technical content agency writes with people who run the code, test every example, and know the stack, so tutorials work on the first try and comparisons hold up to scrutiny. General content agencies usually need your engineers to fix drafts, which is the time you were trying to save.",
  },
  {
    question: "What types of technical content do you create?",
    answer:
      "We create developer-focused blog posts, step-by-step tutorials, integration guides, product walkthroughs, comparison articles, technical deep-dives, and campaign content built around real projects or repos. Every piece includes real technical context and is written by engineers or technical writers matched to the stack.",
  },
  {
    question: "Who writes the blog posts?",
    answer:
      "Our writers are experienced engineers and technical writers with backgrounds in AI/ML, DevOps, cloud computing, web development, and more. Each writer is matched to your product's stack so the content reads like it was written by someone on your team.",
  },
  {
    question: "What is the typical turnaround time per blog post?",
    answer:
      "Most straightforward blogs and tutorials can move from brief to draft in 3 to 7 days. Complex technical deep dives, product walkthroughs, or code-heavy implementation guides usually need 10 to 14 days for research, validation, review, and polish.",
  },
  {
    question: "Can you help repurpose content after publishing?",
    answer:
      "Yes, when it fits the engagement. We can adapt a published article into short social copy, developer-community snippets, or republishing formats for approved channels like Dev.to, Medium, X, and LinkedIn.",
  },
  {
    question: "How do you ensure technical accuracy?",
    answer:
      "Every article goes through a multi-step review process: the writer validates code examples, a technical reviewer checks accuracy and edge cases, and an editor ensures clarity. We also incorporate your team's feedback before publish.",
  },
  {
    question: "Can I provide topics or do you handle topic selection?",
    answer:
      "Both. We can work from your content calendar, or research and propose topics based on keyword data, competitor analysis, developer pain points, and your product roadmap. Most clients prefer a hybrid approach where Studio1 suggests topics and the client approves.",
  },
  {
    question: "What does the review workflow look like?",
    answer:
      "We usually start with a topic, then send an outline and overview for approval. After your team approves the direction, we write the draft, review it internally, send it for client review, revise, and then publish on the agreed channel.",
  },
  {
    question: "Can content publish from Studio1 or individual author profiles?",
    answer:
      "Yes. Depending on the goal, content can publish on your company blog, your Dev.to or Medium profile, Studio1 profiles, or individual author profiles. We also support social posts from either your channels or ours when that fits the campaign.",
  },
];

const contentWorkflow = [
  {
    title: "Topic strategy or topic handoff",
    description:
      "We can start from your product roadmap, your existing content calendar, or topics we research and propose from developer search intent.",
    points: [
      "High-intent developer queries",
      "Comparison and alternative topics",
      "Integration and use-case ideas",
      "Client-provided topics and briefs",
    ],
  },
  {
    title: "Outline before the draft",
    description:
      "Before writing, we prepare the angle, structure, examples, and technical flow so your team can review the direction early.",
    points: [
      "Draft outline and article overview",
      "Developer persona and use-case framing",
      "Code example plan",
      "Client review before full writing starts",
    ],
  },
  {
    title: "Technical draft and review",
    description:
      "Studio1 writes the full piece, checks the technical flow internally, then sends it through your product or engineering review.",
    points: [
      "Engineer-written blog draft",
      "Technical validation and editorial pass",
      "Client review and revision cycle",
      "Final polish for clarity and SEO",
    ],
  },
  {
    title: "Publishing on the right channel",
    description:
      "Content can ship on your company blog, Dev.to, Medium, or from Studio1/team profiles depending on the goal and audience.",
    points: [
      "Company blog publishing",
      "Studio1 or author profile publishing",
      "Dev.to and Medium syndication",
      "Canonical and attribution guidance",
    ],
  },
  {
    title: "Content that explains implementation",
    description:
      "The goal is not only traffic. We write technical content that helps developers understand, try, and trust your product.",
    points: [
      "Tutorials and implementation guides",
      "Product walkthroughs",
      "Integration guides",
      "Comparison and decision content",
    ],
  },
];

const contentCaseStudyProofs: CaseStudyResultData[] = [
  {
    company: "Entelligence AI",
    category: "Technical Content & Distribution",
    href: "/case-studies/entelligence-ai",
    heroValue: "304K+",
    heroLabel: "Reddit impressions generated from developer distribution",
    proof:
      "Technical blogs, deep dives, feature-launch content, and social distribution for an AI engineering audience.",
    stats: [
      { value: "Blogs", label: "planning, writing, and editing" },
      { value: "Social", label: "distribution assets" },
      { value: "Deep dives", label: "technical explanations" },
    ],
  },
  {
    company: "Permit.io",
    category: "Authorization Guides",
    href: "/case-studies/permit",
    heroValue: "Auth",
    heroLabel: "implementation content for developer adoption",
    proof:
      "Developer-facing authorization guides and technical content built around practical implementation questions.",
    stats: [
      { value: "Guides", label: "developer education" },
      { value: "Auth", label: "implementation topics" },
      { value: "Blog", label: "content support" },
    ],
  },
  {
    company: "Tensorlake",
    category: "Search-Led Technical Content",
    href: "/case-studies/tensorlake",
    heroValue: "SEO",
    heroLabel: "technical content for AI workflow topics",
    proof:
      "Search-led technical writing and visual tutorials that made complex AI infrastructure ideas easier to understand.",
    stats: [
      { value: "SEO", label: "topic planning" },
      { value: "AI", label: "workflow explainers" },
      { value: "Visuals", label: "technical tutorials" },
    ],
  },
];

export default function Page() {
  const serviceSchema = serviceJsonLd({
    name: "Technical Content Marketing Agency for Developer Tools",
    description:
      "Technical content marketing agency for developer tools, AI, and SaaS teams: engineer-written tutorials, integration guides, comparisons, and SEO articles that build trust and drive adoption.",
    path: "/technical-content-marketing",
    serviceType: "Technical Content Marketing",
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
              {
                name: "Technical Content Marketing Agency",
                path: "/technical-content-marketing",
              },
            ]),
          ),
        }}
      />
      <Hero />
      <StoryLogos />
      <Services />
      <StoryCards
        index={2}
        title="From topic idea to published technical content"
        description="We align topic, outline, draft, review, publishing, and optional repurposing around one developer goal."
        steps={contentWorkflow}
        workflow="technical-content.yml"
      />
      <Process index={3} />
      <StoryProof
        index={4}
        title="Case studies from technical content work"
        description="Blogs, guides, deep dives, and developer education shaped around real technical topics."
        studies={contentCaseStudyProofs}
      />
      <PaperSection tone="paper">
        <Container>
          <PaperServiceFaq
            index={5}
            subtitle="Common questions about our technical content marketing services."
            items={blogFaqItems}
          />
        </Container>
      </PaperSection>
      <PaperCta
        index={6}
        title="Ready to Ship Technical Content Developers Trust?"
        description="We create developer tutorials, guides, and SEO content that build trust, increase product visibility, and drive technical adoption."
      />
    </div>
  );
}
