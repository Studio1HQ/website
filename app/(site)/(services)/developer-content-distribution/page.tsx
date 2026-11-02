import type { Metadata } from "next";
import Link from "next/link";
import Hero from "@/components/pages/distribution/hero";
import Services from "@/components/pages/distribution/services";
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

const TITLE = "Developer Content Distribution Agency for Devtools";
const DESCRIPTION =
  "Developer content distribution for devtools: Reddit, X, LinkedIn, daily.dev, Dev.to, and YouTube versions of every piece. 304K+ Reddit impressions for Entelligence AI.";

const linkClass =
  "font-medium text-[#141414] underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: "/developer-content-distribution",
    locale: DEFAULT_LOCALE,
    keywords: [
      "developer content distribution",
      "content distribution agency",
      "technical content distribution",
      "devtool content promotion",
      "developer marketing distribution",
      "Reddit and Hacker News distribution",
    ],
  });
}

const distributionFaqItems: FAQItem[] = [
  {
    question: "What is developer content distribution?",
    answer:
      "It's getting technical content in front of developers who don't read your blog yet. Instead of pasting one link everywhere, each piece is rebuilt for the channel: a problem-first Reddit discussion, an X thread or Article, a LinkedIn takeaway, a daily.dev post, a Dev.to republish with a canonical link, and a YouTube walkthrough. For Entelligence AI, that approach drove 304K+ Reddit impressions.",
  },
  {
    question: "Where should developer content be distributed?",
    answer:
      "Where your users already read and ask questions. For most devtools that means relevant subreddits, X, LinkedIn, daily.dev, Hacker News when the piece is genuinely new, Dev.to or Medium as republishing homes, and YouTube for walkthroughs. We pick the channels per product rather than posting everywhere.",
  },
  {
    question: "Can you distribute content we already have?",
    answer:
      "Yes. We can start from your existing blog posts, docs, demos, and launches, or from content we write for you. For Entelligence AI, we adapted selected blog angles into Reddit discussions instead of writing everything from scratch.",
  },
  {
    question: "Do you post on Hacker News?",
    answer:
      "Only when a piece is genuinely new or useful, with the original source and a plain title. Hacker News rewards substance and its guidelines ask people not to solicit upvotes, so we never ask for votes or comments.",
  },
  {
    question: "Does republishing on Dev.to or Medium hurt SEO?",
    answer:
      "Not when the republished copy sets a canonical link back to your original post. DEV and Medium both support a canonical URL, so search engines credit your site while the copy reaches the platform's readers.",
  },
  {
    question: "How do you measure distribution results?",
    answer:
      "We track impressions, views, upvotes, and comments on every post, then look at what developers did next: clicks to docs, signups, and GitHub stars. Comments matter most, because repeated questions point to gaps in your docs and your next article.",
  },
  {
    question: "How long until distribution works?",
    answer:
      "A single post can do well on day one, but steady reach takes a few weeks of consistent posting. For OpenLore, a month of daily posting across X, LinkedIn, daily.dev, and Reddit reached 100K+ impressions.",
  },
  {
    question: "Does distribution help with Google and AI answers?",
    answer:
      "Often. Reddit threads, Dev.to posts, and YouTube videos regularly appear in Google results and AI answers when developers compare tools, so a useful post that names your product keeps working after launch day.",
  },
];

const distributionWorkflow = [
  {
    title: "Pick the channels",
    description:
      "We map where your users read and ask questions, and which of your pieces suit each place.",
    points: [
      "Subreddits and communities",
      "Feeds and newsletters",
      "Channel rules and norms",
      "Pieces worth distributing",
    ],
  },
  {
    title: "Rebuild per channel",
    description:
      "Each piece gets a native version for every channel instead of one link pasted everywhere.",
    points: [
      "Problem-first Reddit posts",
      "X threads and Articles",
      "LinkedIn takeaways",
      "Canonical republishes",
    ],
  },
  {
    title: "Publish on a rhythm",
    description:
      "A weekly schedule per article, and daily posting during launches and pushes.",
    points: [
      "Blog first, channels after",
      "One channel a day",
      "Daily during launches",
      "Hacker News only when it fits",
    ],
  },
  {
    title: "Stay in the comments",
    description:
      "Fast, useful replies turn a post into a conversation, and questions into your next article.",
    points: [
      "Replies from people who know the product",
      "Answers in existing threads",
      "Questions logged for docs",
      "Feedback passed to your team",
    ],
  },
  {
    title: "Measure and repeat",
    description:
      "We track every post and what developers did next, then double down on what worked.",
    points: [
      "Impressions and engagement",
      "Clicks, signups, and stars",
      "Angles that started discussion",
      "Next month's channel plan",
    ],
  },
];

const distributionCaseStudyProofs: CaseStudyResultData[] = [
  {
    company: "Entelligence AI",
    category: "Reddit Distribution",
    href: "/case-studies/entelligence-ai",
    heroValue: "304K+",
    heroLabel: "Reddit impressions from adapted blog angles",
    proof:
      "Technical blogs and deep dives reshaped into discussion-led Reddit posts. One r/LLMDevs post alone reached 205K views and 278 upvotes.",
    stats: [
      { value: "205K", label: "views on one post" },
      { value: "278", label: "upvotes" },
      { value: "97.6%", label: "upvote ratio" },
    ],
  },
  {
    company: "OpenLore",
    category: "Launch Month Distribution",
    href: "/case-studies/openlore",
    heroValue: "100K+",
    heroLabel: "impressions across platforms in one month",
    proof:
      "Articles plus daily posts across X, LinkedIn, daily.dev, and Reddit during a one-month push, alongside talks and hackathons.",
    stats: [
      { value: "50K", label: "on one daily.dev post" },
      { value: "24K", label: "views on one X Article" },
      { value: "200+", label: "LinkedIn posts from developers" },
    ],
  },
  {
    company: "Nebius",
    category: "Multi-channel Content",
    href: "/case-studies/nebius",
    heroValue: "45+",
    heroLabel: "articles, each with distribution across channels",
    proof:
      "Articles, videos, and Shorts over nearly two years, adapted for subreddits, X, LinkedIn, and developer newsletters.",
    stats: [
      { value: "40+", label: "videos and shorts" },
      { value: "12", label: "subreddit posts" },
      { value: "44K", label: "views on one Reddit post" },
    ],
  },
];

export default function Page() {
  const serviceSchema = serviceJsonLd({
    name: "Developer Content Distribution for Devtools",
    description: DESCRIPTION,
    path: "/developer-content-distribution",
    serviceType: "Developer Content Distribution",
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
                name: "Developer Content Distribution",
                path: "/developer-content-distribution",
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
        name="How we distribute"
        title="From one article to a post on every channel that matters"
        description="Five steps we run for developer tools, from picking the channels to proving what each post did."
        steps={distributionWorkflow}
        workflow="distribution.yml"
      />
      <StoryProof
        index={3}
        title="Content distribution case studies"
        description="Reddit, X, LinkedIn, daily.dev, and video distribution for developer tools, with the numbers from each."
        studies={distributionCaseStudyProofs}
      />
      <PaperSection tone="paper">
        <Container>
          <PaperServiceFaq
            index={4}
            subtitle="Common questions about distributing technical content to developers."
            items={distributionFaqItems}
          />
          <p className="mt-8 text-center text-[15px] text-[var(--p-muted)]">
            Read the{" "}
            <Link
              href="/blog/how-to-distribute-technical-content-reddit-x-youtube"
              className={linkClass}
            >
              channel-by-channel distribution playbook
            </Link>
            , or see our{" "}
            <Link href="/reddit-marketing-agency" className={linkClass}>
              Reddit marketing
            </Link>{" "}
            and{" "}
            <Link href="/technical-content-marketing" className={linkClass}>
              technical content
            </Link>{" "}
            services.
          </p>
        </Container>
      </PaperSection>
      <PaperCta
        index={5}
        title="Ready to Get Your Content Read?"
        description="Channel plans, native posts, and community engagement for developer tools."
      />
    </div>
  );
}
