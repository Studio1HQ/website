import type { Metadata } from "next";
import { Answers, RecordView, loadRecord } from "@/components/internal/section-views";
import { ExternalLink, Field, Fields, LongText, relativeDate, text } from "@/components/internal/ui";

export const metadata: Metadata = { title: "Registration" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TEAM: Record<string, string> = {
  solo: "Going solo",
  team: "Has a team",
  looking: "Looking for a team",
};

/** The event's own questions, as saved: [{ id, question, answer }]. */
function eventAnswers(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    item && typeof item === "object" && typeof item.question === "string" && typeof item.answer === "string"
      ? [{ id: String(item.id ?? item.question), question: item.question, answer: item.answer }]
      : [],
  );
}

export default async function HackathonRegistrationPage({ params, searchParams }: Props) {
  const data = await loadRecord("hackathons", params, searchParams);
  const { record } = data;
  const github = text(record.github).replace(/^@/, "");
  const answers = eventAnswers(record.answers);
  return (
    <RecordView
      sectionKey="hackathons"
      data={data}
      meta={[
        <span key="event" className="font-medium text-[var(--i-ink-2)]">{text(record.hackathon_name)}</span>,
        text(record.country),
        <span key="registered" suppressHydrationWarning>Registered {relativeDate(record.created_at)}</span>,
      ]}
    >
      <Answers title="Participant">
        <Fields>
          <Field label="Email">{text(record.email)}</Field>
          <Field label="GitHub">
            {/^[a-z0-9-]{1,39}$/i.test(github) ? (
              <ExternalLink href={`https://github.com/${github}`}>@{github}</ExternalLink>
            ) : (
              github
            )}
          </Field>
          <Field label="Country">{text(record.country)}</Field>
          <Field label="Role">{text(record.role)}</Field>
          <Field label="Experience">{text(record.experience)}</Field>
          <Field label="Heard about it from">{text(record.source)}</Field>
        </Fields>
      </Answers>
      <Answers title="Entry">
        <Fields>
          <Field label="Team">{TEAM[text(record.team)] ?? text(record.team)}</Field>
          <Field label="Team name">{text(record.team_name)}</Field>
          <Field label="Track">{text(record.track)}</Field>
          <Field label="Open to partner referrals">{record.partner_consent ? "Yes" : "No"}</Field>
        </Fields>
      </Answers>
      {answers.length ? (
        <Answers title={`Questions for ${text(record.hackathon_name) || "this hackathon"}`}>
          <Fields>
            {answers.map((item) => (
              <Field key={item.id} label={item.question}>
                {item.answer}
              </Field>
            ))}
          </Fields>
        </Answers>
      ) : null}
      <Answers title="Idea">
        <LongText value={record.idea} />
      </Answers>
    </RecordView>
  );
}
