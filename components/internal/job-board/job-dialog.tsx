"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  deleteJob,
  saveJob,
} from "@/app/internal/(dashboard)/job-board/actions";
import {
  JOB_CATEGORIES,
  JOB_LEVELS,
  JOB_TYPES,
  WORKPLACES,
  type DevRelJobRecord,
  type DevRelJobWorkplace,
} from "@/lib/devrel-jobs";
import type { JobResult } from "@/lib/internal/job-board/clean";
import { useToast } from "@/components/internal/toast";
import { Select } from "@/components/internal/select";
import { buttonClass, inputClass } from "@/components/internal/ui";
import {
  FormDialog,
  FormField,
  useDialogOpen,
} from "@/components/internal/clients/client-dialog-shell";

/**
 * Add a listing to the DevRel jobs board, or change one. Only the title,
 * company, apply link and location are needed; the logo comes from the
 * company's website on its own.
 */

type Values = {
  title: string;
  company: string;
  website: string;
  url: string;
  location: string;
  workplace: DevRelJobWorkplace;
  category: string;
  job_type: string;
  level: string;
  salary: string;
  posted_on: string;
  tags: string;
  featured: boolean;
  live: boolean;
};

const WORKPLACE_OPTIONS = WORKPLACES.map((value) => ({ value, label: value }));

/** Suggestions: the usual wording plus whatever the board already uses. */
function suggestions(base: readonly string[], used: readonly string[]) {
  return [...new Set([...base, ...used].filter(Boolean))];
}

export function JobDialog({
  job,
  today,
  used,
  trigger,
}: {
  /** The listing to change; leave out to add one. */
  job?: DevRelJobRecord;
  /** "YYYY-MM-DD" in IST: a new listing's posted date. */
  today: string;
  /** Wording already on the board, offered as suggestions. */
  used: {
    locations: string[];
    categories: string[];
    levels: string[];
    types: string[];
  };
  trigger: ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const start = (): Values => ({
    title: job?.title ?? "",
    company: job?.company ?? "",
    website: job?.website ?? "",
    url: job?.url ?? "",
    location: job?.location ?? "",
    workplace: job?.workplace ?? "Remote",
    category: job?.category ?? JOB_CATEGORIES[0],
    job_type: job?.type ?? JOB_TYPES[0],
    level: job?.level ?? "",
    salary: job?.salary ?? "",
    posted_on: job?.postedDate ?? today,
    tags: job?.tags.join(", ") ?? "",
    featured: job?.featured ?? false,
    live: job?.live ?? true,
  });
  const [values, setValues] = useState<Values>(start);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, startSaving] = useTransition();
  const [open, setOpen] = useDialogOpen(() => {
    setValues(start());
    setError(null);
    setConfirm(false);
  });
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const run = (work: () => Promise<JobResult>) =>
    startSaving(async () => {
      const result = await work().catch((): JobResult => ({
        ok: false,
        message: "The request failed. Try again in a minute.",
      }));
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Saved");
      setOpen(false);
      router.refresh();
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const missing = !values.title.trim()
      ? "Add the job title."
      : !values.company.trim()
        ? "Add the company."
        : !values.url.trim()
          ? "Add the apply link."
          : !values.location.trim()
            ? "Add where the job is."
            : null;
    if (missing) {
      setError(missing);
      return;
    }
    setError(null);
    run(() => saveJob(job?.id ?? null, values));
  };

  const id = job?.id ?? "new";
  const list = (name: string) => `job-${id}-${name}`;
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={job ? "Change the listing" : "Add a job"}
      description="A listing on the public DevRel jobs board."
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel={job ? "Save" : "Add to the board"}
      footerStart={
        job ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              confirm ? run(() => deleteJob(job.id)) : setConfirm(true)
            }
            className={buttonClass(confirm ? "danger" : "ghost")}
          >
            {confirm ? "Click again to remove" : "Remove"}
          </button>
        ) : undefined
      }
    >
      <FormField id={`${list("title")}`} label="Job title" required wide>
        <input
          id={list("title")}
          type="text"
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          placeholder="Senior Developer Advocate"
          maxLength={140}
          className={inputClass()}
          autoFocus
        />
      </FormField>
      <FormField id={list("company")} label="Company" required>
        <input
          id={list("company")}
          type="text"
          value={values.company}
          onChange={(event) => set("company", event.target.value)}
          placeholder="Supabase"
          maxLength={80}
          className={inputClass()}
        />
      </FormField>
      <FormField
        id={list("website")}
        label="Company website"
        help="For the logo: we use the site's icon."
      >
        <input
          id={list("website")}
          type="text"
          inputMode="url"
          value={values.website}
          onChange={(event) => set("website", event.target.value)}
          placeholder="supabase.com"
          maxLength={300}
          className={inputClass()}
        />
      </FormField>
      <FormField id={list("url")} label="Apply link" required wide>
        <input
          id={list("url")}
          type="text"
          inputMode="url"
          value={values.url}
          onChange={(event) => set("url", event.target.value)}
          placeholder="https://jobs.ashbyhq.com/supabase/…"
          maxLength={1000}
          className={inputClass()}
        />
      </FormField>
      <FormField id={list("location")} label="Location" required>
        <input
          id={list("location")}
          type="text"
          list={list("locations")}
          value={values.location}
          onChange={(event) => set("location", event.target.value)}
          placeholder="Remote, Global"
          maxLength={120}
          className={inputClass()}
        />
        <datalist id={list("locations")}>
          {suggestions(["Remote, Global"], used.locations).map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </FormField>
      <FormField id={list("workplace")} label="Workplace">
        <Select
          id={list("workplace")}
          value={values.workplace}
          onChange={(workplace) => set("workplace", workplace)}
          options={WORKPLACE_OPTIONS}
        />
      </FormField>
      <FormField id={list("level")} label="Level">
        <input
          id={list("level")}
          type="text"
          list={list("levels")}
          value={values.level}
          onChange={(event) => set("level", event.target.value)}
          placeholder="Senior"
          maxLength={40}
          className={inputClass()}
        />
        <datalist id={list("levels")}>
          {suggestions(JOB_LEVELS, used.levels).map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </FormField>
      <FormField id={list("type")} label="Type">
        <input
          id={list("type")}
          type="text"
          list={list("types")}
          value={values.job_type}
          onChange={(event) => set("job_type", event.target.value)}
          maxLength={40}
          className={inputClass()}
        />
        <datalist id={list("types")}>
          {suggestions(JOB_TYPES, used.types).map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </FormField>
      <FormField
        id={list("salary")}
        label="Salary"
        help="Optional, as the listing says it."
      >
        <input
          id={list("salary")}
          type="text"
          value={values.salary}
          onChange={(event) => set("salary", event.target.value)}
          placeholder="$150K - $190K"
          maxLength={80}
          className={inputClass()}
        />
      </FormField>
      <FormField id={list("posted")} label="Posted on">
        <input
          id={list("posted")}
          type="date"
          value={values.posted_on}
          max={today}
          onChange={(event) => set("posted_on", event.target.value)}
          className={inputClass()}
        />
      </FormField>
      <FormField
        id={list("category")}
        label="Category"
        help="The board's filter."
      >
        <input
          id={list("category")}
          type="text"
          list={list("categories")}
          value={values.category}
          onChange={(event) => set("category", event.target.value)}
          maxLength={60}
          className={inputClass()}
        />
        <datalist id={list("categories")}>
          {suggestions(JOB_CATEGORIES, used.categories).map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </FormField>
      <FormField
        id={list("tags")}
        label="Tags"
        help="Optional, comma separated. Help people find it in search."
      >
        <input
          id={list("tags")}
          type="text"
          value={values.tags}
          onChange={(event) => set("tags", event.target.value)}
          placeholder="AI, Postgres"
          maxLength={400}
          className={inputClass()}
        />
      </FormField>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={values.live}
            onChange={(event) => set("live", event.target.checked)}
            className="size-4 accent-[var(--i-accent)]"
          />
          Show on the board
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={values.featured}
            onChange={(event) => set("featured", event.target.checked)}
            className="size-4 accent-[var(--i-accent)]"
          />
          Pin to the top
        </label>
      </div>
    </FormDialog>
  );
}
