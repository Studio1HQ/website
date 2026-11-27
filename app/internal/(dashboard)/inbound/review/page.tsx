import type { Metadata } from "next";
import { Card, CardTitle, Notice, PageHeader } from "@/components/internal/ui";
import { ReviewHeldList } from "@/components/internal/inbound/review-held-list";
import { requireInbound } from "@/lib/internal/inbound/access";
import {
  listHeldForReview,
  listSkippedMail,
} from "@/lib/internal/inbound/review";
import { MAIL_KEEP_DAYS } from "@/lib/internal/inbound/rules";
import { INBOUND_MIGRATION_HINT } from "@/lib/internal/inbound/schema";

export const metadata: Metadata = { title: "Review mail" };

const PANEL = "max-h-[26rem] overflow-y-auto lg:max-h-[calc(100dvh-20rem)]";

/**
 * Mail the sorter wasn't sure about, and the mail it skipped. All of the
 * text is from strangers and is shown as plain text.
 */
export default async function InboundReviewPage() {
  await requireInbound();
  const [held, skipped] = await Promise.all([
    listHeldForReview(),
    listSkippedMail(),
  ]);

  const header = (
    <PageHeader
      title="Review mail"
      description="Mail to the leads mailbox that the sorter was not sure about, and what it skipped."
    />
  );
  const problem = [held, skipped].find((load) => !load.ok);
  if (problem && !problem.ok) {
    return (
      <>
        {header}
        <Notice tone="error">
          {problem.missing ? INBOUND_MIGRATION_HINT : problem.message}
        </Notice>
      </>
    );
  }
  if (!held.ok || !skipped.ok) return null;

  return (
    <>
      {header}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle
            action={
              <span className="text-[12.5px] tabular-nums text-[var(--i-muted)]">
                {held.value.length}
              </span>
            }
          >
            Waiting for you
          </CardTitle>
          <p className="px-5 pb-2 text-[12.5px] text-[var(--i-muted)]">
            The sorter wasn&rsquo;t sure about these. Is each one a lead?
          </p>
          <div className={PANEL}>
            <ReviewHeldList mail={held.value} />
          </div>
        </Card>
        <Card>
          <CardTitle
            action={
              <span className="text-[12.5px] tabular-nums text-[var(--i-muted)]">
                {skipped.value.length}
              </span>
            }
          >
            Skipped
          </CardTitle>
          <p className="px-5 pb-2 text-[12.5px] text-[var(--i-muted)]">
            Sorted in the last {MAIL_KEEP_DAYS} days and not made into a lead.
            If one was wrong, add it to the board from here. Mail is deleted
            after {MAIL_KEEP_DAYS} days.
          </p>
          <div className={PANEL}>
            <ReviewHeldList mail={skipped.value} skipped />
          </div>
        </Card>
      </div>
    </>
  );
}
