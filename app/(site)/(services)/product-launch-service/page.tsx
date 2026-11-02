import type { Metadata } from "next";
import Link from "next/link";
import Hero from "@/components/pages/product-launch/hero";
import Services from "@/components/pages/product-launch/services";
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

const TITLE = "Product Launch Service for Developer Tools";
const DESCRIPTION =
  "Product launch service for devtools: launch plan, demo video, and launch day on Reddit, Hacker News, and Product Hunt, plus a launch week that brings users.";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: "/product-launch-service",
    locale: DEFAULT_LOCALE,
    keywords: [
      "product launch service",
      "developer tool launch",
      "devtool launch agency",
      "launch week",
      "Product Hunt launch for developer tools",
      "Hacker News launch",
    ],
  });
}

const launchFaqItems: FAQItem[] = [
  {
    question: "What does a product launch service for developer tools include?",
    answer:
      "Studio1 plans the launch 4 to 6 weeks out, builds the demo video and launch posts, warms up your community, works launch day with your team across Reddit, Hacker News, X, LinkedIn, and Product Hunt, and runs the week after so the spike turns into users. The work is shaped around developers: things they can try, demos they can run, and replies from people who know the product.",
  },
  {
    question: "Who can run a Product Hunt launch for a developer tool?",
    answer:
      "Product Hunt is one channel in the launches we run, not a standalone service. When it fits the product, we prepare the listing, demo video, and maker comment, and work launch day with your team alongside Hacker News, Reddit, X, and LinkedIn. Webcrumbs finished #3 Product of the Day on its first Product Hunt launch with our guidance.",
  },
  {
    question: "How far ahead should we plan a developer tool launch?",
    answer:
      "Four to six weeks. That leaves time to decide what is new, make sure developers can try it without a waitlist, build the demo video and launch posts two to three weeks out, and warm up your users before the day.",
  },
  {
    question: "Which channels should a developer tool launch on?",
    answer:
      "The ones your users already read. Open-source and API products often do best on Hacker News and the right subreddits, because readers can try them on the spot. X and LinkedIn carry the launch to your network, and Product Hunt adds a day of early adopters and a public listing. Framing matters as much as the channel: for Memori, a Hacker News post framed around a debate developers were already having reached 136 points and 63 comments.",
  },
  {
    question: "Can you guarantee a top spot on launch day?",
    answer:
      "No. Hacker News, Reddit, and Product Hunt all rank on genuine engagement and remove votes they don't consider genuine. We never buy votes or ask for upvotes. We make the product easy to understand and try, then spend launch day replying to every comment.",
  },
  {
    question: "What happens after launch day?",
    answer:
      "The spike fades in a day, so we turn it into users: a recap and thank-you posts, docs and onboarding fixes from launch-day questions, follow-ups with commenters who asked about their use case, and comparison and tutorial content that keeps ranking. For Webcrumbs, comparison content for 'v0 alternative' searches kept bringing in developers long after launch week.",
  },
  {
    question: "Do you launch open-source projects?",
    answer:
      "Yes. For open-source projects the launch usually centers on GitHub, Hacker News, and Reddit. Memori's Reddit launch post reached 85+ upvotes and 50K+ impressions, backed by 12 hands-on demo agents.",
  },
];

const launchWorkflow = [
  {
    title: "Decide what you're launching",
    description:
      "Four to six weeks out, we pick the one thing that is new, check that developers can try it without a waitlist, and choose the date and channels.",
    points: [
      "Launch angle and one-line pitch",
      "Try-it-now check, no waitlist",
      "Launch date and channel plan",
      "Launch week sequencing",
    ],
  },
  {
    title: "Build the launch assets",
    description:
      "Two to three weeks out, a demo video, launch posts, and listings that explain the product in seconds, plus a landing page and quickstart that match.",
    points: [
      "Demo video and screenshots",
      "Launch post for each channel",
      "Product Hunt listing if it fits",
      "Landing page and quickstart check",
    ],
  },
  {
    title: "Warm up the community",
    description:
      "We tell the people who already care, and ask for feedback rather than upvotes.",
    points: [
      "Users, newsletter, and Discord or Slack",
      "Creator and community outreach",
      "Demo projects and use-case posts",
      "Show HN draft if the product fits",
    ],
  },
  {
    title: "Run launch day",
    description:
      "We work the day with your team: posts timed to when your developers are online, and a reply to every comment.",
    points: [
      "Hour-by-hour launch plan",
      "Reddit, Hacker News, X, and LinkedIn",
      "Replies to every comment",
      "Afternoon update post",
    ],
  },
  {
    title: "Turn the spike into users",
    description:
      "The week after, launch questions become docs fixes, commenters get follow-ups, and comparison content keeps working.",
    points: [
      "Recap and thank-you posts",
      "Docs and onboarding fixes",
      "Follow-ups with commenters",
      "Comparison and tutorial content",
    ],
  },
];

const launchCaseStudyProofs: CaseStudyResultData[] = [
  {
    company: "Memori",
    category: "Open-Source Launch",
    href: "/case-studies/memori",
    heroValue: "50K+",
    heroLabel: "impressions on the Reddit launch post",
    proof:
      "A community-led launch backed by 12 hands-on demo agents, with 100+ developer comments fed back into onboarding and docs.",
    stats: [
      { value: "85+", label: "Reddit upvotes" },
      { value: "12", label: "demo agents behind the launch" },
      { value: "12,000+", label: "GitHub stars, launch to today" },
    ],
  },
  {
    company: "Webcrumbs",
    category: "Launch Support",
    href: "/case-studies/webcrumbs",
    heroValue: "#3",
    heroLabel: "Product of the Day on its first Product Hunt launch",
    proof:
      "Launch guidance for Frontend AI by Webcrumbs with almost no prep time, plus comparison-led 'v0 alternative' content and distribution across DEV and Medium.",
    stats: [
      { value: "#3", label: "Product of the Day" },
      { value: "#5", label: "Product of the Week" },
      { value: "First", label: "launch ever" },
    ],
  },
  {
    company: "Nebius",
    category: "Launch-Day Support",
    href: "/case-studies/nebius",
    heroValue: "Day 0",
    heroLabel: "model launch support for Token Factory",
    proof:
      "Support across a product line: the Token Factory rebrand, a launch webinar, a day-0 model launch, and both Product Hunt launches.",
    stats: [
      { value: "Day 0", label: "model launch" },
      { value: "2", label: "Product Hunt launches" },
      { value: "29", label: "framework integrations" },
    ],
  },
  {
    company: "Permit.io",
    category: "Launch Support",
    href: "/case-studies/permit",
    heroValue: "300+",
    heroLabel: "upvotes on the Permit Share-If launch",
    proof:
      "Launch support for embeddable access-sharing components, on top of a content program with first-page guides like How to Implement RBAC in Supabase.",
    stats: [
      { value: "300+", label: "upvotes" },
      { value: "Page 1", label: "RBAC in Supabase guide" },
      { value: "Dev.to", label: "distribution" },
    ],
  },
];

export default function Page() {
  const serviceSchema = serviceJsonLd({
    name: "Product Launch Service for Developer Tools",
    description: DESCRIPTION,
    path: "/product-launch-service",
    serviceType: "Product Launch Marketing",
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
                name: "Product Launch Service",
                path: "/product-launch-service",
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
        name="How we run a launch"
        title="From launch plan to the week after"
        description="Five steps we run for developer tool launches, from deciding what is new to turning launch-day attention into users."
        steps={launchWorkflow}
        workflow="launch-week.yml"
      />
      <StoryProof
        index={3}
        title="Launch case studies"
        description="Community, Hacker News, and Product Hunt launches for developer tools, with the results to show for them."
        studies={launchCaseStudyProofs}
      />
      <PaperSection tone="paper">
        <Container>
          <PaperServiceFaq
            index={4}
            subtitle="Common questions about launching a developer tool."
            items={launchFaqItems}
          />
          <p className="mt-8 text-center text-[15px] text-[var(--p-muted)]">
            Launching on Product Hunt? Read{" "}
            <Link
              href="/blog/product-hunt-launch-playbook"
              className="font-medium text-[#141414] underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]"
            >
              how to launch a developer tool on Product Hunt
            </Link>
            .
          </p>
        </Container>
      </PaperSection>
      <PaperCta
        index={5}
        title="Ready to Launch Your Developer Tool?"
        description="Launch plans, demo videos, launch posts, launch-day support, and a launch week across Reddit, Hacker News, X, LinkedIn, and Product Hunt."
      />
    </div>
  );
}
