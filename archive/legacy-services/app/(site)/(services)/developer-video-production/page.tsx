import React from "react";
import type { Metadata } from "next";
import Hero from "@/components/pages/content-creation/hero";
import Services from "@/components/pages/content-creation/services";
import Packaging from "@/components/pages/content-creation/packaging";
import Formats from "@/components/pages/content-creation/formats";
import Cadence from "@/components/pages/content-creation/cadence";
// import ProjectDemo from "@/components/pages/content-creation/project-demo";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { ServiceDetailSection } from "@/components/pages/shared/service-detail-sections";
import FAQ, { type FAQItem } from "@/components/landing/faq";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({
    locale: DEFAULT_LOCALE,
    namespace: "Metadata.services.video",
  });

  return pageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/developer-video-production",
    locale: DEFAULT_LOCALE,
    keywords: [
      "content creation",
      "developer video production",
      "DevTool product demos",
      "technical YouTube videos",
      "technical video demos",
    ],
  });
}

const videoWorkstreams = [
  {
    title: "Long-form technical videos",
    description:
      "Product walkthroughs, tutorials, and implementation videos that help developers understand how your product works.",
    points: [
      "Developer tutorials",
      "Product demos",
      "Project walkthroughs",
      "Technical explainers",
    ],
  },
  {
    title: "Shorts and cutdowns",
    description:
      "We turn longer technical ideas into concise clips for social channels without losing the technical point.",
    points: [
      "Short-form product clips",
      "Launch teasers",
      "Feature highlights",
      "Developer-friendly captions",
    ],
  },
  {
    title: "Channel series",
    description:
      "For teams that want a recurring video motion, we help plan repeatable topics, formats, and publishing support.",
    points: [
      "Series planning",
      "Topic calendar",
      "Title and description support",
      "Publishing workflow",
    ],
  },
  {
    title: "Demo projects and repo-led videos",
    description:
      "We can build a small technical project, publish the repo, and create a video around the workflow so developers can inspect and try it.",
    points: [
      "Demo project build",
      "GitHub repo packaging",
      "Video script and walkthrough",
      "Supporting README or guide",
    ],
  },
  {
    title: "Campaign-ready video production",
    description:
      "For launch or education campaigns, video can sit alongside a blog, repo, and social posts so the same technical story reaches developers across channels.",
    points: [
      "One technical video",
      "One supporting blog",
      "One demo repo",
      "Social distribution assets",
    ],
  },
  {
    title: "Packaging and publishing",
    description:
      "We can handle the details around technical videos: scripts, edits, thumbnails, titles, descriptions, chapters, and upload support.",
    points: [
      "Script and storyboard",
      "Editing and motion polish",
      "Thumbnail and title options",
      "SEO metadata and chapters",
    ],
  },
];

const videoFaqItems: FAQItem[] = [
  {
    question: "What kind of developer videos do you produce?",
    answer:
      "We produce long-form tutorials, product demos, project walkthroughs, technical explainers, Shorts, cutdowns, and recurring video formats for developer products.",
  },
  {
    question: "Can you build a demo project for the video?",
    answer:
      "Yes. For repo-led videos or campaigns, we can build a demo project, package the GitHub repo, write the supporting README or guide, and produce the video around the workflow.",
  },
  {
    question: "Can video be part of a larger campaign?",
    answer:
      "Yes. A campaign can pair one technical video with a blog, demo repo, and social posts so the same developer story reaches multiple channels.",
  },
  {
    question: "Do you handle packaging and publishing?",
    answer:
      "Yes. We can support scripts, editing, thumbnails, titles, descriptions, chapters, Shorts, and upload-ready publishing assets.",
  },
];

export default function Page() {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Developer Video Production Services",
    description:
      "Developer video production services for AI and DevTool startups: technical demos, tutorials, scripts, edits, thumbnails, Shorts, and upload-ready assets.",
    provider: {
      "@type": "Organization",
      name: "Studio1",
      url: "https://studio1hq.com",
    },
    serviceType: "Developer Video Production",
    areaServed: "Worldwide",
    url: "https://studio1hq.com/developer-video-production",
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
                name: "Developer Video Production Services",
                path: "/developer-video-production",
              },
            ]),
          ),
        }}
      />
      <Hero />
      <Services />
      <ServiceDetailSection
        id="work"
        eyebrow="Video production scope"
        title="Technical videos that developers can actually learn from"
        description="We produce walkthroughs, shorts, demo projects, repo-led videos, and supporting assets for developer brands."
        items={videoWorkstreams}
        columns="three"
      />
      {/* <ProjectDemo /> */}
      <Packaging />
      <Formats />
      <Cadence />
      <FAQ
        subtitle="Common questions about our developer video production services."
        items={videoFaqItems}
      />
    </div>
  );
}
