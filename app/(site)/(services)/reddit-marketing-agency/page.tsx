import type { Metadata } from "next";
import Link from "next/link";
import Hero from "@/components/pages/reddit/hero";
import Services from "@/components/pages/reddit/services";
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

const TITLE = "Reddit Marketing Agency for Developer Tools";
const DESCRIPTION =
  "Reddit marketing agency for devtools: subreddit research, technical posts, and launch threads developers upvote. 304K+ impressions for Entelligence AI.";

const linkClass =
  "font-medium text-[#141414] underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: "/reddit-marketing-agency",
    locale: DEFAULT_LOCALE,
    keywords: [
      "Reddit marketing agency",
      "Reddit marketing for developer tools",
      "Reddit marketing for SaaS",
      "Reddit marketing services",
      "Reddit marketing strategy",
      "developer community marketing",
    ],
  });
}

const redditFaqItems: FAQItem[] = [
  {
    question: "What does a Reddit marketing agency do?",
    answer:
      "It gets your product into the subreddits where your buyers talk, without getting removed or ignored. For developer tools, Studio1 finds the right subreddits, turns your blogs, demos, and launches into technical posts that stand on their own, and stays in the comments to answer questions. For Entelligence AI, that approach drove 304K+ Reddit impressions.",
  },
  {
    question: "Does Reddit marketing work for developer tools?",
    answer:
      "Yes, when the post is useful on its own. Developers on Reddit ignore pitches but engage with real technical problems, benchmarks, and demos they can try. One discussion-led post for Entelligence AI in r/LLMDevs reached 205K views and 278 upvotes, and Memori's launch post reached 50K+ views.",
  },
  {
    question: "Which subreddits do you post in?",
    answer:
      "The ones your users already read, which depends on your product. For AI and devtool clients that has meant communities like r/LLMDevs and subreddits about AI agents, MCP, and LLMs. We check each subreddit's rules on self-promotion before anything goes live.",
  },
  {
    question: "Will our posts get removed?",
    answer:
      "Each subreddit sets its own rules, and many limit self-promotion. We read them first, lead with the problem rather than the product, say who we are when it matters, and never paste the same link everywhere. Posts that follow the rules and add something useful are far less likely to be removed.",
  },
  {
    question: "Do you buy upvotes or use fake accounts?",
    answer:
      "No. Vote manipulation and fake accounts get posts removed and brands banned, and developers notice. Our results come from posts people chose to upvote and comment on.",
  },
  {
    question: "Is this Reddit ads or organic?",
    answer:
      "Our work is organic: posts, comments, and community engagement that earn attention on their own. The same posts often become the threads developers find later when they search for your category.",
  },
  {
    question: "How do you measure Reddit marketing results?",
    answer:
      "We track views, upvotes, upvote ratio, and comments for every post, then look past them to what developers did next: clicks to docs, signups, GitHub stars, and the questions they asked. Comments are often the most useful output, because they show what to fix or write next.",
  },
  {
    question: "Does Reddit help with Google and AI answers?",
    answer:
      "Often. Reddit threads regularly show up in Google results and AI answers when developers compare tools, so a useful thread that names your product keeps working long after it is posted. Our AEO service tracks which threads AI tools cite for your category.",
  },
  {
    question: "How long does Reddit marketing take to work?",
    answer:
      "A single post can do well on day one, but a reliable presence takes a few months of steady posting and commenting in the same communities, so people start to recognize the name and trust the answers.",
  },
];

const redditWorkflow = [
  {
    title: "Find the subreddits",
    description:
      "We map the communities where your users ask questions, compare tools, and share what they built.",
    points: [
      "Subreddits by use case and stack",
      "Size, activity, and moderation",
      "Threads naming your competitors",
      "Questions you can answer",
    ],
  },
  {
    title: "Learn the room",
    description:
      "Before posting, we read each subreddit's rules and recent top posts to see what the community rewards.",
    points: [
      "Self-promotion rules",
      "Top post formats",
      "Flair and posting days",
      "Moderator expectations",
    ],
  },
  {
    title: "Write native posts",
    description:
      "We adapt your blogs, demos, and launches into posts that open with the problem and stand on their own.",
    points: [
      "Problem-first titles",
      "Code, benchmarks, and demos",
      "One post per community, not copies",
      "Links only where they help",
    ],
  },
  {
    title: "Stay in the comments",
    description:
      "Fast replies from people who know the product turn a post into a conversation, and a launch into feedback.",
    points: [
      "Quick, useful replies",
      "Answers in existing threads",
      "Questions logged for docs",
      "Feedback passed to your team",
    ],
  },
  {
    title: "Measure and repeat",
    description:
      "We track every post and what developers did next, then double down on the angles and subreddits that work.",
    points: [
      "Views, upvotes, and comments",
      "Clicks, signups, and stars",
      "Angles that started discussion",
      "Next month's post plan",
    ],
  },
];

const redditCaseStudyProofs: CaseStudyResultData[] = [
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
    company: "Memori",
    category: "Reddit Launch & Community",
    href: "/case-studies/memori",
    heroValue: "50K+",
    heroLabel: "impressions on the Reddit launch post",
    proof:
      "A launch post with 85+ upvotes, then a thought-leadership thread with 100+ detailed developer comments that shaped onboarding and the roadmap.",
    stats: [
      { value: "85+", label: "launch upvotes" },
      { value: "100+", label: "comments on one thread" },
      { value: "12,000+", label: "GitHub stars, launch to today" },
    ],
  },
  {
    company: "Nebius",
    category: "Subreddit Distribution",
    href: "/case-studies/nebius",
    heroValue: "12",
    heroLabel: "posts across AI, agent, MCP, and LLM subreddits",
    proof:
      "Technical posts adapted for communities already discussing each topic, reaching hundreds of thousands of Reddit views. Several were featured in developer newsletters.",
    stats: [
      { value: "44K", label: "views on one DeepSeek R1 post" },
      { value: "221", label: "upvotes on that post" },
      { value: "12", label: "subreddit posts" },
    ],
  },
];

export default function Page() {
  const serviceSchema = serviceJsonLd({
    name: "Reddit Marketing Agency for Developer Tools",
    description: DESCRIPTION,
    path: "/reddit-marketing-agency",
    serviceType: "Reddit Marketing",
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
                name: "Reddit Marketing Agency",
                path: "/reddit-marketing-agency",
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
        name="How we run Reddit"
        title="From the right subreddit to a thread that keeps working"
        description="Five steps we run for developer tools on Reddit, from finding the communities to proving what each post did."
        steps={redditWorkflow}
        workflow="reddit-posts.yml"
      />
      <StoryProof
        index={3}
        title="Reddit marketing case studies"
        description="Technical posts, launch threads, and community discussions for developer tools, with the numbers from each post."
        studies={redditCaseStudyProofs}
      />
      <PaperSection tone="paper">
        <Container>
          <PaperServiceFaq
            index={4}
            subtitle="Common questions about Reddit marketing for developer tools."
            items={redditFaqItems}
          />
          <p className="mt-8 text-center text-[15px] text-[var(--p-muted)]">
            Read our{" "}
            <Link
              href="/blog/reddit-marketing-for-developer-tools"
              className={linkClass}
            >
              Reddit marketing guide
            </Link>{" "}
            and{" "}
            <Link
              href="/blog/how-to-distribute-technical-content-reddit-x-youtube"
              className={linkClass}
            >
              distribution playbook
            </Link>
            , or see our{" "}
            <Link href="/aeo-agency" className={linkClass}>
              AEO agency service
            </Link>
            .
          </p>
        </Container>
      </PaperSection>
      <PaperCta
        index={5}
        title="Ready to Show Up on Reddit?"
        description="Subreddit research, technical posts, launch threads, and community engagement for developer tools."
      />
    </div>
  );
}
