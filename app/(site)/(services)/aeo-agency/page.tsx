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
  "AEO agency for developer tools: answer-ready content, docs, and llms.txt that ChatGPT, Perplexity, and Google AI can quote, and checks that you show up.";

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
      "AEO, or answer engine optimization, is the work of getting your product named and cited in AI answers from ChatGPT, Perplexity, Gemini, and Google AI Overviews. An AEO agency makes your product easier for AI tools to find and quote. Studio1 does it mainly through content for devtool, AI, and open-source teams: answer-ready pages, comparisons, tutorials, and docs, plus llms.txt and structured data, and we check AI tools to see whether your pages show up.",
  },
  {
    question: "Why does AEO matter for developer tools?",
    answer:
      "Developers now ask AI tools which library, API, or platform to use before they search. In the Stack Overflow 2026 Developer Survey, 69.9% of developers said they ask an AI agent when they need an answer. If those answers name your competitors and not you, you lose the evaluation before it starts.",
  },
  {
    question: "How is AEO different from SEO?",
    answer:
      "SEO earns a ranking; AEO earns a mention inside the answer. They overlap, because AI tools often build answers from pages that already rank well. AEO adds direct answers AI can quote, clear comparison and docs pages, and checking what AI tools actually say, not only where you rank.",
  },
  {
    question: "How do you check AI visibility?",
    answer:
      "We ask ChatGPT, Perplexity, and Google AI the questions your buyers ask, and note whether your pages or posts show up and who is named instead. Those checks decide what we write next. They are spot checks, not a guarantee, because AI answers change from one run to the next.",
  },
  {
    question: "How long does AEO take to show results?",
    answer:
      "It depends on the AI tool. Answers from tools that search the web can change soon after a fixed page is crawled, while answers drawn from a model's training data change slowly. That's why we check again after new pages are live, rather than judging the work on day one.",
  },
  {
    question: "Can you guarantee ChatGPT will recommend us?",
    answer:
      "No. Nobody controls what an AI tool says, and answers vary from one run to the next. We make your product easier to find and easier to quote, and we check whether your pages show up.",
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
    title: "Find the questions",
    description:
      "We list the questions developers ask about your category, your problem, and your competitors, and look at which pages answer them today.",
    points: [
      "Category and best-of questions",
      "How-to and problem questions",
      "Comparisons and alternatives",
      "Questions about your product",
    ],
  },
  {
    title: "Make the site readable",
    description:
      "We make sure AI tools can reach your pages and read them easily, so the content you publish can be quoted.",
    points: [
      "llms.txt and sitemaps",
      "AI crawler access in robots.txt",
      "Pages that render without JavaScript",
      "FAQs and structured data",
    ],
  },
  {
    title: "Write the answers",
    description:
      "We write the pages AI tools quote: direct answers up top, comparison pages, tutorials, and docs that answer the how-to.",
    points: [
      "Direct answers on key pages",
      "Comparison and alternatives pages",
      "Tutorials and guides for gaps",
      "Docs and FAQ updates",
    ],
  },
  {
    title: "Check the answers",
    description:
      "We ask ChatGPT, Perplexity, and Google AI the same questions to see whether your pages show up, and plan the next pieces from what we find.",
    points: [
      "Checks across the main AI tools",
      "Which of your pages get cited",
      "Who gets named instead of you",
      "What to write next",
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
        title="From the questions developers ask to the pages AI tools quote"
        description="Four steps we run for developer tools, from finding the questions that matter to checking whether your pages show up."
        steps={aeoWorkflow}
        workflow="aeo-content.yml"
      />
      <PaperSection tone="paper">
        <Container>
          <PaperServiceFaq
            index={3}
            subtitle="Common questions about answer engine optimization for developer tools."
            items={aeoFaqItems}
          />
          <p className="mt-8 text-center text-[15px] text-[var(--p-muted)]">
            Want to try it yourself? Start with our{" "}
            <Link href="/blog/answer-engine-optimization-guide" className={linkClass}>
              AEO guide
            </Link>{" "}
            and{" "}
            <Link href="/blog/generative-engine-optimization-guide" className={linkClass}>
              GEO guide
            </Link>
            , then read{" "}
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
        title="Get Your Tool Into AI Answers"
        description="Answer-ready content, docs, and llms.txt for developer tools, plus checks on whether you show up."
      />
    </div>
  );
}
