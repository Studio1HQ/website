"use client";

import { useEffect } from "react";
import { ArrowClockwise, Warning } from "@/components/internal/icons";
import { buttonClass } from "@/components/internal/ui";

/**
 * When a dashboard page breaks. It sits inside the dashboard layout, so the
 * sidebar stays and people can go somewhere else; without it the error
 * fell through to the public site's "Something went wrong" page. Retry
 * re-renders the page; the reference is what shows in the server logs.
 */
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[internal] a dashboard page failed", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-[var(--i-sunken)] text-[var(--i-muted)]">
        <Warning size={20} />
      </span>
      <h1 className="mt-4 text-[17px] font-medium">This page didn&rsquo;t load</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--i-muted)]">
        Something went wrong on our side, not with anything you did. Try again; if it keeps happening, tell Arindam
        which page it was.
      </p>
      {error.digest ? (
        <p className="mt-2 text-[12px] tabular-nums text-[var(--i-faint)]">Reference: {error.digest}</p>
      ) : null}
      <button type="button" onClick={() => unstable_retry()} className={`${buttonClass("accent")} mt-5`}>
        <ArrowClockwise size={15} /> Try again
      </button>
    </div>
  );
}
