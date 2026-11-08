import React from "react";
import type { Metadata } from "next";
import Hero from "@/components/pages/content-creation/hero";
import Services from "@/components/pages/content-creation/services";
import Packaging from "@/components/pages/content-creation/packaging";
import Formats from "@/components/pages/content-creation/formats";
import Cadence from "@/components/pages/content-creation/cadence";
// import ProjectDemo from "@/components/pages/content-creation/project-demo";
import { breadcrumbJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";
import type { FAQItem } from "@/components/landing/faq";
import { Container } from "@/components/home/ui";
import { PaperSection } from "@/components/paper/paper-sections";
import { PaperServiceFaq } from "@/components/pages/shared/paper-service-kit";
import { PAPER_SCOPE } from "@/lib/paper";
import {
  StoryCards,
  StoryLogos,
  StoryProof,
} from "@/components/pages/shared/service-story";
import type { CaseStudyResultData } from "@/components/case-studies/case-study-result";
import { PaperCta } from "@/components/paper/paper-sections";
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
      "developer demo videos",
      "developer video agency",
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

const videoCaseStudyProofs: CaseStudyResultData[] = [
  {
    company: "Memori",
    category: "Demo Agents and Launch Video",
    href: "/case-studies/memori",
    heroValue: "12",
    heroLabel: "hands-on demo agents shipped",
    proof:
      "Demo agents that showed Memori working in real workflows, packaged with a launch video on X and amplified through Studio1's Awesome AI Apps repo.",
    stats: [
      { value: "12K+", label: "GitHub stars" },
      { value: "12", label: "demo agents" },
      { value: "50K+", label: "Reddit launch impressions" },
    ],
  },
  {
    company: "ScrapeGraphAI",
    category: "AI Agent Demos",
    href: "/case-studies/scrapegraph",
    heroValue: "265K+",
    heroLabel: "social and community reach from demo-led content",
    proof:
      "Practical AI agent demos and visual explainers built around ScrapeGraphAI's real use cases, shared across social and developer communities.",
    stats: [
      { value: "265K+", label: "overall reach" },
      { value: "Demos", label: "AI agent projects" },
      { value: "Live", label: "event activation" },
    ],
  },
  {
    company: "Corsair",
    category: "Demo Apps and Walkthrough Videos",
    href: "/case-studies/corsair",
    heroValue: "2K+",
    heroLabel: "GitHub stars, up from about 300 in five weeks",
    proof:
      "Open-source demo apps, Brieflane and SlideFlow, that showed Corsair inside real workflows, shared with a walkthrough video developers could follow.",
    stats: [
      { value: "2", label: "open-source demo apps" },
      { value: "Video", label: "demo walkthrough" },
      { value: "5 weeks", label: "about 300 to 2,000 stars" },
    ],
  },
];

const videoFaqItems: FAQItem[] = [
  {
    question: "What does a developer video and demo agency do?",
    answer:
      "It plans, builds, and produces the videos developers use to judge a tool: product demos, coding tutorials, walkthroughs of a working demo project, and Shorts for launches. Studio1 does this for devtool and AI teams with engineers who build the demo app first, then script, record, and edit around it. For Memori that meant 12 hands-on demo agents and a launch video, and for Corsair two open-source demo apps with a walkthrough video.",
  },
  {
    question: "Why hire a developer video agency instead of a general video studio?",
    answer:
      "Developers stop watching when the code on screen is fake or skips steps. A developer video agency builds a real project, runs it on camera, and keeps the repo public so viewers can clone it. General studios usually need your engineers to write the demo and check every frame, which is the time you were trying to save.",
  },
  {
    question: "Do you make product demo videos for developer tools?",
    answer:
      "Yes. We script, record, and edit demo videos that show your tool working in a real workflow, and we can build the demo project itself so developers can clone the repo and follow along.",
  },
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
  const serviceSchema = serviceJsonLd({
    name: "Developer Video and Demo Production",
    description:
      "Developer video and demo production for AI and devtool startups: product demo videos, coding tutorials, demo projects, scripts, edits, thumbnails, Shorts, and upload-ready assets.",
    path: "/developer-video-production",
    serviceType: "Developer Video Production",
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
                name: "Developer Video and Demo Agency",
                path: "/developer-video-production",
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
        name="Video production scope"
        title="Technical videos that developers can actually learn from"
        description="We produce walkthroughs, shorts, demo projects, repo-led videos, and supporting assets for developer brands."
        steps={videoWorkstreams}
        workflow="video-production.yml"
      />
      {/* <ProjectDemo /> */}
      <StoryProof
        index={3}
        title="Developer video and demo case studies"
        description="Videos, demo agents, and launch clips built around products developers could run."
        studies={videoCaseStudyProofs}
      />
      <Packaging index={4} />
      <Formats index={5} />
      <Cadence index={6} />
      <PaperSection tone="paper">
        <Container>
          <PaperServiceFaq
            index={7}
            subtitle="Common questions about our developer video production services."
            items={videoFaqItems}
          />
        </Container>
      </PaperSection>
      <PaperCta
        index={8}
        title="Ready to Make Videos Developers Learn From?"
        description="Technical demos, tutorials, scripts, edits, shorts, and upload-ready assets for developer brands."
      />
    </div>
  );
}
