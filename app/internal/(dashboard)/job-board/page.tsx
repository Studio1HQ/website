import type { Metadata } from "next";
import {
  ArrowSquareOut,
  Plus,
  SuitcaseSimple,
} from "@/components/internal/icons";
import { loadJobRecords } from "@/lib/devrel-jobs-data";
import { todayIst } from "@/lib/internal/blog/shared";
import { requireArea } from "@/lib/internal/session";
import { baseUrl } from "@/lib/seo";
import {
  Card,
  EmptyState,
  Notice,
  PageHeader,
  buttonClass,
} from "@/components/internal/ui";
import { JobDialog } from "@/components/internal/job-board/job-dialog";
import { JobList } from "@/components/internal/job-board/job-list";

export const metadata: Metadata = { title: "DevRel jobs" };

const distinct = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort();

/**
 * The public DevRel jobs board's listings (studio1hq.com/devrel-jobs): add,
 * change, hide and remove them here, and the board shows it on its next
 * visit. People given DevRel jobs on People, and admins.
 */
export default async function JobBoardPage() {
  await requireArea("jobboard", "manage");
  const today = todayIst();
  const loaded = await loadJobRecords();
  const jobs = loaded.ok ? loaded.jobs : [];
  const live = jobs.filter((job) => job.live).length;
  const used = {
    locations: distinct(jobs.map((job) => job.location)),
    categories: distinct(jobs.map((job) => job.category)),
    levels: distinct(jobs.map((job) => job.level)),
    types: distinct(jobs.map((job) => job.type)),
  };
  const add = (
    <JobDialog
      today={today}
      used={used}
      trigger={
        <button type="button" className={buttonClass("primary")}>
          <Plus size={13} /> Add a job
        </button>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="DevRel jobs"
        description="The listings on the public DevRel jobs board. Logos come from each company's website. Changes show on the board straight away."
        actions={
          <>
            <a
              href={`${baseUrl}/devrel-jobs`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("secondary")}
            >
              <ArrowSquareOut size={13} /> Open the board
            </a>
            {add}
          </>
        }
      />
      {!loaded.ok ? (
        <div className="mb-5">
          <Notice tone={loaded.missing ? "warning" : "error"}>
            {loaded.message}
          </Notice>
        </div>
      ) : null}

      {!jobs.length ? (
        <Card>
          <EmptyState
            icon={<SuitcaseSimple size={20} />}
            title="No jobs on the board yet"
            action={loaded.ok ? add : undefined}
          >
            Add a DevRel, developer advocacy or developer experience role with
            its apply link. The company&apos;s logo comes from its website.
          </EmptyState>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3 text-[12.5px] text-[var(--i-muted)]">
            <span>
              {live} on the board
              {jobs.length > live ? ` · ${jobs.length - live} hidden` : ""}
            </span>
            <span>Pinned first, then newest</span>
          </div>
          <JobList jobs={jobs} today={today} used={used} />
        </Card>
      )}
    </>
  );
}
