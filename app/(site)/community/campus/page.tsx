import type { Metadata } from "next";
import { CampusPage } from "@/components/community/campus/campus-page";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase-server";

const PATH = "/community/campus";

export const metadata: Metadata = pageMetadata({
  title: "Studio1 Across the Campus: Support for Your Event",
  description:
    "College clubs and developer communities: apply for speakers, mentors, swag, promotion and devtool sponsor intros for your hackathon, meetup or tech fest.",
  path: PATH,
  keywords: [
    "Studio1 Across the Campus",
    "college hackathon sponsorship",
    "tech fest sponsors India",
    "student developer community support",
    "hackathon speakers and mentors",
  ],
});

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Community", path: "/community" },
              { name: "Studio1 Across the Campus", path: PATH },
            ]),
          ),
        }}
      />
      {/* The form needs Supabase in production; development shows it anyway
          (the API route logs entries there instead of saving them). */}
      <CampusPage
        applicationsEnabled={
          isSupabaseConfigured() || process.env.NODE_ENV !== "production"
        }
      />
    </>
  );
}
