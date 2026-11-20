import { DevRelJobsPage } from "@/components/devrel-jobs/devrel-jobs-page";
import { getDevRelJobs } from "@/lib/devrel-jobs-data";
import { baseUrl } from "@/lib/seo";

/**
 * Built once an hour at most; a save on the dashboard's DevRel jobs page
 * rebuilds it on the next visit (devRelJobsChanged).
 */
export const revalidate = 3600;

export default async function DevRelJobs() {
  const jobs = await getDevRelJobs();

  // Plain list entries, not JobPosting: Google only accepts JobPosting on a
  // job's own detail page, and these jobs live on other companies' sites.
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "DevRel Jobs Board",
    url: `${baseUrl}/devrel-jobs`,
    numberOfItems: jobs.length,
    itemListElement: jobs.map((job, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${job.title} at ${job.company}`,
      url: job.url,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <DevRelJobsPage jobs={jobs} />
    </>
  );
}
