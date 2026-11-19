"use client";

import { useFormStatus } from "react-dom";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { buttonClass } from "@/components/internal/ui";

/** The submit button in a post's "Send to DEV" form: off while it sends, so one press makes one draft. */
export function SendToDevButton({
  disabled = false,
  hint,
}: {
  disabled?: boolean;
  hint?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      title={hint}
      className={buttonClass("secondary", "sm")}
    >
      <PaperPlaneTilt size={14} aria-hidden />
      {pending ? "Sending…" : "Send to DEV as draft"}
    </button>
  );
}
