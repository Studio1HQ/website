import type { Metadata } from "next";
import {
  Answers,
  RecordView,
  loadRecord,
} from "@/components/internal/section-views";
import {
  ExternalLink,
  Field,
  Fields,
  LongText,
  relativeDate,
  text,
} from "@/components/internal/ui";
import { supportLabels } from "@/lib/campus-application";

export const metadata: Metadata = { title: "Campus application" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const keys = (value: unknown) =>
  Array.isArray(value) ? value.map(String) : [];

export default async function CampusApplicationPage({
  params,
  searchParams,
}: Props) {
  const data = await loadRecord("campus", params, searchParams);
  const { record } = data;
  const support = supportLabels(keys(record.support));
  const asksFunding = keys(record.support).includes("cash");
  return (
    <RecordView
      sectionKey="campus"
      data={data}
      meta={[
        <span key="community" className="font-medium text-[var(--i-ink-2)]">
          {text(record.community_name)}
        </span>,
        text(record.college),
        <span key="applied" suppressHydrationWarning>
          Applied {relativeDate(record.created_at)}
        </span>,
      ]}
    >
      <Answers title="Their plans">
        <LongText value={record.why_studio1} />
      </Answers>
      <Answers title="The community">
        <Fields>
          <Field label="Name">{text(record.community_name)}</Field>
          <Field label="College or university">{text(record.college)}</Field>
          <Field label="Committee size">{text(record.core_team_size)}</Field>
          <Field label="Average turnout at their events">
            {text(record.event_turnout)}
          </Field>
          <Field label="Link" wide>
            <ExternalLink href={record.community_url} />
          </Field>
        </Fields>
      </Answers>
      <Answers title="What would help">
        <Fields>
          <Field label="They picked" wide>
            {support.length ? (
              support.join(", ")
            ) : (
              <span className="text-[var(--i-faint)]">
                Nothing picked: suggest what fits on the call.
              </span>
            )}
          </Field>
          {asksFunding ? (
            <Field label="Funding: how much and what for" wide>
              <LongText value={record.cash_ask} />
            </Field>
          ) : null}
        </Fields>
      </Answers>
      <Answers title="Applicant">
        <Fields>
          <Field label="Email">{text(record.email)}</Field>
        </Fields>
      </Answers>
    </RecordView>
  );
}
