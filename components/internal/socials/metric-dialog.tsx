"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMetric,
  saveMetric,
} from "@/app/internal/(dashboard)/socials/actions";
import {
  PLATFORMS,
  STUDIO_ACCOUNT,
  platformInfo,
  type Platform,
  type SocialMetric,
} from "@/lib/internal/socials/schema";
import { useToast } from "@/components/internal/toast";
import { Select } from "@/components/internal/select";
import {
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/internal/ui";
import {
  FormDialog,
  FormField,
  useDialogOpen,
} from "@/components/internal/clients/client-dialog-shell";

/**
 * Log (or correct) one account's numbers for a platform and month. Saving
 * the same account, platform and month again replaces what was there.
 */

type Values = {
  account: string;
  platform: Platform;
  month: string;
  followers: string;
  impressions: string;
  posts: string;
  notes: string;
};

const PLATFORM_OPTIONS = PLATFORMS.map(({ value, label }) => ({
  value,
  label,
}));

export function MetricDialog({
  metric,
  defaults,
  accounts,
  month,
  trigger,
}: {
  /** The month to correct; leave out to log a new one. */
  metric?: SocialMetric;
  /** Adding: start on this account and platform. */
  defaults?: { account: string; platform: Platform };
  /** Accounts logged so far, as suggestions. */
  accounts: readonly string[];
  /** This month, "YYYY-MM": the latest that can be logged. */
  month: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const start = (): Values => ({
    account: metric?.account ?? defaults?.account ?? STUDIO_ACCOUNT,
    platform: metric?.platform ?? defaults?.platform ?? "linkedin",
    month: metric?.month ?? month,
    followers: metric ? String(metric.followers) : "",
    impressions:
      metric?.impressions === null || metric?.impressions === undefined
        ? ""
        : String(metric.impressions),
    posts:
      metric?.posts === null || metric?.posts === undefined
        ? ""
        : String(metric.posts),
    notes: metric?.notes ?? "",
  });
  const [values, setValues] = useState<Values>(start);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, startSaving] = useTransition();
  const [open, setOpen] = useDialogOpen(() => {
    setValues(start());
    setError(null);
    setConfirm(false);
  });
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const unit = platformInfo(values.platform).unit;

  const run = (work: () => ReturnType<typeof saveMetric>) =>
    startSaving(async () => {
      const result = await work().catch(() => ({
        ok: false as const,
        message: "The request failed. Try again in a minute.",
      }));
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Saved");
      setOpen(false);
      router.refresh();
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!values.followers.trim()) {
      setError(`Add the ${unit} at the end of the month.`);
      return;
    }
    setError(null);
    run(() => saveMetric(values));
  };

  const listId = "social-accounts";
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={metric ? "Change the numbers" : "Log a month"}
      description="An account's followers, impressions and posts for one month."
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel="Save"
      footerStart={
        metric ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              confirm ? run(() => deleteMetric(metric.id)) : setConfirm(true)
            }
            className={buttonClass(confirm ? "danger" : "ghost")}
          >
            {confirm ? "Click again to remove" : "Remove this month"}
          </button>
        ) : undefined
      }
    >
      <FormField
        id="social-account"
        label="Account"
        required
        help="Studio1, or a person's name for their own account."
      >
        <input
          id="social-account"
          type="text"
          list={listId}
          value={values.account}
          onChange={(event) => set("account", event.target.value)}
          maxLength={60}
          disabled={Boolean(metric)}
          className={inputClass()}
        />
        <datalist id={listId}>
          {accounts.map((account) => (
            <option key={account} value={account} />
          ))}
        </datalist>
      </FormField>
      <FormField id="social-platform" label="Platform" required>
        <Select
          id="social-platform"
          value={values.platform}
          onChange={(platform) => set("platform", platform)}
          options={PLATFORM_OPTIONS}
          disabled={Boolean(metric)}
        />
      </FormField>
      <FormField id="social-month" label="Month" required>
        <input
          id="social-month"
          type="month"
          value={values.month}
          max={month}
          onChange={(event) => set("month", event.target.value)}
          disabled={Boolean(metric)}
          className={inputClass()}
        />
      </FormField>
      <FormField
        id="social-followers"
        label={`${unit.charAt(0).toUpperCase()}${unit.slice(1)} at month end`}
        required
      >
        <input
          id="social-followers"
          type="text"
          inputMode="numeric"
          value={values.followers}
          onChange={(event) => set("followers", event.target.value)}
          placeholder="1,240"
          maxLength={20}
          className={inputClass()}
          autoFocus
        />
      </FormField>
      <FormField
        id="social-impressions"
        label="Impressions or views in the month"
        help="Optional. From the platform's analytics."
      >
        <input
          id="social-impressions"
          type="text"
          inputMode="numeric"
          value={values.impressions}
          onChange={(event) => set("impressions", event.target.value)}
          placeholder="48k"
          maxLength={20}
          className={inputClass()}
        />
      </FormField>
      <FormField id="social-posts" label="Posts in the month" help="Optional.">
        <input
          id="social-posts"
          type="text"
          inputMode="numeric"
          value={values.posts}
          onChange={(event) => set("posts", event.target.value)}
          placeholder="12"
          maxLength={6}
          className={inputClass()}
        />
      </FormField>
      <FormField
        id="social-notes"
        label="Notes"
        wide
        help="Optional: what drove the month, like a launch or a viral post."
      >
        <textarea
          id="social-notes"
          rows={2}
          value={values.notes}
          onChange={(event) => set("notes", event.target.value)}
          maxLength={500}
          className={textareaClass}
        />
      </FormField>
    </FormDialog>
  );
}
