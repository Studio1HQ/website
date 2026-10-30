import { baseUrl } from "@/lib/site";

/** Byline for posts written as the company rather than a person. */
export const TEAM_AUTHOR = "Studio1 Team";

export type AuthorLink = {
  label: string;
  href: string;
};

export type Author = {
  slug: string;
  name: string;
  jobTitle: string;
  bio: string;
  /** Square portrait in /public. */
  image: string;
  knowsAbout: string[];
  /** Official profiles; also the Person schema's sameAs. */
  links: AuthorLink[];
};

export const AUTHORS: Author[] = [
  {
    slug: "arindam-majumder",
    name: "Arindam Majumder",
    jobTitle: "Co-founder & Content Lead",
    bio: "Arindam Majumder is the co-founder of Studio1, where he leads content. He's a developer, technical writer, and community builder, and writes about developer relations, technical content, and getting developer tools in front of the developers who need them.",
    image: "/assets/arindam_nobg.webp",
    knowsAbout: [
      "Developer relations",
      "Technical writing",
      "Technical content marketing",
      "Developer communities",
      "Open-source growth",
    ],
    links: [
      { label: "Website", href: "https://www.arindammajumder.com/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/arindam2004" },
      { label: "GitHub", href: "https://github.com/Arindam200" },
      { label: "YouTube", href: "https://www.youtube.com/@Arindam_1729" },
      { label: "DEV", href: "https://dev.to/arindam_1729" },
    ],
  },
  {
    slug: "amitesh-anand",
    name: "Amitesh Anand",
    jobTitle: "Co-founder & Operations Lead",
    bio: "Amitesh Anand is the co-founder of Studio1, where he leads operations. Known online as Astrodevil, he builds AI demos, agent projects, tutorials, and developer education for SaaS, AI, and devtool teams.",
    image: "/assets/amitesh-profile-square.webp",
    knowsAbout: [
      "AI agents",
      "Developer education",
      "Technical tutorials",
      "Developer relations",
    ],
    links: [
      { label: "Website", href: "https://mranand.com/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/amitesh1208/" },
      { label: "X", href: "https://x.com/astrodevil_" },
    ],
  },
];

const authorsByName = new Map(AUTHORS.map((author) => [author.name, author]));
const authorsBySlug = new Map(AUTHORS.map((author) => [author.slug, author]));

export function getAuthorByName(name: string): Author | undefined {
  return authorsByName.get(name);
}

export function getAuthorBySlug(slug: string): Author | undefined {
  return authorsBySlug.get(slug);
}

export function authorPath(author: Author): string {
  return `/blog/author/${author.slug}`;
}

export function authorUrl(author: Author): string {
  return `${baseUrl}${authorPath(author)}`;
}

/** Stable id so every page's schema points at the same Person node. */
export function authorPersonId(author: Author): string {
  return `${authorUrl(author)}#person`;
}
