import React from "react";
import type { Metadata } from "next";
import Hero from "@/components/pages/docs-as-a-service/hero";
import Services from "@/components/pages/docs-as-a-service/services";
import Process from "@/components/pages/docs-as-a-service/process";
import FAQ, { type FAQItem } from "@/components/landing/faq";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import {
  ServiceDetailSection,
  ServiceProofSection,
} from "@/components/pages/shared/service-detail-sections";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({
    locale: DEFAULT_LOCALE,
    namespace: "Metadata.services.docs",
  });

  return pageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/developer-documentation-dx-audit",
    locale: DEFAULT_LOCALE,
    keywords: [
      "docs as a service",
      "docs audit",
      "developer documentation",
      "DX improvements",
      "API documentation",
      "developer experience audit",
    ],
  });
}

const docsFaqItems: FAQItem[] = [
  {
    question: "What do Developer Documentation & DX Audit Services include?",
    answer:
      "Four connected workstreams: editing existing documentation, writing missing documentation from scratch, docs audits, and developer experience audits across docs, APIs, SDKs, onboarding, dashboards, and developer-facing product surfaces. You can start with any one or run them together.",
  },
  {
    question: "What does a docs audit deliver?",
    answer:
      "A findings report with prioritized friction points, evidence from walking the product as a new developer, and a practical roadmap for what to write, rewrite, or improve first. The goal is faster time-to-first-success.",
  },
  {
    question: "Who writes the documentation?",
    answer:
      "Engineers and technical writers matched to your stack. Every page includes real code examples, goes through technical review, and incorporates your team's feedback before it is considered done.",
  },
  {
    question: "What counts as a DX improvement?",
    answer:
      "Anything that shortens or clarifies the path to first success: clearer onboarding, API key setup, SDK examples, docs navigation, dashboard flows, playground behavior, error states, developer-facing landing-page clarity, and follow-up reviews tied to activation signals.",
  },
  {
    question: "Do you do landing page copywriting?",
    answer:
      "Not as a pure marketing copywriting service. We review landing pages from the developer perspective: whether the product is technically clear, whether docs and SDK paths are easy to find, and whether the path from interest to first request makes sense.",
  },
  {
    question: "Can you work inside our existing docs site?",
    answer:
      "Yes. We write for Mintlify, Docusaurus, GitBook, custom Next.js docs, and similar setups. We match your information architecture and contribution process rather than forcing a new tool.",
  },
  {
    question: "How is this different from technical content marketing?",
    answer:
      "Blog content is for discovery on the open web. Docs are product surfaces: onboarding, reference, and task completion. We treat them as product work with activation and support metrics, not just traffic.",
  },
  {
    question: "How long does an engagement take?",
    answer:
      "A focused docs audit typically lands in 2 to 3 weeks. Documentation and DX improvements then ship against the roadmap on a steady cadence. Scope depends on product surface area.",
  },
  {
    question: "How do you measure success?",
    answer:
      "We look at time-to-first-success, docs usefulness and search, support ticket themes, and activation steps tied to documented flows. Reports stay tied to the friction you asked us to remove.",
  },
];

const docsWorkstreams = [
  {
    title: "Editing existing documentation",
    description:
      "If your docs already exist, we improve structure, clarity, accuracy, examples, and developer flow without forcing a full rewrite.",
    points: [
      "Rewrite confusing pages",
      "Update stale SDK and API examples",
      "Improve navigation and information architecture",
      "Make quickstarts easier to complete",
    ],
  },
  {
    title: "Writing docs from scratch",
    description:
      "For new products or new features, we can build the documentation foundation from a product walkthrough, API surface, SDK, or engineering notes.",
    points: [
      "Getting-started guides",
      "API and SDK references",
      "Concept pages",
      "How-to and integration guides",
    ],
  },
  {
    title: "Docs completeness audit",
    description:
      "We audit whether the docs cover the paths a developer needs: setup, authentication, SDK usage, API behavior, errors, integrations, and next steps.",
    points: [
      "Missing-page inventory",
      "Broken or outdated examples",
      "Reference coverage gaps",
      "Developer journey gaps",
    ],
  },
  {
    title: "Platform DX audit",
    description:
      "We review the developer experience beyond docs: dashboard flows, onboarding, API key setup, playgrounds, landing-page developer clarity, and handoff between product and docs.",
    points: [
      "Dashboard onboarding flow",
      "API key and first request path",
      "Playground and sample app clarity",
      "Developer-facing landing page accuracy",
    ],
  },
  {
    title: "Developer-perspective feedback",
    description:
      "We test the experience like a new developer, then turn friction into a prioritized roadmap your team can ship against.",
    points: [
      "Time-to-first-success review",
      "Support-ticket theme mapping",
      "Actionable findings report",
      "Priority roadmap for fixes",
    ],
  },
  {
    title: "Implementation support",
    description:
      "After the audit, we can write or edit the docs, update examples, restructure sections, and help your team keep the docs accurate as the product changes.",
    points: [
      "Docs editing and new pages",
      "Example and snippet updates",
      "Follow-up review cycles",
      "Contribution workflow guidance",
    ],
  },
];

const litellmProof = {
  company: "LiteLLM",
  category: "Docs & Developer Onboarding",
  href: "/case-studies/litellm",
  heroValue: "SDK + Gateway",
  heroLabel: "onboarding clarified",
  proof:
    "Studio1 revamped LiteLLM's docs across SDK and Gateway paths, added focused quickstarts, improved information architecture, and turned community questions into a DX feedback loop.",
  stats: [
    { value: "SDK", label: "quickstart path" },
    { value: "Gateway", label: "quickstart path" },
    { value: "CEO", label: "public endorsement" },
  ],
};

export default function Page() {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Developer Documentation & DX Audit Services",
    description:
      "Developer documentation and DX audit services for AI and DevTool products: onboarding reviews, API clarity, quickstarts, reference docs, and a clearer path to first success.",
    provider: {
      "@type": "Organization",
      name: "Studio1",
      url: "https://studio1hq.com",
    },
    serviceType: "Developer Documentation, Docs Audit, and DX Improvements",
    areaServed: "Worldwide",
    url: "https://studio1hq.com/developer-documentation-dx-audit",
  };

  return (
    <div className="">
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
                name: "Developer Documentation & DX Audit Services",
                path: "/developer-documentation-dx-audit",
              },
            ]),
          ),
        }}
      />
      <Hero />
      <Services />
      <ServiceDetailSection
        eyebrow="Documentation and DX scope"
        title="We improve the full developer path, not just the words"
        description="We edit docs, write missing pages, and audit developer journeys across docs, APIs, SDKs, dashboards, and onboarding."
        items={docsWorkstreams}
        columns="three"
      />
      <Process />
      <ServiceProofSection
        title="Docs that became a developer onboarding engine"
        description="LiteLLM focused on docs architecture, quickstarts, integrations, and community feedback."
        study={litellmProof}
      />
      <FAQ
        subtitle="Common questions about our developer documentation and DX audit services."
        items={docsFaqItems}
      />
    </div>
  );
}
