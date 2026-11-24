"use client";

import { useTransition } from "react";
import {
  ArrowSquareOut,
  EyeSlash,
  PencilSimple,
  PushPin,
} from "@/components/internal/icons";
import { setJobLive as setJobLiveAction } from "@/app/internal/(dashboard)/job-board/actions";
import { logoSite, type DevRelJobRecord } from "@/lib/devrel-jobs";
import { SiteLogo } from "@/components/internal/site-logo";
import { guarded } from "@/components/internal/guarded";
import { useToast } from "@/components/internal/toast";
import { buttonClass } from "@/components/internal/ui";
import { JobDialog } from "@/components/internal/job-board/job-dialog";
import { cn } from "@/lib/utils";

const setJobLive = guarded(setJobLiveAction);

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function postedOn(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? day : dayFormat.format(date);
}

type Used = {
  locations: string[];
  categories: string[];
  levels: string[];
  types: string[];
};

/** Every listing, one row each: logo, title, where, when, and its actions. */
export function JobList({
  jobs,
  today,
  used,
}: {
  jobs: DevRelJobRecord[];
  today: string;
  used: Used;
}) {
  return (
    <ul className="divide-y divide-[var(--i-line)]">
      {jobs.map((job) => (
        <JobRow key={job.id} job={job} today={today} used={used} />
      ))}
    </ul>
  );
}

function JobRow({
  job,
  today,
  used,
}: {
  job: DevRelJobRecord;
  today: string;
  used: Used;
}) {
  const toast = useToast();
  const [busy, start] = useTransition();

  const toggle = () =>
    start(async () => {
      const result = await setJobLive(job.id, !job.live);
      toast(result.ok ? "success" : "error", result.message ?? "Saved");
    });

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5",
        !job.live && "opacity-60",
      )}
    >
      <SiteLogo
        path={`/api/devrel-jobs/logo/${job.id}`}
        name={job.company}
        website={logoSite(job)}
        size={32}
      />
      {/* On a phone the text takes the whole first line; date and actions go under it. */}
      <div className="min-w-0 flex-1 max-sm:basis-[calc(100%-48px)]">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-medium">
          <span className="truncate">{job.title}</span>
          {job.featured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--i-sunken)] px-2 py-0.5 text-[11px] font-normal text-[var(--i-muted)]">
              <PushPin size={11} weight="fill" /> Pinned
            </span>
          ) : null}
          {!job.live ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--i-sunken)] px-2 py-0.5 text-[11px] font-normal text-[var(--i-muted)]">
              <EyeSlash size={11} /> Hidden
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-[var(--i-muted)]">
          {[
            job.company,
            job.location,
            job.workplace !== "Unspecified" ? job.workplace : null,
            job.salary,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="flex items-center gap-4 max-sm:ml-12 max-sm:w-[calc(100%-48px)] max-sm:justify-between">
        <span className="text-[12.5px] tabular-nums text-[var(--i-muted)]">
          {postedOn(job.postedDate)}
        </span>
        <div className="flex items-center gap-1">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open the ${job.company} listing`}
            title="Open the listing"
            className={buttonClass("ghost", "sm")}
          >
            <ArrowSquareOut size={14} />
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={toggle}
            className={buttonClass("ghost", "sm")}
          >
            {job.live ? "Hide" : "Show"}
          </button>
          <JobDialog
            job={job}
            today={today}
            used={used}
            trigger={
              <button type="button" className={buttonClass("secondary", "sm")}>
                <PencilSimple size={13} /> Edit
              </button>
            }
          />
        </div>
      </div>
    </li>
  );
}
