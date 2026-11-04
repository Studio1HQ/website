import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { JobDetailPage } from "@/components/careers/job-detail-page";
import { getJobById, getJobIds, getJobOpenings } from "@/lib/careers";
import {
  jobPostingJsonLd,
  localizedBreadcrumbJsonLd,
  pageMetadata,
  pageUrl,
} from "@/lib/seo";
import { getJobApplicationMailto } from "@/lib/careers-mailto";
import { isSupabaseConfigured } from "@/lib/supabase-server";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return getJobIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = getJobById(id, "en");

  if (!job) {
    return { title: "Not found" };
  }

  return pageMetadata({
    title: job.title,
    description: job.description,
    path: `/careers/${id}`,
    locale: "en",
  });
}

export default async function CareerJobPage({ params }: Props) {
  const { id } = await params;
  const job = getJobById(id, "en");

  if (!job) notFound();

  const breadcrumbSchema = localizedBreadcrumbJsonLd(
    [
      { name: "Home", path: "/" },
      { name: "Careers", path: "/careers" },
      { name: job.title, path: `/careers/${id}` },
    ],
    "en",
  );
  // The on-page form replaces email once Supabase is configured.
  const applicationsEnabled = isSupabaseConfigured();
  const jobSchema = jobPostingJsonLd({
    ...job,
    applyUrl: applicationsEnabled
      ? pageUrl(`/careers/${id}#apply`)
      : getJobApplicationMailto(job),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobSchema) }}
      />
      <JobDetailPage
        job={job}
        otherJobs={getJobOpenings("en").filter((other) => other.id !== id)}
        applicationsEnabled={applicationsEnabled}
      >
        <MDXRemote
          source={job.content}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
        />
      </JobDetailPage>
    </>
  );
}
