import type { Metadata } from "next";
import { FilePdf } from "@phosphor-icons/react/dist/ssr";
import { readStoredAnswers } from "@/lib/form-questions";
import { Answers, RecordView, loadRecord } from "@/components/internal/section-views";
import {
  ExternalLink,
  Field,
  Fields,
  LongText,
  buttonClass,
  relativeDate,
  safeUrl,
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
  // The role's own questions (from its brief), in place of the plan link.
  const answers = readStoredAnswers(record.answers);
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
          {record.plan_link ? (
            <Field label="Plan for the role" wide>
              <ExternalLink href={record.plan_link} />
            </Field>
          ) : null}
        </Fields>
      </Answers>
      {answers.length ? (
        <Answers title={`Questions for ${text(record.job_title) || "this role"}`}>
          <div className="space-y-5">
            {answers.map((item) => (
              <div key={item.id}>
                <p className="text-[12.5px] font-medium text-[var(--i-muted)]">{item.question}</p>
                <div className="mt-1 text-[13.5px]">
                  {safeUrl(item.answer) && !/\s/.test(item.answer) ? (
                    <ExternalLink href={item.answer} />
                  ) : (
                    <LongText value={item.answer} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Answers>
      ) : null}
      <Answers title="Why Studio1">
        <LongText value={record.why} />
      </Answers>
      {record.resume_path ? (
        <Answers title="Résumé">
          {/* Through the résumé route, so every load checks the session. */}
          <iframe
            src={`/internal/jobs/${record.id}/resume`}
            title={`Résumé of ${text(record.name)}`}
            className="h-[780px] w-full rounded-lg border border-[var(--i-line)] bg-[var(--i-sunken)]"
          />
          <p className="mt-2 text-[12px] text-[var(--i-faint)]">
            If the preview is blank, use Open résumé at the top of the page.
          </p>
        </Answers>
      ) : null}
    </RecordView>
  );
}
