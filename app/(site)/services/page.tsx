import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenText,
  GithubLogo,
  PenNib,
  RedditLogo,
  RocketLaunch,
  ShareNetwork,
  Sparkle,
  UsersThree,
  VideoCamera,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import Hero from "@/components/pages/services-hub/hero";
import { StoryLogos } from "@/components/pages/shared/service-story";
import {
  Accent,
  IndexBar,
  PaperCta,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";
import { Container } from "@/components/home/ui";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { INK, PAPER_SCOPE, PRINT } from "@/lib/paper";
import { breadcrumbJsonLd, pageMetadata, pageUrl } from "@/lib/seo";

const TITLE = "Developer Marketing Services for Devtools";
const DESCRIPTION =
  "Studio1 services for devtool, AI, and open-source teams: technical content, docs, video, DevRel, GitHub growth, launches, Reddit, distribution, and AEO.";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: "/services",
    locale: DEFAULT_LOCALE,
    keywords: [
      "developer marketing services",
      "developer marketing agency",
      "DevRel agency services",
      "devtool marketing agency",
    ],
  });
}

type Service = {
  name: string;
  href: string;
  icon: Icon;
  description: string;
  /** One verified number from a case study; omitted when there is none. */
  proof?: { value: string; label: string };
};

const CONTENT: Service[] = [
  {
    name: "Technical Content Marketing",
    href: "/technical-content-marketing",
    icon: PenNib,
    description:
      "Engineer-written tutorials, integration guides, comparisons, and SEO articles.",
    proof: { value: "50+", label: "posts live on brightdata.com" },
  },
  {
    name: "Developer Video Production",
    href: "/developer-video-production",
    icon: VideoCamera,
    description:
      "Product demos, coding tutorials, Shorts, and demo projects developers can run.",
  },
  {
    name: "Documentation & DX Audits",
    href: "/developer-documentation-dx-audit",
    icon: BookOpenText,
    description:
      "Docs audits, onboarding reviews, and quickstarts that get developers to first success.",
    proof: { value: "2", label: "quickstart paths rebuilt for LiteLLM" },
  },
];

const GROWTH: Service[] = [
  {
    name: "Developer Relations & Growth",
    href: "/developer-relations-growth-campaigns",
    icon: UsersThree,
    description:
      "Developer advocacy, community programs, events, and creator campaigns.",
    proof: { value: "150+", label: "developers at a Memori meetup talk" },
  },
  {
    name: "GitHub Growth",
    href: "/github-growth-agency",
    icon: GithubLogo,
    description:
      "README and onboarding fixes, demos, and launches for open-source repos.",
    proof: { value: "12,000+", label: "GitHub stars for Memori" },
  },
  {
    name: "Product Launch",
    href: "/product-launch-service",
    icon: RocketLaunch,
    description:
      "Launch plans, demo videos, and launch-day support across developer channels.",
    proof: { value: "#3", label: "Product of the Day for Webcrumbs" },
  },
  {
    name: "Reddit Marketing",
    href: "/reddit-marketing-agency",
    icon: RedditLogo,
    description:
      "Subreddit research, technical posts, and launch threads developers upvote.",
    proof: { value: "304K+", label: "Reddit impressions for Entelligence" },
  },
  {
    name: "Content Distribution",
    href: "/developer-content-distribution",
    icon: ShareNetwork,
    description:
      "Every piece rebuilt for Reddit, X, LinkedIn, daily.dev, Dev.to, and YouTube.",
    proof: { value: "100K+", label: "OpenLore impressions in one month" },
  },
  {
    name: "AEO Agency",
    href: "/aeo-agency",
    icon: Sparkle,
    description:
      "AI visibility audits, answer-ready pages, and citations in ChatGPT, Perplexity, and Google AI.",
    proof: {
      value: "12/30",
      label: "Bright Data queries in Google's top five",
    },
  },
];

/** Common situations, each pointing at the service to start with. */
const STARTING_POINTS: { situation: string; name: string; href: string }[] = [
  {
    situation: "Developers find you but don't get started",
    name: "Documentation & DX Audits",
    href: "/developer-documentation-dx-audit",
  },
  {
    situation: "Your open-source repo has stalled",
    name: "GitHub Growth",
    href: "/github-growth-agency",
  },
  {
    situation: "You're launching in the next two months",
    name: "Product Launch",
    href: "/product-launch-service",
  },
  {
    situation: "AI answers name your competitors, not you",
    name: "AEO Agency",
    href: "/aeo-agency",
  },
];

const CARD = "rounded-[6px] bg-white/80 ring-1 ring-inset ring-[#141414]/10";

function ServiceCard({ service }: { service: Service }) {
  const ServiceIcon = service.icon;
  return (
    <Link
      href={service.href}
      className={`group flex h-full flex-col gap-8 p-6 transition-colors hover:bg-white ${CARD}`}
    >
      <span className="flex items-start justify-between">
        <span
          className="flex size-11 items-center justify-center text-[#f4efe7]"
          style={{ background: INK }}
        >
          <ServiceIcon className="size-5" />
        </span>
        <ArrowUpRight
          weight="bold"
          className="size-4 text-[#141414]/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#141414]"
        />
      </span>
      <span className="block">
        <span className="block text-[20px] font-medium leading-tight tracking-[-0.03em]">
          {service.name}
        </span>
        <span className="mt-2 block text-[14.5px] leading-[1.55] text-[#141414]/60">
          {service.description}
        </span>
      </span>
      {service.proof ? (
        <span className="mt-auto flex items-baseline gap-2 border-t border-[#141414]/10 pt-4">
          <span
            className="text-[22px] font-medium leading-none tracking-[-0.04em]"
            style={{ color: PRINT }}
          >
            {service.proof.value}
          </span>
          <span className="text-[13px] leading-snug text-[#141414]/60">
            {service.proof.label}
          </span>
        </span>
      ) : null}
    </Link>
  );
}

function ServiceGrid({ services }: { services: Service[] }) {
  return (
    <ul
      role="list"
      className="mt-10 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
    >
      {services.map((service) => (
        <li key={service.href} className="min-w-0">
          <ServiceCard service={service} />
        </li>
      ))}
    </ul>
  );
}

export default function ServicesPage() {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Studio1 services",
    itemListElement: [...CONTENT, ...GROWTH].map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: service.name,
      url: pageUrl(service.href),
    })),
  };

  return (
    <div className="overflow-x-clip" style={PAPER_SCOPE}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Services", path: "/services" },
            ]),
          ),
        }}
      />

      <Hero />
      <StoryLogos />

      <PaperSection tone="paper" className="!pt-10 md:!pt-14">
        <Container>
          <IndexBar index={1} name="Content" aside="Write · Film · Document" />
          <SectionHead
            title={
              <>
                Content developers <Accent>learn from</Accent>
              </>
            }
            description="Tutorials, docs, and video that explain your product the way developers evaluate it."
          />
          <ServiceGrid services={CONTENT} />
        </Container>
      </PaperSection>

      <PaperSection tone="paper" className="!pt-0">
        <Container>
          <IndexBar
            index={2}
            name="Growth"
            aside="Community · GitHub · Launches · AI answers"
          />
          <SectionHead
            title={
              <>
                Growth where developers <Accent>already look</Accent>
              </>
            }
            description="Communities, GitHub, launches, Reddit, and AI answers: the places developers find and choose tools."
          />
          <ServiceGrid services={GROWTH} />
        </Container>
      </PaperSection>

      <PaperSection id="where-to-start" tone="paper" className="!pt-0">
        <Container>
          <IndexBar index={3} name="Where to start" />
          <ul
            role="list"
            className={`mt-8 divide-y divide-[#141414]/10 px-6 ${CARD}`}
          >
            {STARTING_POINTS.map((point) => (
              <li key={point.href}>
                <Link
                  href={point.href}
                  className="group flex flex-col gap-1 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                >
                  <span className="text-[16px] text-[#141414]/70">
                    {point.situation}
                  </span>
                  <span className="flex items-center gap-1.5 text-[15px] font-medium">
                    {point.name}
                    <ArrowUpRight
                      weight="bold"
                      className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      style={{ color: PRINT }}
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </PaperSection>

      <PaperCta
        title="Not Sure Which Service Fits?"
        description="Tell us where developers drop off, and we'll suggest where to start."
      />
    </div>
  );
}
