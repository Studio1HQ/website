"use client";

import { useState, useTransition } from "react";
import { guarded } from "@/components/internal/guarded";
import { useToast } from "@/components/internal/toast";
import { buttonClass } from "@/components/internal/ui";
import { ReviewMailItem } from "@/components/internal/inbound/review-mail-item";
import { resolveMail as resolveMailAction } from "@/app/internal/(dashboard)/inbound/actions";
import type { ReviewMail } from "@/lib/internal/inbound/review";

const resolveMail = guarded(resolveMailAction);

/**
 * Sorted mail with its buttons: "Lead" and "Not a lead" for mail the sorter
 * held, and one "This was a lead" for mail it skipped. A decision removes
 * the mail from the list at once (the action refreshes the page itself) and
 * the answer shows as a message; a refusal stays under the mail so it can be
 * tried again.
 */
export function ReviewHeldList({
  mail,
  skipped = false,
}: {
  mail: ReviewMail[];
  /** The skipped log: these can only be turned into a lead. */
  skipped?: boolean;
}) {
  const toast = useToast();
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const decide = (id: string, decision: "lead" | "not_lead") => {
    setBusy(id);
    setErrors((current) => ({ ...current, [id]: "" }));
    startTransition(async () => {
      const result = await resolveMail(id, decision);
      setBusy(null);
      if (!result.ok) {
        setErrors((current) => ({ ...current, [id]: result.message }));
        return;
      }
      setGone((current) => new Set(current).add(id));
      toast(
        "success",
        result.message ??
          (decision === "lead"
            ? "Added to the board as a lead."
            : "Marked as not a lead."),
      );
    });
  };

  const shown = mail.filter((item) => !gone.has(item.id));
  if (!shown.length)
    return (
      <p className="px-5 py-10 text-center text-[13px] text-[var(--i-muted)]">
        {skipped ? "Nothing was skipped." : "Nothing is waiting for you."}
      </p>
    );
  return (
    <ul className="divide-y divide-[var(--i-line)]">
      {shown.map((item) => (
        <ReviewMailItem
          key={item.id}
          mail={item}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy === item.id}
                onClick={() => decide(item.id, "lead")}
                className={buttonClass(skipped ? "secondary" : "primary", "sm")}
              >
                {skipped ? "This was a lead" : "Lead"}
              </button>
              {skipped ? null : (
                <button
                  type="button"
                  disabled={busy === item.id}
                  onClick={() => decide(item.id, "not_lead")}
                  className={buttonClass("secondary", "sm")}
                >
                  Not a lead
                </button>
              )}
              {errors[item.id] ? (
                <span
                  role="alert"
                  className="text-[12.5px] text-rose-700 dark:text-rose-300"
                >
                  {errors[item.id]}
                </span>
              ) : null}
            </div>
          }
        />
      ))}
    </ul>
  );
}
