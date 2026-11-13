"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelScheduledEmail } from "@/app/internal/(dashboard)/email-actions";
import type { DeliveryStatus } from "@/lib/email-delivery";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";

const TONES: Record<DeliveryStatus, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/25" },
  sent: { label: "Sent", className: "bg-[var(--i-sunken)] text-[var(--i-ink-2)] ring-[var(--i-line)]" },
  delayed: { label: "Delayed", className: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/25" },
  delivered: { label: "Delivered", className: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/25" },
  bounced: { label: "Bounced", className: "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/25" },
  complained: { label: "Marked as spam", className: "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/25" },
  failed: { label: "Failed", className: "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/25" },
  suppressed: { label: "Not sent (suppressed)", className: "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/25" },
  canceled: { label: "Canceled", className: "bg-[var(--i-sunken)] text-[var(--i-muted)] ring-[var(--i-line)]" },
};

/** Where an email got to, from Resend's webhook. */
export function DeliveryChip({ status, title }: { status: DeliveryStatus; title?: string }) {
  const tone = TONES[status] ?? TONES.sent;
  return (
    <span
      title={title}
      className={cn("inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-px text-[11px] font-medium ring-1 ring-inset", tone.className)}
    >
      {tone.label}
    </span>
  );
}

/** A Date as a datetime-local input value, in the browser's time zone. */
export function toLocalInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Tomorrow at 10:00 local time: a sensible first pick for a reminder. */
export function defaultSendLater() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return toLocalInput(date);
}

/** The local datetime-local value as an ISO time for the server, or undefined. */
export function sendLaterIso(enabled: boolean, value: string) {
  if (!enabled || !value) return undefined;
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? undefined : time.toISOString();
}

/** "Send later" checkbox and time picker, limited to Resend's 30 days. */
export function SendLaterField({
  enabled,
  onEnabledChange,
  value,
  onValueChange,
  inputClassName,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  inputClassName?: string;
}) {
  const now = Date.now();
  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          className="size-4 accent-[var(--i-accent)]"
        />
        Send later
      </label>
      {enabled ? (
        <input
          type="datetime-local"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          min={toLocalInput(new Date(now + 5 * 60 * 1000))}
          max={toLocalInput(new Date(now + 29 * 24 * 60 * 60 * 1000))}
          aria-label="Send at"
          className={inputClassName}
        />
      ) : null}
    </div>
  );
}

/** "Fri 14 Nov, 10:00" in the browser's time zone. */
export function formatSendLater(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Cancels a scheduled email; asks once more before it does. */
export function CancelScheduledButton({ logId }: { logId: string }) {
  const toast = useToast();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const cancel = () =>
    startTransition(async () => {
      const result = await cancelScheduledEmail(logId);
      setConfirming(false);
      if (result.ok) {
        toast("success", "Scheduled email canceled");
        if (result.warning) toast("error", result.warning);
        router.refresh();
      } else {
        toast("error", result.message);
      }
    });

  return confirming ? (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={cancel}
        disabled={pending}
        className="text-[11.5px] font-medium text-rose-700 underline-offset-2 hover:underline disabled:opacity-60 dark:text-rose-300"
      >
        {pending ? "Canceling…" : "Yes, cancel it"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-[11.5px] text-[var(--i-muted)] underline-offset-2 hover:underline"
      >
        Keep
      </button>
    </span>
  ) : (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-[11.5px] text-[var(--i-muted)] underline-offset-2 hover:text-[var(--i-ink)] hover:underline"
    >
      Cancel
    </button>
  );
}
