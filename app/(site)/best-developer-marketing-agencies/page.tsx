import type { Metadata } from "next";
import type { FAQItem } from "@/components/landing/faq";
import { AgencyListPage } from "@/components/pages/compare/agency-list-page";
import {
  AGENCIES,
  AGENCIES_CHECKED,
  AGENCY_LIST_SOURCES,
  GENERALIST_AGENCIES,
  STUDIO1_AGENCY,
} from "@/data/agencies";
import { DEFAULT_LOCALE, localizedUrl } from "@/lib/i18n";
import { PAPER_SCOPE } from "@/lib/paper";
import { breadcrumbJsonLd, ORGANIZATION_ID, pageMetadata } from "@/lib/seo";
import { baseUrl } from "@/lib/site";

const PATH = "/best-developer-marketing-agencies";
const TITLE = "Best Developer Marketing Agencies in 2026, Compared";
const DESCRIPTION =
  "The best developer marketing agencies for devtools in 2026: Studio1, Draft.dev, Hackmamba, Infrasity, and more, with services, clients, and public pricing.";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: PATH,
    locale: DEFAULT_LOCALE,
    keywords: [
      "best developer marketing agencies",
      "developer marketing agency",
      "devtool marketing agency",
      "DevRel agency",
      "technical content marketing agencies",
    ],
  });
}

const faqs: FAQItem[] = [
  {
    question: "What does a developer marketing agency do?",
    answer:
      "It helps companies that sell to developers get found, tried, and adopted. Depending on the agency, that covers technical content and tutorials, docs, video, SEO and AI search, community and DevRel programs, launches, and distribution on channels like Reddit, Hacker News, and Dev.to.",
  },
  {
    question: "How much does a developer marketing agency cost?",
    answer:
      "Among agencies that publish prices, writers on demand start around $3,500 a month, content retainers around $5,000 to $9,000 a month, and full-service programs reach $120,000 a year. Many agencies, including Studio1, quote by scope instead of publishing a price list.",
  },
  {
    question: "How do I choose a developer marketing agency?",
    answer:
      "Start with what you need most: a steady content program, docs, AI search visibility, a launch, or open-source growth. Then check that the agency has done that work for a product like yours, ask who actually writes or ships it, and look for results with public sources rather than unnamed claims.",
  },
  {
    question: "Which agency is best for open-source projects?",
    answer:
      "Look for one that runs GitHub growth as a service, not only blog posts: README and onboarding fixes, demo projects, and launch distribution. Studio1's open-source results include Memori growing to 12,000+ GitHub stars and Corsair going from about 300 to 2,000 stars in five weeks.",
  },
  {
    question: "Is a developer marketing agency the same as a DevRel agency?",
    answer:
      "They overlap. Developer marketing covers content, SEO, launches, and campaigns; DevRel adds advocacy, community, talks, and events. Some agencies do only content, while others, such as Studio1 and Hackmamba, also offer DevRel.",
  },
];

export default function BestDeveloperMarketingAgenciesPage() {
  const ranked = [STUDIO1_AGENCY, ...AGENCIES];
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: TITLE,
    description: DESCRIPTION,
    url: localizedUrl(PATH, DEFAULT_LOCALE, baseUrl),
    dateModified: AGENCIES_CHECKED,
    publisher: { "@id": ORGANIZATION_ID },
    mainEntity: {
      "@type": "ItemList",
      name: "Developer marketing agencies",
      itemListElement: ranked.map((agency, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item:
          index === 0
            ? { "@id": ORGANIZATION_ID }
            : { "@type": "Organization", name: agency.name, url: agency.url },
      })),
    },
  };

  return (
    <div style={PAPER_SCOPE}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Best Developer Marketing Agencies", path: PATH },
            ]),
          ),
        }}
      />
      <AgencyListPage
        studio1={STUDIO1_AGENCY}
        agencies={AGENCIES}
        generalists={GENERALIST_AGENCIES}
        listSources={AGENCY_LIST_SOURCES}
        checked={AGENCIES_CHECKED}
        faqs={faqs}
      />
    </div>
  );
}
