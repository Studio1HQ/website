"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";
import { deleteDraft } from "@/app/internal/(dashboard)/blog/actions";
import { useToast } from "@/components/internal/toast";
import { buttonClass } from "@/components/internal/ui";

/**
 * Delete a draft from the Posts list: a bin, then "Delete for good?" with
 * Delete and Keep. The server checks it's a draft the person may delete
 * (theirs, or any for reviewers) and takes its uploaded images with it.
 */
export function DeleteDraftButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const remove = () =>
    start(async () => {
      const result = await deleteDraft(id);
      if (!result.ok) {
        toast("error", result.message);
        setAsking(false);
        return;
      }
      toast("success", "Draft deleted.");
      router.refresh();
    });

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        aria-label={`Delete “${title}”`}
        data-tip="Delete draft"
        className={buttonClass("ghost", "sm")}
      >
        <Trash size={14} />
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[12px] text-[var(--i-muted)]">
        Delete for good?
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={remove}
        className={buttonClass("danger", "sm")}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setAsking(false)}
        className={buttonClass("ghost", "sm")}
      >
        Keep
      </button>
    </span>
  );
}
