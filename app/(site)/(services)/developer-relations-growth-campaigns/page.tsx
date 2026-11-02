import React from "react";
import Impact from "@/components/sections/devrel-as-service/impact";
import Services from "@/components/sections/devrel-as-service/services";
import Team from "@/components/sections/devrel-as-service/team";
import Process from "@/components/pages/devrel-as-a-service/process";
import DevRelPricing from "@/components/sections/devrel-as-service/pricing";
import type { Metadata } from "next";
import Hero from "@/components/pages/devrel-as-a-service/hero";
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
    namespace: "Metadata.services.devrel",
  });

  return pageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/developer-relations-growth-campaigns",
    locale: DEFAULT_LOCALE,
  });
}

const devrelFaqItems: FAQItem[] = [
  {
    question: "What do Developer Relations & Growth Campaigns include?",
    answer:
      "Our developer relations and growth service covers community building, developer education, advocacy, project tutorials, product launches, organic distribution, creator collaborations, integrations, and event support. We operate as an embedded extension of your team.",
  },
  {
    question: "How is this different from hiring an in-house DevRel team?",
    answer:
      "With Studio1, you get a hands-on DevRel team with writers, engineers, community managers, and advocates without the overhead of hiring, onboarding, and managing multiple roles. We ramp up fast, require minimal oversight, and stay leaner than building every function in-house.",
  },
  {
    question: "What kind of community building do you do?",
    answer:
      "We help set up, grow, and support developer communities on Discord, Slack, GitHub Discussions, forums, Reddit, X, LinkedIn, and event channels. This includes onboarding flows, engagement programs, developer replies, feedback loops, AMAs, hackathons, and community partnerships.",
  },
  {
    question: "Do you support hackathons and community collaborations?",
    answer:
      "Yes. We can help with hackathon collaborations, student community partnerships, tech community outreach, meetup support, and developer event partnerships, especially across India.",
  },
  {
    question: "How do you measure DevRel success?",
    answer:
      "We look at community growth and engagement, content reach, developer adoption signals, event feedback, GitHub activity, and product feedback surfaced from community conversations.",
  },
  {
    question: "Can you work alongside our existing DevRel team?",
    answer:
      "Absolutely. Most of our engagements complement existing DevRel or marketing teams. Your team handles product positioning while we handle execution: community programs, campaign coordination, launch support, creator management, and distribution at scale.",
  },
  {
    question: "What is the onboarding process like?",
    answer:
      "We start with a Discovery phase where we audit your existing developer programs, analyze community engagement, and identify growth opportunities. Within the first two weeks, we deliver an actionable assessment and a tailored DevRel roadmap aligned to your goals.",
  },
  {
    question: "Do you run growth campaigns and influencer programs?",
    answer:
      "Yes. We run multi-channel organic campaigns across X, LinkedIn, Reddit, YouTube, newsletters, and developer communities. For influencer management, we handle creator discovery, outreach, pricing, briefs, coordination, and reporting across X, LinkedIn, YouTube, and other relevant channels.",
  },
];

const devrelScope = [
  {
    title: "Embedded DevRel execution",
    description:
      "We can operate as a hands-on DevRel partner for product teams that need execution across content, community, open source, tutorials, and developer support.",
    points: [
      "Developer docs and technical content",
      "Project tutorials and walkthroughs",
      "Open-source maintenance support",
      "Community replies and feedback loops",
    ],
  },
  {
    title: "Integrations and partnerships",
    description:
      "We help identify integration opportunities, reach out to partner companies, coordinate collaboration, and turn ecosystem work into developer-facing tutorials.",
    points: [
      "Potential integration partner research",
      "Partner outreach and coordination",
      "Integration demos and examples",
      "Integration content and release support",
    ],
  },
  {
    title: "Community and hackathon partnerships",
    description:
      "We can support tech event, hackathon, student community, and developer community partnerships, especially across India where we have strong community access.",
    points: [
      "Hackathon collaboration support",
      "Student developer communities in India",
      "Meetup and event partnership outreach",
      "Community activation and follow-up",
    ],
  },
  {
    title: "Influencer management",
    description:
      "We manage developer creator campaigns end to end, from shortlisting creators to pricing, briefs, deliverables, and reporting.",
    points: [
      "X, LinkedIn, YouTube, and newsletter creators",
      "Creator discovery and vetting",
      "Pricing and negotiation support",
      "Campaign management and reporting",
    ],
  },
  {
    title: "One-month growth campaigns",
    description:
      "For launches or awareness pushes, we can run a campaign around one concrete technical story: a project, repo, tutorial, video, and social distribution.",
    points: [
      "Demo project or GitHub repo",
      "Technical blog or tutorial",
      "Project demo video",
      "Social posts across relevant channels",
    ],
  },
  {
    title: "Developer relations leadership support",
    description:
      "We help teams decide what to do next: which communities to enter, which partners to approach, what content to ship, and what signals to track.",
    points: [
      "DevRel roadmap and prioritization",
      "Community and channel strategy",
      "Partner and ecosystem mapping",
      "Growth and adoption reporting",
    ],
  },
];

const memoriProof = {
  company: "Memori",
  category: "Open-source Growth & DevRel",
  href: "/case-studies/memori",
  heroValue: "12,000+",
  heroLabel: "GitHub stars from launch",
  proof:
    "Studio1 supported Memori with early product-idea validation, community-led launches, thought leadership, demo content, live developer education, feedback loops, and selective developer collaborations.",
  stats: [
    { value: "50K+", label: "Reddit launch impressions" },
    { value: "100+", label: "developer comments" },
    { value: "150+", label: "meetup attendees" },
  ],
};

export default function DevRel() {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Developer Relations & Growth Campaigns",
    description:
      "Developer relations and growth campaigns for developer products: advocacy, community programs, product launches, organic distribution, and influencer management.",
    provider: {
      "@type": "Organization",
      name: "Studio1",
      url: "https://studio1hq.com",
    },
    serviceType: "Developer Relations and Growth Campaigns",
    areaServed: "Worldwide",
    url: "https://studio1hq.com/developer-relations-growth-campaigns",
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
                name: "Developer Relations & Growth Campaigns",
                path: "/developer-relations-growth-campaigns",
              },
            ]),
          ),
        }}
      />
      <Hero />
      <Services />
      <ServiceDetailSection
        eyebrow="DevRel and growth scope"
        title="The execution layer behind developer adoption"
        description="We support docs, content, social, open-source, partnerships, hackathons, creator campaigns, launches, and feedback loops."
        items={devrelScope}
        columns="three"
      />
      <Process />
      <ServiceProofSection
        title="Open-source growth through validation, demos, and meaningful collaborations"
        description="Memori combined early product validation, demo agents, community education, feedback loops, and relevant developer collaborations."
        study={memoriProof}
      />
      <FAQ
        subtitle="Common questions about our developer relations and growth campaign services."
        items={devrelFaqItems}
      />
      {/* <DevRelPricing /> */}
      {/* <PricingSection /> */}
      {/* <Team /> */}
    </div>
  );
}
