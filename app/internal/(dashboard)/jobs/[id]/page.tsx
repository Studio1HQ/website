import type { Metadata } from "next";
import { FilePdf } from "@phosphor-icons/react/dist/ssr";
import { Answers, RecordView, loadRecord } from "@/components/internal/section-views";
import {
  ExternalLink,
  Field,
  Fields,
  LongText,
  buttonClass,
  relativeDate,
  text,
} from "@/components/internal/ui";

export const metadata: Metadata = { title: "Application" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function JobApplicationPage({ params, searchParams }: Props) {
  const data = await loadRecord("jobs", params, searchParams);
  const { record } = data;
  const workLinks = Array.isArray(record.work_links) ? record.work_links : [];
  return (
    <RecordView
      sectionKey="jobs"
      data={data}
      meta={[
        <span key="role" className="font-medium text-[var(--i-ink-2)]">{text(record.job_title)}</span>,
        text(record.location),
        <span key="applied" suppressHydrationWarning>Applied {relativeDate(record.created_at)}</span>,
      ]}
      actions={
        record.resume_path ? (
          <a
            href={`/internal/jobs/${record.id}/resume`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("accent")}
          >
            <FilePdf size={15} /> Open résumé
          </a>
        ) : null
      }
    >
      <Answers title="Applicant">
        <Fields>
          <Field label="Email">{text(record.email)}</Field>
          <Field label="Location">{text(record.location)}</Field>
          <Field label="LinkedIn">
            <ExternalLink href={record.linkedin} />
          </Field>
          <Field label="Portfolio">
            <ExternalLink href={record.portfolio} />
          </Field>
          <Field label="Can start">{text(record.start_availability)}</Field>
          <Field label="Requisition">{text(record.requisition_id) || text(record.job_id)}</Field>
        </Fields>
      </Answers>
      <Answers title="Work">
        <Fields>
          <Field label={`Work samples (${workLinks.length})`} wide>
            {workLinks.length ? (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {workLinks.map((link, index) => (
                  <li key={index} className="min-w-0">
                    <ExternalLink href={link} />
                  </li>
                ))}
              </ul>
            ) : null}
          </Field>
          <Field label="Plan for the first 90 days" wide>
            <ExternalLink href={record.plan_link} />
          </Field>
        </Fields>
      </Answers>
      <Answers title="Why Studio1">
        <LongText value={record.why} />
      </Answers>
      {data.resumeUrl ? (
        <Answers title="Résumé">
          <iframe
            src={data.resumeUrl}
            title={`Résumé of ${text(record.name)}`}
            className="h-[780px] w-full rounded-lg border border-[var(--i-line)] bg-[var(--i-sunken)]"
          />
          <p className="mt-2 text-[12px] text-[var(--i-faint)]">
            The preview link lasts 10 minutes. Reload the page if it stops working.
          </p>
        </Answers>
      ) : null}
    </RecordView>
  );
}
