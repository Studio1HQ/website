import type { Metadata } from "next";
import Link from "next/link";
import Hero from "@/components/pages/aeo/hero";
import Services from "@/components/pages/aeo/services";
import type { FAQItem } from "@/components/landing/faq";
import { Container } from "@/components/home/ui";
import { PaperCta, PaperSection } from "@/components/paper/paper-sections";
import { PaperServiceFaq } from "@/components/pages/shared/paper-service-kit";
import {
  StoryCards,
  StoryLogos,
} from "@/components/pages/shared/service-story";
import { PAPER_SCOPE } from "@/lib/paper";
import { breadcrumbJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";
import { DEFAULT_LOCALE } from "@/lib/i18n";

const TITLE = "AEO Agency for Developer Tools";
const DESCRIPTION =
  "AEO agency for developer tools and AI products: we audit what ChatGPT, Perplexity, and Google AI say about you, then fix the pages and sources behind it.";

const linkClass =
  "font-medium text-[#141414] underline decoration-[#141414]/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-[#f97316]";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: "/aeo-agency",
    locale: DEFAULT_LOCALE,
    keywords: [
      "AEO agency",
      "answer engine optimization agency",
      "AEO for developer tools",
      "AI visibility",
      "get recommended by ChatGPT",
      "generative engine optimization",
    ],
  });
}

const aeoFaqItems: FAQItem[] = [
  {
    question: "What does an AEO agency do?",
    answer:
      "AEO, or answer engine optimization, is the work of getting your product named and cited in AI answers from ChatGPT, Perplexity, Gemini, and Google AI Overviews. An AEO agency measures where you show up today, finds why you're missing, and fixes it with better pages, docs, and third-party sources. Studio1 does this for developer tools, AI products, and B2B SaaS.",
  },
  {
    question: "Why does AEO matter for developer tools?",
    answer:
      "Developers now ask AI tools which library, API, or platform to use before they search. In Stack Overflow's 2026 Developer Survey, 70% of developers said they look for answers by asking an AI agent. If those answers name your competitors and not you, you lose the evaluation before it starts.",
  },
  {
    question: "How is AEO different from SEO?",
    answer:
      "SEO earns a ranking; AEO earns a mention inside the answer. They overlap, because AI tools often build answers from pages that already rank well. AEO adds the parts SEO skips: tracking prompts instead of keywords, writing direct answers AI can quote, and earning mentions in the lists, threads, and reviews AI tools cite.",
  },
  {
    question: "How do you measure AI visibility?",
    answer:
      "We write 12 to 15 prompts developers would actually type, across category, problem, comparison, and brand questions. Each prompt runs several times in each AI tool, and every answer is scored as recommended, cited, mentioned, or absent. We also record which competitors and sources were named, so every lost prompt has a cause.",
  },
  {
    question: "How long does AEO take to show results?",
    answer:
      "It depends on the AI tool. Answers from tools that search the web can change soon after a fixed page is crawled, while answers drawn from a model's training data change slowly. That's why we rerun the same prompts after each round of changes, so you see what moved instead of guessing.",
  },
  {
    question: "Can you guarantee ChatGPT will recommend us?",
    answer:
      "No. Nobody controls what an AI tool says, and answers vary from one run to the next. We make your product easier to find, easier to quote, and more often named by the sources AI tools rely on, and we measure the change prompt by prompt.",
  },
  {
    question: "Do we need llms.txt or schema markup?",
    answer:
      "They help, but they rarely fix visibility on their own. Crawler access, direct answers on your key pages, strong docs, and mentions in third-party sources matter more. We add llms.txt and structured data as part of the work, not as the whole plan.",
  },
  {
    question: "Should we block GPTBot or other AI crawlers?",
    answer:
      "Only if you mean to. Many sites block AI crawlers by accident through a CDN or managed robots.txt setting. Training crawlers and search crawlers are separate: OpenAI's GPTBot is used for training and OAI-SearchBot for search, so you can allow one and block the other. We check what your robots.txt and CDN actually serve.",
  },
  {
    question: "Does AEO work with our existing SEO and content?",
    answer:
      "Yes. Most fixes improve pages you already have: a clearer first paragraph, an FAQ, a comparison page, a better quickstart. If we also write your technical content, the AEO findings decide what we write next.",
  },
];

const aeoWorkflow = [
  {
    title: "Map the prompts",
    description:
      "We write the questions developers actually ask AI tools about your category, your problem, your competitors, and your brand.",
    points: [
      "Category and best-of prompts",
      "Problem and how-to prompts",
      "Comparison and alternatives prompts",
      "Brand and review prompts",
    ],
  },
  {
    title: "Measure the baseline",
    description:
      "Each prompt runs several times in each AI tool. Every answer gets a score and a list of who was named instead of you.",
    points: [
      "Repeated runs per tool",
      "Recommended, cited, mentioned, absent",
      "Sources each answer cited",
      "Google rank alongside",
    ],
  },
  {
    title: "Open the doors",
    description:
      "We check that AI crawlers can reach your site, and that the pages they need are easy to find and read.",
    points: [
      "robots.txt and CDN bot settings",
      "llms.txt and sitemaps",
      "Pages that render without JavaScript",
      "Canonical and duplicate pages",
    ],
  },
  {
    title: "Fix and publish",
    description:
      "For each lost prompt we name the cause, then fix the page, publish the missing one, or earn the third-party source.",
    points: [
      "Direct answers on key pages",
      "New guides for true gaps",
      "Comparison and docs updates",
      "Outreach to lists and threads",
    ],
  },
  {
    title: "Rerun and report",
    description:
      "We rerun the same prompts after changes land and report what moved, prompt by prompt, with the next fixes ranked.",
    points: [
      "Before and after for each prompt",
      "Your share of answers against rivals",
      "Citations to your own pages",
      "Next fixes, ranked by demand",
    ],
  },
];

export default function Page() {
  const serviceSchema = serviceJsonLd({
    name: "AEO Agency for Developer Tools",
    description: DESCRIPTION,
    path: "/aeo-agency",
    serviceType: "Answer Engine Optimization",
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
              { name: "AEO Agency", path: "/aeo-agency" },
            ]),
          ),
        }}
      />
      <Hero />
      <StoryLogos />
      <Services />
      <StoryCards
        index={2}
        name="How we run AEO"
        title="From the prompts developers ask to the answers they get"
        description="Five steps we run for developer tools, from mapping the prompts that matter to proving what moved."
        steps={aeoWorkflow}
        workflow="aeo-audit.yml"
      />
      <PaperSection tone="paper">
        <Container>
          <PaperServiceFaq
            index={3}
            subtitle="Common questions about answer engine optimization for developer tools."
            items={aeoFaqItems}
          />
          <p className="mt-8 text-center text-[15px] text-[var(--p-muted)]">
            Want to try it yourself? Read{" "}
            <Link
              href="/blog/how-to-measure-devtool-visibility-in-ai-answers"
              className={linkClass}
            >
              how to measure your AI visibility
            </Link>{" "}
            and{" "}
            <Link
              href="/blog/how-to-get-your-tool-recommended-by-chatgpt-perplexity-google"
              className={linkClass}
            >
              how to get recommended by ChatGPT
            </Link>
            .
          </p>
        </Container>
      </PaperSection>
      <PaperCta
        index={4}
        title="Ready to Show Up in AI Answers?"
        description="AI visibility audits, answer-ready pages and docs, and third-party citations for developer tools."
      />
    </div>
  );
}
