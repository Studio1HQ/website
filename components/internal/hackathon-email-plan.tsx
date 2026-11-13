"use client";

import { useRouter } from "next/navigation";
import { CheckCircle, EnvelopeSimple } from "@phosphor-icons/react";
import type { PlanStepStatus } from "@/lib/internal/data";
import { formatDay, relativeDay } from "@/lib/internal/community/schema";
import { cn } from "@/lib/utils";
import { BulkEmailDialog } from "@/components/internal/bulk-email-dialog";
import { formatSendLater } from "@/components/internal/email-delivery";
import { buttonClass } from "@/components/internal/ui";

/**
 * One hackathon's emails, step by step: when each is best sent, who it's
 * for, and how far it got. Nothing sends on its own; "Write email" opens
 * the step's template for everyone who hasn't had it yet, set to go out at
 * 10:00 on the suggested day when that's ahead.
 */
export function HackathonEmailPlan({
  steps,
  today,
  canEdit,
  sender,
  mailerReady,
}: {
  steps: PlanStepStatus[];
  /** YYYY-MM-DD in India. */
  today: string;
  canEdit: boolean;
  sender: string;
  mailerReady: boolean;
}) {
  const router = useRouter();
  return (
    <section className="rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] shadow-[var(--i-shadow-sm)]">
      <div className="border-b border-[var(--i-line)] px-5 py-3">
        <h2 className="text-[13px] font-medium">Email plan</h2>
        <p className="mt-0.5 text-[12px] text-[var(--i-muted)]">
          Nothing goes out on its own. Write each email when it&apos;s due, or schedule it up to 30 days ahead.
          People who already have one aren&apos;t sent it again.
        </p>
      </div>
      <ol className="divide-y divide-[var(--i-line)]">
        {steps.map((step, index) => {
          const done = step.total > 0 && step.remaining.length === 0;
          const due = step.on <= today && step.remaining.length > 0;
          return (
            <li key={step.template} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[11.5px] font-medium tabular-nums ring-1 ring-inset",
                  done
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25"
                    : due
                      ? "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/25"
                      : "bg-[var(--i-sunken)] text-[var(--i-muted)] ring-[var(--i-line)]",
                )}
              >
                {done ? <CheckCircle size={14} weight="fill" /> : index + 1}
              </span>
              <span className="min-w-0 flex-1 basis-56">
                <span className="block text-[13px] font-medium">{step.label}</span>
                <span className="block text-[12px] text-[var(--i-muted)]">
                  {step.when} · {formatDay(step.on, today)}
                  <span className={due ? "text-amber-700 dark:text-amber-300" : "text-[var(--i-faint)]"}>
                    {" "}
                    ({relativeDay(step.on, today).toLowerCase()})
                  </span>
                </span>
              </span>
              <span className="min-w-0 basis-56 text-[12.5px] text-[var(--i-ink-2)]">
                {step.total === 0 ? (
                  <span className="text-[var(--i-muted)]">No one confirmed yet</span>
                ) : (
                  <>
                    {step.sent ? `Sent to ${step.sent}` : ""}
                    {step.sent && step.scheduled ? " · " : ""}
                    {step.scheduled && step.nextScheduled
                      ? `Scheduled for ${step.scheduled} (${formatSendLater(step.nextScheduled)})`
                      : ""}
                    {!step.sent && !step.scheduled ? "Not sent yet" : ""}
                    <span className="text-[var(--i-faint)]">
                      {" "}
                      · {step.total} {step.audienceLabel.toLowerCase()}
                    </span>
                  </>
                )}
              </span>
              <span className="ml-auto shrink-0">
                {canEdit && step.remaining.length ? (
                  <BulkEmailDialog
                    sectionKey="hackathons"
                    recipients={step.remaining}
                    sender={sender}
                    mailerReady={mailerReady}
                    initialTemplate={step.template}
                    initialSendAt={step.sendAt}
                    onSent={() => router.refresh()}
                  >
                    <button type="button" className={buttonClass(due ? "primary" : "secondary", "sm")}>
                      <EnvelopeSimple size={13} />
                      {step.sent || step.scheduled ? `Send to the other ${step.remaining.length}` : `Write email (${step.remaining.length})`}
                    </button>
                  </BulkEmailDialog>
                ) : done ? (
                  <span className="text-[12px] text-emerald-700 dark:text-emerald-300">Everyone has it</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
