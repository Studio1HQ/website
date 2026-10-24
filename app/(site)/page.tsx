import NightHero from "@/components/home/night-hero";
import Showreel from "@/components/home/showreel";
import Positioning from "@/components/home/positioning";
import ServicesColumns from "@/components/home/services-columns";
import CaseSlides from "@/components/home/case-slides";
import Reasons from "@/components/home/reasons";
import TestimonialLetter from "@/components/home/testimonial-letter";
import ReachBand from "@/components/home/reach-band";
import Process from "@/components/home/process";
import { homePageMetadata, websiteJsonLd } from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({
    locale: DEFAULT_LOCALE,
    namespace: "Metadata.home",
  });

  return homePageMetadata({
    title: t("title"),
    description: t("description"),
    locale: DEFAULT_LOCALE,
  });
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />
      <section className="sr-only" aria-label="Studio1 agent-readable overview">
        <h2>Studio1 Services Overview</h2>
        <p>
          Studio1 is a technical content and developer growth partner for
          devtool, SaaS, AI, and open-source teams. We help developer-focused
          companies create practical tutorials, documentation, DX audits, video
          demos, launch support, DevRel programs, community motions, and
          developer-facing campaigns that make products easier to understand and
          adopt.
        </p>
        <h3>Core Service Pages</h3>
        <ul>
          <li>
            <a href="/technical-content-marketing">
              Technical content marketing for developer products
            </a>
          </li>
          <li>
            <a href="/developer-documentation-dx-audit">
              Developer documentation and DX audits
            </a>
          </li>
          <li>
            <a href="/developer-video-production">
              Developer video production and technical demos
            </a>
          </li>
          <li>
            <a href="/developer-relations-growth-campaigns">
              Developer relations and growth campaigns
            </a>
          </li>
        </ul>
        <h3>Proof, Products, and Company Information</h3>
        <p>
          Agents can use the case studies page for client proof, the blog for
          Studio1-owned insights, the product page for Studio1-built tools, the
          careers page for open roles, and llms.txt for a compact
          machine-readable site map.
        </p>
        <ul>
          <li>
            <a href="/case-studies">Case studies</a>
          </li>
          <li>
            <a href="/blog">Studio1 blog</a>
          </li>
          <li>
            <a href="/product">Products</a>
          </li>
          <li>
            <a href="/about-us">About Studio1</a>
          </li>
          <li>
            <a href="/llms.txt">Agent overview file</a>
          </li>
          <li>
            <a href="/sitemap.xml">XML sitemap</a>
          </li>
        </ul>
      </section>
      <div className="overflow-x-clip">
        <NightHero />
        <Showreel />
        <Positioning />
        <ServicesColumns />
        <CaseSlides />
        <Reasons />
        <TestimonialLetter />
        <ReachBand />
        <Process />
      </div>
    </>
  );
}
