export type Agency = {
  name: string;
  url: string;
  /** What the agency does, paraphrased from its own site. */
  focus: string;
  services: string[];
  bestFor: string;
  clients: string;
  pricing: string;
  /** Page the facts come from. */
  source: string;
};

/** When the agencies' own sites were last checked (YYYY-MM-DD). */
export const AGENCIES_CHECKED = "2026-10-30";

/** Studio1, listed first (it's our list), from our own pages. */
export const STUDIO1_AGENCY: Agency = {
  name: "Studio1",
  url: "https://www.studio1hq.com/",
  focus:
    "DevRel and GitHub growth for devtool, AI, and open-source teams, tying content to adoption: stars, launches, and community.",
  services: [
    "GitHub and open-source growth",
    "Technical content marketing",
    "Docs and DX audits",
    "Developer video",
    "Product launches",
    "Reddit, distribution, and AEO",
    "DevRel programs and events",
  ],
  bestFor:
    "Devtool, AI, and open-source teams that want content, launches, and community work from one team, with public results.",
  clients: "Nebius, Memori, LiteLLM, Bright Data, Permit.io",
  pricing: "Quoted per scope",
  source: "https://www.studio1hq.com/results",
};

/** The developer-focused agencies named most often across published lists. */
export const AGENCIES: Agency[] = [
  {
    name: "Draft.dev",
    url: "https://draft.dev/",
    focus:
      "Content-led growth marketing for developer tools and platforms, written by a network of engineers.",
    services: [
      "Technical content and tutorials",
      "Campaign strategy",
      "Lead collection",
      "Performance optimization",
    ],
    bestFor:
      "Teams launching new products or scaling an existing content engine.",
    clients: "Docker, Cloudflare, Supabase, Sinch Mailgun, Loft Labs",
    pricing: "From $9K a month, 3-month minimum",
    source: "https://draft.dev/",
  },
  {
    name: "Hackmamba",
    url: "https://hackmamba.io/",
    focus:
      "Helping companies that sell to developers reach, convert, and keep technical users.",
    services: [
      "Technical writers on demand",
      "Developer content and SEO",
      "Paid media",
      "DevRel",
      "Tech influencer marketing",
      "Mintlify documentation",
    ],
    bestFor: "Developer-focused companies, mostly seed to Series C.",
    clients: "Databricks, OpenRouter, Mintlify, Novu, Actian",
    pricing:
      "Writers from $3,500 a month; content retainers from $5,000; DevRel from $12,000",
    source: "https://hackmamba.io/pricing/",
  },
  {
    name: "Infrasity",
    url: "https://www.infrasity.com/",
    focus:
      "Technical content marketing for B2B SaaS, with devtool startups as its main focus.",
    services: [
      "Developer marketing",
      "Technical content",
      "Product documentation",
      "Technical video",
      "Reddit marketing",
      "AI search (GEO)",
    ],
    bestFor: "Early-stage devtool, AI, and infrastructure startups.",
    clients: "Qodo, OX Security, Brevo",
    pricing: "Not public; Starter and Scale plans by volume",
    source: "https://www.infrasity.com/pricing",
  },
  {
    name: "Catchy",
    url: "https://www.catchyagency.com/",
    focus:
      "A developer marketing agency that works only with companies marketing technical products.",
    services: [
      "Go-to-market",
      "Demand generation",
      "Developer experience",
      "Content and creative",
    ],
    bestFor: "Technology companies, from startups to global brands.",
    clients: "Meta, Atlassian, Google, AWS, Qualcomm",
    pricing: "Not public",
    source: "https://www.catchyagency.com/",
  },
  {
    name: "EveryDeveloper",
    url: "https://everydeveloper.com/",
    focus:
      "Senior advice for devtool companies that want to be the tool developers pick first.",
    services: [
      "Monthly advisor retainer",
      "AI and LLM visibility review",
      "Competitive analysis",
      "Developer experience review",
    ],
    bestFor: "Marketing or product leads at devtool companies.",
    clients: "Render, Hoss",
    pricing: "From $5,000 a month",
    source: "https://everydeveloper.com/services/",
  },
  {
    name: "Literally.dev",
    url: "https://literally.dev/",
    focus: "AEO and technical content marketing for tech companies.",
    services: [
      "Answer engine optimization",
      "Technical content",
      "Technical documentation",
      "90-day AI recommendation sprint",
    ],
    bestFor: "Tech companies that want to be recommended in AI answers.",
    clients: "QA.tech, AppSignal, Kapa.ai, GlassFlow, Aviator",
    pricing: "$4,990 a month for the sprint, 3-month minimum",
    source: "https://literally.dev/",
  },
  {
    name: "Argot",
    url: "https://argot.dev/",
    focus: "Writing and editing for developers, and for their AI agents.",
    services: ["Writing", "Editing", "Strategy"],
    bestFor: "Teams that want developer-focused writing and editing.",
    clients: "Clerk, Deno, Modal, Neon, Retool",
    pricing: "Not public; scoped to budget",
    source: "https://argot.dev/",
  },
];

/** Named on many lists, but B2B SaaS generalists rather than developer specialists. */
export const GENERALIST_AGENCIES: Agency[] = [
  {
    name: "Animalz",
    url: "https://www.animalz.co/",
    focus: "Content marketing and SEO for B2B SaaS brands.",
    services: [
      "Brand and authority",
      "SEO and AEO",
      "Production and distribution",
    ],
    bestFor: "B2B SaaS companies investing in content and search.",
    clients: "Amplitude, WorkOS, Lithic, Unit21",
    pricing: "Not public",
    source: "https://www.animalz.co/",
  },
  {
    name: "Omniscient Digital",
    url: "https://beomniscient.com/",
    focus: "SEO, AI search, and content as growth channels for B2B software.",
    services: [
      "SEO strategy",
      "Answer engine optimization",
      "Content production",
    ],
    bestFor: "B2B software companies with a large search program.",
    clients: "Jasper, 360Learning, Smartling",
    pricing: "Full-service from $120,000 a year",
    source: "https://beomniscient.com/",
  },
];

/** Published lists the selection was counted from. */
export const AGENCY_LIST_SOURCES = [
  "https://dev.to/tkamunya/top-8-developer-marketing-agencies-279c",
  "https://dev.to/hackmamba/which-technical-content-marketing-agency-should-you-work-with-in-2026-522i",
  "https://draft.dev/learn/top-technical-content-marketing-agencies",
  "https://dev.to/engroso/top-developer-marketing-agencies-1kcg",
  "https://marketerhire.com/blog/best-devtools-marketing-agencies",
  "https://marketerhire.com/blog/developer-marketing-agency",
  "https://daily.dev/blog/developer-marketing-agencies-who-to-hire-and-why/",
  "https://hackernoon.com/best-technical-content-marketing-agencies-for-developer-tools",
  "https://100signals.pages.dev/best-content-marketing-agencies-for-software-development-companies/",
  "https://www.growthspreeofficial.com/blogs/top-4-best-b2b-saas-marketing-agencies-for-developer-audience-2026",
  "https://www.animalz.co/blog/best-technical-content-marketing-agencies",
  "https://www.infrasity.com/blog/tech-content-marketing-agency",
  "https://www.infrasity.com/blog/top-content-marketing-agencies",
  "https://www.columnfivemedia.com/content-marketing-agencies-developer-tools/",
  "https://hackmamba.io/technical-content/content-marketing-agencies-developer-tools/",
  "https://piperocketdigital.netlify.app/list/best-devtools-marketing-agencies/",
  "https://genesysgrowth.com/blog/product-marketing-agencies-devtools-companies",
  "https://dev.to/jusjustin/how-to-hire-a-developer-marketing-agency-for-my-devtool-startup-9cg",
];
