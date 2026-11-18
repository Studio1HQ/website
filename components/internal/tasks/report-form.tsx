"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FloppyDisk, PaperPlaneTilt } from "@phosphor-icons/react";
import { saveReportDraft, submitReport } from "@/app/internal/(dashboard)/tasks/actions";
import { useToast } from "@/components/internal/toast";
import { Card, buttonClass, textareaClass } from "@/components/internal/ui";
import { reportHref } from "@/lib/internal/tasks/report-status";
import { nextPeriodLabel, type ReportPeriod, type TaskResult } from "@/lib/internal/tasks/shared";

type Words = { highlights: string; blockers: string; next_plan: string };

const FIELDS: { key: keyof Words; label: (period: ReportPeriod) => string; hint: string; rows: number }[] = [
  {
    key: "highlights",
    label: () => "What went well",
    hint: "What you shipped, moved or learned. The lists below already have the details.",
    rows: 5,
  },
  {
    key: "blockers",
    label: () => "Blockers / what you need",
    hint: "Anything stuck, and what would help: a decision, access, a review. Leave it empty if nothing.",
    rows: 4,
  },
  {
    key: "next_plan",
    label: (period) => `Plan for ${nextPeriodLabel(period)}`,
    hint: "The few things you'll focus on.",
    rows: 4,
  },
];

/**
 * The owner's report form: three answers, saved as a draft any time and
 * submitted to the founders once the period is ready (a second click
 * confirms). Submitting freezes the numbers and emails Arindam and Amitesh.
 */
export function ReportForm({
  period,
  start,
  initial,
  ready,
  readyLabel,
  resubmit = false,
}: {
  period: ReportPeriod;
  start: string;
  initial: Words;
  /** The period can be submitted today. */
  ready: boolean;
  /** "Fri 20 Nov", for "You can submit it from …". */
  readyLabel: string;
  /** It was sent back: submitting sends it again. */
  resubmit?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [words, setWords] = useState<Words>(initial);
  const [confirming, setConfirming] = useState(false);
  const [busy, start_] = useTransition();
  const [dirty, setDirty] = useState(false);

  const run = (action: () => Promise<TaskResult>, after?: (result: TaskResult & { ok: true }) => void) =>
    start_(async () => {
      try {
        const result = await action();
        if (result.ok) {
          if (result.message) toast("success", result.message);
          after?.(result);
        } else {
          toast("error", result.message);
        }
      } catch {
        toast("error", "Something went wrong. Try again in a minute.");
      }
    });

  const save = () =>
    run(
      () => saveReportDraft(period, start, words),
      () => {
        setDirty(false);
        router.refresh();
      },
    );

  const submit = () =>
    run(
      () => submitReport(period, start, words),
      (result) => {
        setDirty(false);
        setConfirming(false);
        if (result.id) router.push(reportHref(result.id));
        else router.push("/tasks/reports");
      },
    );

  const empty = !words.highlights.trim() && !words.next_plan.trim();

  return (
    <Card>
      <form
        className="space-y-5 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        {FIELDS.map((field) => (
          <label key={field.key} className="block space-y-1.5">
            <span className="block text-[13px] font-medium">{field.label(period)}</span>
            <span className="block text-[12px] text-[var(--i-muted)]">{field.hint}</span>
            <textarea
              value={words[field.key]}
              onChange={(event) => {
                setWords((current) => ({ ...current, [field.key]: event.target.value }));
                setDirty(true);
                setConfirming(false);
              }}
              rows={field.rows}
              maxLength={4000}
              className={textareaClass}
            />
          </label>
        ))}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--i-line)] pt-4">
          {confirming ? (
            <span className="mr-auto basis-full text-[12.5px] text-[var(--i-muted)] sm:basis-auto">
              This sends it to Arindam and Amitesh by email and freezes the numbers as they are now.
            </span>
          ) : !ready ? (
            <span className="mr-auto basis-full text-[12.5px] text-[var(--i-muted)] sm:basis-auto">
              You can submit it from {readyLabel}. Save a draft until then.
            </span>
          ) : dirty ? (
            <span className="mr-auto basis-full text-[12.5px] text-[var(--i-faint)] sm:basis-auto">Not saved yet</span>
          ) : null}
          <button type="submit" disabled={busy || !dirty} className={buttonClass("secondary")}>
            <FloppyDisk size={14} /> Save draft
          </button>
          {confirming ? (
            <>
              <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={buttonClass("ghost")}>
                Cancel
              </button>
              <button type="button" disabled={busy} onClick={submit} className={buttonClass("accent")}>
                <PaperPlaneTilt size={14} /> {resubmit ? "Yes, send it again" : "Yes, submit"}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy || !ready || empty}
              title={
                !ready
                  ? `You can submit it from ${readyLabel}`
                  : empty
                    ? "Write at least what went well and your plan"
                    : undefined
              }
              onClick={() => setConfirming(true)}
              className={buttonClass("primary")}
            >
              <PaperPlaneTilt size={14} /> {resubmit ? "Submit again" : "Submit to founders"}
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
