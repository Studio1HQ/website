import type { Metadata } from "next";
import { CommunityPage } from "@/components/community/community-page";
import { loadCommunity } from "@/lib/community";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

// Upcoming and past depend on today's date, and new dashboard events show up
// within the hour.
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Community: Meetups and Hackathons",
  description:
    "Studio1 community meetups and hackathons for developers: what's coming up, the cities we've been to, and how to host one with us.",
  path: "/community",
  keywords: ["Studio1 community", "developer meetups India", "hackathons", "DevRel community"],
});

export default async function Page() {
  const data = await loadCommunity();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Community", path: "/community" },
            ]),
          ),
        }}
      />
      <CommunityPage data={data} />
    </>
  );
}
