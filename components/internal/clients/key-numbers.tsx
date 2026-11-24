"use client";

import { useAfterSave } from "@/components/internal/clients/use-after-save";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartLineUp,
  Minus,
  PencilSimple,
  Plus,
} from "@/components/internal/icons";
import { saveMilestone as saveMilestoneAction } from "@/app/internal/(dashboard)/clients/actions";
import { guarded } from "@/components/internal/guarded";
import { parseCount } from "@/lib/internal/clients/clean";
import {
  numberRuns,
  readingTitle,
  signed,
  stepFor,
  type NumberRun,
} from "@/lib/internal/clients/numbers";
import {
  formatDay,
  todayKey,
  type Milestone,
} from "@/lib/internal/clients/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import { DateField } from "@/components/internal/pickers";
import { Card, buttonClass, inputClass } from "@/components/internal/ui";
import {
  FormDialog,
  FormField,
} from "@/components/internal/clients/client-dialog-shell";

const saveMilestone = guarded(saveMilestoneAction);

/**
 * The client's key numbers (GitHub stars, Discord members…): the latest
 * value, the change since the reading before and since the first one, and
 * an Update that adds a new dated reading (− / + to nudge it, or type it).
 * Readings are milestones with a number, so the climb is kept.
 */

const format = (value: number) => value.toLocaleString("en-US");

const IDEAS = [
  "GitHub stars",
  "Discord members",
  "X followers",
  "LinkedIn followers",
  "npm downloads a week",
  "Newsletter subscribers",
];

export function KeyNumbers({
  engagementId,
  milestones,
}: {
  /** Where new readings go. */
  engagementId: string;
  milestones: readonly Milestone[];
}) {
  const today = todayKey();
  const runs = numberRuns(milestones);
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 px-5 py-3">
        <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-[var(--i-muted)]">
          <ChartLineUp size={15} />
          Key numbers
        </span>
        {runs.length ? (
          runs.map((run) => {
            const change = run.previous
              ? run.latest.value - run.previous.value
              : 0;
            return (
              <span
                key={run.metric}
                className="group/number inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]"
                title={`Updated ${formatDay(run.latest.happened_on, today)}${
                  run.readings.length > 1
                    ? ` · ${signed(run.latest.value - run.first.value, format)} since ${formatDay(run.first.happened_on, today)}`
                    : ""
                }`}
              >
                <span className="text-[var(--i-muted)]">{run.metric}</span>
                <span className="font-medium tabular-nums">
                  {format(run.latest.value)}
                </span>
                {run.previous ? (
                  <span className="inline-flex items-center gap-1 text-[12px]">
                    <Change value={change} />
                    <span className="text-[var(--i-faint)]">
                      since {formatDay(run.previous.happened_on, today)}
                    </span>
                  </span>
                ) : null}
                <NumberDialog
                  engagementId={engagementId}
                  run={run}
                  trigger={
                    <button
                      type="button"
                      aria-label={`Update ${run.metric}`}
                      title={`Update ${run.metric}`}
                      className="flex size-6 items-center justify-center rounded-md text-[var(--i-faint)] transition-colors hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                    >
                      <PencilSimple size={13} />
                    </button>
                  }
                />
              </span>
            );
          })
        ) : (
          <span className="text-[12.5px] text-[var(--i-faint)]">
            Stars, members, followers: track them and update as they move.
          </span>
        )}
        <span className="flex-1" />
        <NumberDialog
          engagementId={engagementId}
          trigger={
            <button type="button" className={buttonClass("ghost", "sm")}>
              <Plus size={13} /> Track a number
            </button>
          }
        />
      </div>
    </Card>
  );
}

/** +120 in green with an up arrow, −5 in red with a down arrow. */
function Change({ value }: { value: number }) {
  if (!value) return <span className="text-[var(--i-muted)]">No change</span>;
  const up = value > 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium tabular-nums",
        up
          ? "text-emerald-700 dark:text-emerald-300"
          : "text-rose-700 dark:text-rose-300",
      )}
    >
      <Arrow size={12} weight="bold" aria-hidden />
      {signed(value, format)}
    </span>
  );
}

/** Update a number (run given) or start tracking a new one. */
function NumberDialog({
  engagementId,
  run,
  trigger,
}: {
  engagementId: string;
  run?: NumberRun;
  trigger: ReactNode;
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const start = () => ({
    metric: run?.metric ?? "",
    value: run ? String(run.latest.value) : "",
    day: todayKey(),
    notes: "",
  });
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(start);
  const [error, setError] = useState<string | null>(null);
  const [busy, startSaving] = useTransition();
  const set = <K extends keyof ReturnType<typeof start>>(
    key: K,
    value: ReturnType<typeof start>[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const number = parseCount(values.value);
  const nudge = (by: -1 | 1) => {
    const base = number ?? run?.latest.value ?? 0;
    set("value", String(Math.max(0, base + by * stepFor(base))));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const metric = values.metric.trim();
    if (!metric) {
      setError("Say what's being counted, like GitHub stars.");
      return;
    }
    if (number === null) {
      setError("Type the number, like 1600 or 1.6k.");
      return;
    }
    startSaving(async () => {
      const result = await saveMilestone(null, {
        engagement_id: engagementId,
        happened_on: values.day,
        title: readingTitle(metric, number),
        metric,
        value: String(number),
        notes: values.notes,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast(
        "success",
        run
          ? `${metric}: ${format(number)} (${signed(number - run.latest.value, format)})`
          : `Tracking ${metric}`,
      );
      setOpen(false);
      afterSave();
    });
  };

  const change = run && number !== null ? number - run.latest.value : null;

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setValues(start());
          setError(null);
        }
        setOpen(next);
      }}
      trigger={trigger}
      title={run ? `Update ${run.metric}` : "Track a number"}
      description="A new dated reading; earlier ones stay, so the climb shows."
      width="sm"
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel={run ? "Save reading" : "Start tracking"}
    >
      {run ? null : (
        <FormField id="number-metric" label="What's counted" required wide>
          <input
            id="number-metric"
            type="text"
            list="number-ideas"
            maxLength={60}
            required
            value={values.metric}
            onChange={(event) => set("metric", event.target.value)}
            placeholder="GitHub stars"
            className={inputClass()}
          />
          <datalist id="number-ideas">
            {IDEAS.map((idea) => (
              <option key={idea} value={idea} />
            ))}
          </datalist>
        </FormField>
      )}
      <FormField
        id="number-value"
        label={run ? "Now" : "Number"}
        required
        wide
        help={
          change !== null
            ? `${signed(change, format)} since the last reading (${format(run!.latest.value)} on ${formatDay(run!.latest.happened_on, todayKey())})`
            : "Type it, or nudge it with − and +."
        }
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Less"
            onClick={() => nudge(-1)}
            className={buttonClass("secondary")}
          >
            <Minus size={14} />
          </button>
          <input
            id="number-value"
            type="text"
            inputMode="numeric"
            required
            maxLength={20}
            value={values.value}
            onChange={(event) => set("value", event.target.value)}
            placeholder="1600 or 1.6k"
            className={cn(inputClass(), "text-center tabular-nums")}
          />
          <button
            type="button"
            aria-label="More"
            onClick={() => nudge(1)}
            className={buttonClass("secondary")}
          >
            <Plus size={14} />
          </button>
        </div>
      </FormField>
      <FormField id="number-day" label="As of" required>
        <DateField
          id="number-day"
          value={values.day}
          onChange={(next) => set("day", next)}
          max={todayKey()}
          required
        />
      </FormField>
      <FormField id="number-notes" label="Note">
        <input
          id="number-notes"
          type="text"
          maxLength={200}
          value={values.notes}
          onChange={(event) => set("notes", event.target.value)}
          placeholder="After the launch thread"
          className={inputClass()}
        />
      </FormField>
    </FormDialog>
  );
}
