import type { Metadata } from "next";
import { DevRelCohortPage } from "@/components/devrel-cohort/devrel-cohort-page";
import { COHORT } from "@/data/devrel-cohort";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import {
  breadcrumbJsonLd,
  ORGANIZATION_ID,
  pageMetadata,
  pageUrl,
} from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase-server";

const PATH = "/devrel-cohort";
const TITLE = "DevRel Cohort: 4-Week Developer Relations Program";
const DESCRIPTION =
  "A four-week, hands-on DevRel cohort run by Studio1. Ship tutorials, demos, videos and a launch plan. Top participants get interviews and partner referrals.";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: PATH,
    locale: DEFAULT_LOCALE,
    keywords: [
      "devrel cohort",
      "developer relations program",
      "learn devrel",
      "developer advocate training",
      "devrel bootcamp",
      "how to get into devrel",
    ],
  });
}

export default function DevRelCohort() {
  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Studio1 DevRel Cohort",
    description: DESCRIPTION,
    url: pageUrl(PATH),
    provider: { "@id": ORGANIZATION_ID },
    timeRequired: "P4W",
    hasCourseInstance: {
      "@type": "CourseInstance",
      ...(COHORT.format.toLowerCase() === "online"
        ? { courseMode: "online" }
        : {}),
      ...(COHORT.startDate ? { startDate: COHORT.startDate } : {}),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "DevRel Cohort", path: PATH },
            ]),
          ),
        }}
      />
      {/* The form needs Supabase in production; development shows it anyway
          (the API route logs entries there instead of saving them). */}
      <DevRelCohortPage
        applicationsEnabled={
          isSupabaseConfigured() || process.env.NODE_ENV !== "production"
        }
      />
    </>
  );
}
