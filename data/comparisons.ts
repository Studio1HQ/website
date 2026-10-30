import type { FAQItem } from "@/components/landing/faq";

export type ComparisonRow = {
  label: string;
  studio1: string;
  competitor: string;
};

export type Comparison = {
  slug: string;
  competitor: string;
  competitorUrl: string;
  /** Title tag and H1. */
  title: string;
  description: string;
  keywords: string[];
  /** Answer-first summary at the top of the page. */
  shortAnswer: string;
  rows: ComparisonRow[];
  chooseStudio1: string[];
  chooseCompetitor: string[];
  faqs: FAQItem[];
  /** Pages the competitor facts come from. */
  sources: { label: string; href: string }[];
  /** When the competitor's site was last checked (YYYY-MM-DD). */
  checked: string;
};

/** Studio1's own column, shared by every comparison. */
const STUDIO1 = {
  focus: "DevRel and GitHub growth for devtool, AI, and open-source teams",
  team: "Studio1's own engineers and writers",
  pricing: "Quoted per scope; no public price list",
  clients: "Nebius, Memori, LiteLLM, Bright Data, Permit.io, Jozu",
};

export const COMPARISONS: Comparison[] = [
  {
    slug: "studio1-vs-draft-dev",
    competitor: "Draft.dev",
    competitorUrl: "https://draft.dev/",
    title: "Studio1 vs Draft.dev: Developer Marketing Agencies Compared",
    description:
      "Studio1 vs Draft.dev compared on services, GitHub and open-source growth, DevRel, video, pricing, and clients, using each company's own site.",
    keywords: [
      "Draft.dev alternative",
      "Studio1 vs Draft.dev",
      "Draft.dev competitors",
      "technical content agency comparison",
    ],
    shortAnswer:
      "Draft.dev is a technical content agency for developer tools, with a network of 300+ engineers and plans starting at $9K a month. Studio1 also writes technical content, and adds GitHub and open-source growth, docs and DX audits, product launches, and DevRel such as talks and events. Choose Draft.dev for a high-volume content program; choose Studio1 when you need content tied to open-source adoption, launches, and developer community work.",
    rows: [
      {
        label: "Focus",
        studio1: STUDIO1.focus,
        competitor: "Content-led growth marketing for developer tools",
      },
      {
        label: "Blog posts and tutorials",
        studio1: "Yes",
        competitor: "Yes",
      },
      {
        label: "Comparison and SEO pages",
        studio1: "Yes",
        competitor: "Yes, with SEO and GEO research",
      },
      {
        label: "Developer video",
        studio1: "Yes: demos, tutorials, and Shorts",
        competitor: "Yes: video and video tutorials",
      },
      {
        label: "Docs and DX audits",
        studio1: "Yes",
        competitor: "Onboarding content; product docs not listed as a service",
      },
      {
        label: "GitHub and open-source growth",
        studio1: "Yes: README, onboarding, demos, and launches",
        competitor: "Not listed on their site",
      },
      {
        label: "Product launches",
        studio1: "Yes: Reddit, Hacker News, X, LinkedIn, and Product Hunt",
        competitor: "Content strategy for new product releases",
      },
      {
        label: "Distribution",
        studio1: "Reddit, X, LinkedIn, daily.dev, Dev.to, and YouTube",
        competitor: "Promotion on Reddit, LinkedIn, X, and more",
      },
      {
        label: "DevRel: talks, events, community",
        studio1: "Yes",
        competitor:
          "Not listed; they work with DevRel teams on content strategy",
      },
      {
        label: "Who does the work",
        studio1: STUDIO1.team,
        competitor:
          "A network of 300+ engineers; AI-assisted drafts reviewed by a developer and edited",
      },
      {
        label: "Pricing",
        studio1: STUDIO1.pricing,
        competitor: "Plans from $9K a month, 3-month minimum",
      },
      {
        label: "Example clients",
        studio1: STUDIO1.clients,
        competitor: "Docker, Cloudflare, Supabase, JetBrains, Redpanda",
      },
    ],
    chooseStudio1: [
      "You're growing an open-source project and need README and onboarding fixes, demos, and launch distribution that turn into GitHub stars. Memori grew to 12,000+ stars, and Corsair went from about 300 to 2,000 in five weeks.",
      "You want content and DevRel from one team: talks, workshops, hackathons, and community programs alongside the writing.",
      "You need docs and DX audits, product launches, Reddit marketing, or AI-search work in the same engagement.",
    ],
    chooseCompetitor: [
      "You want a high-volume content program; they aim to publish every week.",
      "You want content strategy, lead magnets, eBooks, and content refreshes under one retainer.",
      "A monthly plan from $9K with a 3-month minimum fits your budget.",
    ],
    faqs: [
      {
        question: "What is the difference between Studio1 and Draft.dev?",
        answer:
          "Both write technical content for developer tools. Draft.dev focuses on content-led growth marketing, with a network of 300+ engineers and plans from $9K a month. Studio1 adds GitHub and open-source growth, docs and DX audits, product launches, and DevRel such as talks, events, and community programs.",
      },
      {
        question: "Is Studio1 a Draft.dev alternative?",
        answer:
          "Yes, if you need technical content plus open-source growth, launches, or DevRel. If you only need a steady stream of blog posts and tutorials, both are options, and the choice comes down to scope, budget, and fit with your team.",
      },
      {
        question: "Which is better for open-source projects?",
        answer:
          "Studio1 runs GitHub and open-source growth as a service: README and onboarding fixes, demo projects, and launch distribution. Results include Memori growing to 12,000+ GitHub stars and OpenLore going from about 135 to 1,700+ in one month. Draft.dev doesn't list open-source growth as a service on its site.",
      },
      {
        question: "How does pricing compare?",
        answer:
          "Draft.dev lists plans starting at $9K a month with an initial 3-month minimum, plus custom offers on request. Studio1 quotes each engagement by scope and doesn't publish a price list.",
      },
    ],
    sources: [
      { label: "Draft.dev homepage", href: "https://draft.dev/" },
      { label: "Draft.dev about", href: "https://draft.dev/about" },
      {
        label: "Draft.dev for marketers and DevRels",
        href: "https://draft.dev/drive-awareness",
      },
      {
        label: "Draft.dev case studies",
        href: "https://draft.dev/case-studies",
      },
    ],
    checked: "2026-10-30",
  },
  {
    slug: "studio1-vs-infrasity",
    competitor: "Infrasity",
    competitorUrl: "https://www.infrasity.com/",
    title: "Studio1 vs Infrasity: Devtool Marketing Agencies Compared",
    description:
      "Studio1 vs Infrasity compared on technical content, GitHub growth, launches, DevRel, docs, video, pricing, and clients, using each company's own site.",
    keywords: [
      "Infrasity alternative",
      "Studio1 vs Infrasity",
      "Infrasity competitors",
      "devtool marketing agency comparison",
    ],
    shortAnswer:
      "Infrasity and Studio1 cover similar ground for devtool teams: technical content, docs, video, Reddit, GitHub marketing, AEO, and DevRel. Infrasity positions itself as a technical content marketing agency for B2B SaaS, with packaged monthly plans for early-stage infra, AI, and devtool startups. Studio1 leads with GitHub and open-source growth and runs product launches and in-person DevRel as services, with public results such as Memori's 12,000+ GitHub stars.",
    rows: [
      {
        label: "Focus",
        studio1: STUDIO1.focus,
        competitor:
          "Technical content marketing for B2B SaaS: devtools, AI, infra, and security startups",
      },
      {
        label: "Technical content",
        studio1: "Yes",
        competitor: "Yes",
      },
      {
        label: "SEO and AI search (AEO)",
        studio1: "Yes",
        competitor: "Yes",
      },
      {
        label: "Docs",
        studio1: "Yes, with DX audits",
        competitor: "Yes: product and API documentation",
      },
      {
        label: "Developer video",
        studio1: "Yes",
        competitor: "Yes",
      },
      {
        label: "Reddit marketing",
        studio1: "Yes",
        competitor: "Yes",
      },
      {
        label: "GitHub growth",
        studio1: "Yes: README, onboarding, demos, and launches",
        competitor: "Yes: GitHub marketing service",
      },
      {
        label: "Product launches",
        studio1:
          "Yes: a launch service across Reddit, Hacker News, X, LinkedIn, and Product Hunt",
        competitor:
          "Not a standalone service; launch campaigns mentioned, plus free launch checklists",
      },
      {
        label: "DevRel",
        studio1: "Yes: talks, workshops, hackathons, and community programs",
        competitor: "Yes: DevRel as a service",
      },
      {
        label: "Who does the work",
        studio1: STUDIO1.team,
        competitor:
          "In-house engineers, technical writers, and subject-matter experts",
      },
      {
        label: "Pricing",
        studio1: STUDIO1.pricing,
        competitor:
          "Starter (4 blogs a month) and Scale (6–8 blogs and 2 videos a month) plans; prices not shown",
      },
      {
        label: "Example clients",
        studio1: STUDIO1.clients,
        competitor: "Env0, Terrateam, Firefly, Kubiya.ai, Qodo, Brevo",
      },
    ],
    chooseStudio1: [
      "You're launching or growing an open-source project and want a team with public GitHub results: Memori to 12,000+ stars, Corsair from about 300 to 2,000 in five weeks, and Nebius's examples library at 16K+.",
      "You want a launch run as a service: launch plan, demo video, and launch day across Reddit, Hacker News, X, LinkedIn, and Product Hunt.",
      "You want in-person DevRel as well as content, such as talks at KubeCon India and DevFest, workshops, and hackathons.",
    ],
    chooseCompetitor: [
      "You want a packaged monthly plan with a set number of blogs and videos.",
      "You're an early-stage infra, AI, or security startup, the segment they say they focus on.",
      "You want to start with a 30-day proof of concept, which their pricing page offers.",
    ],
    faqs: [
      {
        question: "What is the difference between Studio1 and Infrasity?",
        answer:
          "Their services overlap: both offer technical content, docs, video, Reddit, GitHub marketing, AEO, and DevRel. Infrasity positions itself as a technical content marketing agency for B2B SaaS with packaged monthly plans. Studio1 leads with GitHub and open-source growth, and runs product launches and in-person DevRel as services.",
      },
      {
        question: "Is Studio1 an Infrasity alternative?",
        answer:
          "Yes. Teams that want open-source growth with public GitHub results, a launch run end to end, or DevRel at events often choose Studio1. Teams that want a set monthly volume of blogs and videos may prefer a packaged plan like Infrasity's.",
      },
      {
        question: "Which has more GitHub growth results?",
        answer:
          "Both publish GitHub results. Studio1's public results include Memori growing to 12,000+ GitHub stars, Corsair going from about 300 to 2,000 in five weeks, OpenLore from about 135 to 1,700+ in one month, and Nebius's examples library reaching 16K+ stars. Every number links to its case study on our results page.",
      },
      {
        question: "How does pricing compare?",
        answer:
          "Infrasity's pricing page lists Starter and Scale plans by monthly blog and video volume, without prices, and offers a 30-day proof of concept. Studio1 quotes each engagement by scope and doesn't publish a price list.",
      },
    ],
    sources: [
      { label: "Infrasity homepage", href: "https://www.infrasity.com/" },
      { label: "Infrasity about", href: "https://www.infrasity.com/about" },
      { label: "Infrasity pricing", href: "https://www.infrasity.com/pricing" },
      {
        label: "Infrasity case studies",
        href: "https://www.infrasity.com/case-studies",
      },
    ],
    checked: "2026-10-30",
  },
];

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((comparison) => comparison.slug === slug);
}
