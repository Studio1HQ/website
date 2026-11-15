"use client";

import { useAfterSave } from "@/components/internal/clients/use-after-save";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { PencilSimple, Plus, Trash, Trophy } from "@phosphor-icons/react";
import {
  removeMilestone,
  saveMilestone,
} from "@/app/internal/(dashboard)/clients/actions";
import {
  formatDay,
  todayKey,
  type Milestone,
} from "@/lib/internal/clients/schema";
import { useToast } from "@/components/internal/toast";
import { DateField } from "@/components/internal/pickers";
import {
  Card,
  CardTitle,
  ExternalLink,
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/internal/ui";
import {
  FormDialog,
  FormField,
} from "@/components/internal/clients/client-dialog-shell";

/**
 * An engagement's wins, newest first: "1,000 GitHub stars", "#3 trending in
 * Go". A milestone with a metric and a number also feeds the line on top
 * ("GitHub stars: 400 → 1,500 in 19 days"). Anyone in client work adds
 * them; a client manager or whoever added one changes it.
 */

type Viewer = { email: string; manager: boolean };

const METRIC_IDEAS = [
  "GitHub stars",
  "Discord members",
  "X followers",
  "npm downloads",
  "Newsletter subscribers",
  "Trendshift rank",
];

export function Milestones({
  engagementId,
  milestones,
  viewer,
}: {
  engagementId: string;
  milestones: readonly Milestone[];
  viewer: Viewer;
}) {
  const today = todayKey();
  const may = (item: Milestone) =>
    viewer.manager ||
    item.created_by?.toLowerCase() === viewer.email.toLowerCase();

  return (
    <Card className="h-fit">
      <CardTitle
        action={
          <MilestoneDialog
            engagementId={engagementId}
            trigger={
              <button type="button" className={buttonClass("ghost", "sm")}>
                <Plus size={13} /> Add milestone
              </button>
            }
          />
        }
      >
        Milestones{" "}
        <span className="font-normal text-[var(--i-faint)]">
          {milestones.length}
        </span>
      </CardTitle>

      {milestones.length ? (
        <ol className="divide-y divide-[var(--i-line)]">
          {milestones.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-5 py-2.5">
              <span className="w-14 shrink-0 pt-px text-[12px] tabular-nums text-[var(--i-muted)]">
                {formatDay(item.happened_on, today)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] leading-snug">
                  {item.url ? (
                    <ExternalLink href={item.url}>{item.title}</ExternalLink>
                  ) : (
                    item.title
                  )}
                </p>
                {item.notes ? (
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--i-muted)]">
                    {item.notes}
                  </p>
                ) : null}
              </div>
              {may(item) ? (
                <MilestoneDialog
                  engagementId={engagementId}
                  milestone={item}
                  trigger={
                    <button
                      type="button"
                      aria-label={`Edit ${item.title}`}
                      title="Edit"
                      className={buttonClass("ghost", "sm")}
                    >
                      <PencilSimple size={13} />
                    </button>
                  }
                />
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex items-start gap-2.5 px-5 py-5 text-[13px] text-[var(--i-muted)]">
          <Trophy size={16} className="mt-0.5 shrink-0" />
          Add wins as they happen: star counts, a trending spot, a post that
          took off. A number with what it counts (GitHub stars) shows the climb
          here.
        </div>
      )}
    </Card>
  );
}

type Values = {
  happened_on: string;
  title: string;
  metric: string;
  value: string;
  url: string;
  notes: string;
};

function startValues(item?: Milestone): Values {
  return {
    happened_on: item?.happened_on ?? todayKey(),
    title: item?.title ?? "",
    metric: item?.metric ?? "",
    value:
      item?.value === null || item?.value === undefined
        ? ""
        : String(item.value),
    url: item?.url ?? "",
    notes: item?.notes ?? "",
  };
}

function MilestoneDialog({
  engagementId,
  milestone,
  trigger,
}: {
  engagementId: string;
  milestone?: Milestone;
  trigger: ReactNode;
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const [open, setOpenState] = useState(false);
  const [values, setValues] = useState<Values>(() => startValues(milestone));
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const setOpen = (next: boolean) => {
    if (next) {
      setValues(startValues(milestone));
      setError(null);
      setConfirm(false);
    }
    setOpenState(next);
  };
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    start(async () => {
      const result = await saveMilestone(milestone?.id ?? null, {
        ...values,
        ...(milestone ? {} : { engagement_id: engagementId }),
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Saved");
      setOpen(false);
      afterSave();
    });
  };

  const remove = () => {
    if (!milestone) return;
    if (!confirm) {
      setConfirm(true);
      timer.current = setTimeout(() => setConfirm(false), 5000);
      return;
    }
    start(async () => {
      const result = await removeMilestone(milestone.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Removed");
      setOpen(false);
      afterSave();
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={milestone ? "Edit milestone" : "Add a milestone"}
      description="A dated win for this client, with a number if there is one."
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel={milestone ? "Save" : "Add milestone"}
      footerStart={
        milestone ? (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className={buttonClass(confirm ? "danger" : "ghost", "sm")}
          >
            <Trash size={13} /> {confirm ? "Click again to remove" : "Remove"}
          </button>
        ) : undefined
      }
    >
      <FormField id="milestone-title" label="What happened" required wide>
        <input
          id="milestone-title"
          type="text"
          required
          maxLength={200}
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          placeholder="1,000 GitHub stars"
          className={inputClass()}
        />
      </FormField>
      <FormField id="milestone-date" label="Date" required>
        <DateField
          id="milestone-date"
          value={values.happened_on}
          onChange={(next) => set("happened_on", next)}
          max={todayKey()}
          required
        />
      </FormField>
      <FormField id="milestone-url" label="Link">
        <input
          id="milestone-url"
          type="url"
          inputMode="url"
          maxLength={1000}
          value={values.url}
          onChange={(event) => set("url", event.target.value)}
          placeholder="https://"
          className={inputClass()}
        />
      </FormField>
      <FormField
        id="milestone-metric"
        label="What's counted"
        help="Optional. The same name each time draws the climb."
      >
        <input
          id="milestone-metric"
          type="text"
          list="milestone-metric-ideas"
          maxLength={60}
          value={values.metric}
          onChange={(event) => set("metric", event.target.value)}
          placeholder="GitHub stars"
          className={inputClass()}
        />
        <datalist id="milestone-metric-ideas">
          {METRIC_IDEAS.map((idea) => (
            <option key={idea} value={idea} />
          ))}
        </datalist>
      </FormField>
      <FormField id="milestone-value" label="Number">
        <input
          id="milestone-value"
          type="text"
          inputMode="numeric"
          maxLength={20}
          value={values.value}
          onChange={(event) => set("value", event.target.value)}
          placeholder="1000 or 1k"
          className={`${inputClass()} tabular-nums`}
        />
      </FormField>
      <FormField id="milestone-notes" label="Notes" wide>
        <textarea
          id="milestone-notes"
          rows={2}
          maxLength={2000}
          value={values.notes}
          onChange={(event) => set("notes", event.target.value)}
          className={textareaClass}
        />
      </FormField>
    </FormDialog>
  );
}
