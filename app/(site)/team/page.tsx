import type { Metadata } from "next";
import { TeamPage } from "@/components/team/team-page";
import { TEAM } from "@/data/team";
import { AUTHORS, authorPersonId } from "@/lib/authors";
import {
  ORGANIZATION_ID,
  absoluteImageUrl,
  breadcrumbJsonLd,
  pageMetadata,
  pageUrl,
} from "@/lib/seo";

const TITLE = "Our Team: The People Behind the Work";
const DESCRIPTION =
  "Meet the Studio1 team: the founders, founding team and leads behind our developer marketing, DevRel, technical content and developer video work for devtool, AI and open-source companies.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/team",
  keywords: [
    "Studio1 team",
    "Studio1 founders",
    "developer marketing agency team",
    "DevRel agency team",
    "Arindam Majumder",
    "Amitesh Anand",
    "developer relations experts",
    "technical content writers",
  ],
});

/** The named people on the page, linked to their author profiles if any. */
function teamJsonLd() {
  const people = TEAM.flatMap((tier) =>
    tier.members
      .filter((member) => !member.open && member.name)
      .map((member) => {
        const author = AUTHORS.find((a) => a.name === member.name);
        const sameAs = [
          member.links?.x,
          member.links?.linkedin,
          member.links?.website,
        ].filter(Boolean);
        return {
          "@type": "Person",
          ...(author ? { "@id": authorPersonId(author) } : {}),
          name: member.name,
          jobTitle: member.role,
          ...(member.portrait
            ? { image: absoluteImageUrl(member.portrait) }
            : {}),
          worksFor: { "@id": ORGANIZATION_ID },
          ...(sameAs.length ? { sameAs } : {}),
        };
      }),
  );

  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${pageUrl("/team")}#webpage`,
    url: pageUrl("/team"),
    name: `${TITLE} | Studio1`,
    description: DESCRIPTION,
    about: { "@id": ORGANIZATION_ID },
    mainEntity: {
      "@type": "ItemList",
      name: "The Studio1 team",
      numberOfItems: people.length,
      itemListElement: people.map((person, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: person,
      })),
    },
  };
}

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(teamJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Team", path: "/team" },
            ]),
          ),
        }}
      />
      <TeamPage />
    </>
  );
}
