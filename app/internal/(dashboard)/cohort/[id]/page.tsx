import type { Metadata } from "next";
import { Answers, RecordView, loadRecord } from "@/components/internal/section-views";
import {
  ExternalLink,
  Field,
  Fields,
  LongText,
  StatusBadge,
  relativeDate,
  text,
} from "@/components/internal/ui";

export const metadata: Metadata = { title: "Cohort application" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CohortApplicationPage({ params, searchParams }: Props) {
  const data = await loadRecord("cohort", params, searchParams);
  const { record } = data;
  return (
    <RecordView
      sectionKey="cohort"
      data={data}
      meta={[
        <span key="cohort" className="font-medium text-[var(--i-ink-2)]">DevRel {text(record.cohort)}</span>,
        text(record.role),
        <span key="applied" suppressHydrationWarning>Applied {relativeDate(record.created_at)}</span>,
      ]}
    >
      <Answers title="Applicant">
        <Fields>
          <Field label="Email">{text(record.email)}</Field>
          <Field label="Location">{text(record.location)}</Field>
          <Field label="Role">{text(record.role)}</Field>
          <Field label="Favourite dev tool">{text(record.favorite_tool)}</Field>
          <Field label="Profile">
            <ExternalLink href={record.profile_url} />
          </Field>
          <Field label="Work">
            <ExternalLink href={record.work_url} />
          </Field>
          <Field label="Heard about it from">{text(record.source)}</Field>
          <Field label="Open to partner referrals">{record.partner_consent ? "Yes" : "No"}</Field>
        </Fields>
      </Answers>
      <Answers title="Why DevRel">
        <LongText value={record.why_devrel} />
      </Answers>
      <Answers title="After the program">
        <Fields>
          <Field label="Outcome">
            {record.outcome ? <StatusBadge status={record.outcome} /> : null}
          </Field>
          <Field label="Referred to">{text(record.referred_to)}</Field>
        </Fields>
      </Answers>
    </RecordView>
  );
}
