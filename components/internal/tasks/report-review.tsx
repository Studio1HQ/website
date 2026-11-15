"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUUpLeft, Check, Copy } from "@phosphor-icons/react";
import { reviewReport } from "@/app/internal/(dashboard)/tasks/actions";
import { useToast } from "@/components/internal/toast";
import { Card, buttonClass, textareaClass } from "@/components/internal/ui";
import type { ReportStatus } from "@/lib/internal/tasks/shared";

/**
 * A founder's read of a submitted report: mark it seen (with an optional
 * note), or send it back with a note saying what to change. The person gets
 * an email when it's sent back.
 */
export function ReportReview({
  id,
  status,
  name,
  note: saved = "",
}: {
  id: string;
  status: ReportStatus;
  name: string;
  /** The founder note already on it (kept when marking seen again). */
  note?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [note, setNote] = useState(status === "seen" ? saved : "");
  const [mode, setMode] = useState<"idle" | "back">("idle");
  const [busy, start] = useTransition();

  const decide = (decision: "seen" | "returned") =>
    start(async () => {
      try {
        const result = await reviewReport(id, decision, note);
        if (result.ok) {
          toast("success", result.message ?? "Saved");
          if (decision === "returned") setNote("");
          setMode("idle");
          router.refresh();
        } else toast("error", result.message);
      } catch {
        toast("error", "Something went wrong. Try again in a minute.");
      }
    });

  if (status !== "submitted" && status !== "seen") return null;
  const first = name.split(" ")[0] || "them";

  return (
    <Card className="p-5">
      <label className="block space-y-1.5">
        <span className="block text-[13px] font-medium">{mode === "back" ? `What should ${first} change?` : "Note (optional)"}</span>
        <span className="block text-[12px] text-[var(--i-muted)]">
          {mode === "back"
            ? `${first} gets this by email, with a link to fix the report and send it again.`
            : `Kept with the report. ${first} sees it on their reports page.`}
        </span>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={2000} className={textareaClass} />
      </label>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {mode === "back" ? (
          <>
            <button type="button" disabled={busy} onClick={() => setMode("idle")} className={buttonClass("ghost")}>
              Cancel
            </button>
            <button type="button" disabled={busy || !note.trim()} onClick={() => decide("returned")} className={buttonClass("danger")}>
              <ArrowUUpLeft size={14} /> Send back to {first}
            </button>
          </>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={() => setMode("back")} className={buttonClass("secondary")}>
              <ArrowUUpLeft size={14} /> Send back
            </button>
            <button type="button" disabled={busy} onClick={() => decide("seen")} className={buttonClass("primary")}>
              <Check size={14} /> {status === "seen" ? "Save note" : "Mark as seen"}
            </button>
          </>
        )}
      </div>
    </Card>
  );
}

/** "Copy as text": the plain-text report, for Slack or a doc. */
export function ReportCopyText({ text }: { text: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast("success", "Report copied as text.");
            setTimeout(() => setCopied(false), 2500);
          } catch {
            setShow(true);
            toast("error", "Couldn't copy. Select the text below and copy it.");
          }
        }}
        className={buttonClass("secondary")}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />} Copy as text
      </button>
      {show ? (
        <div className="basis-full">
          <label htmlFor="report-text" className="mb-1 block text-[12px] text-[var(--i-muted)]">
            The report as text
          </label>
          <textarea
            id="report-text"
            readOnly
            value={text}
            rows={12}
            onFocus={(event) => event.currentTarget.select()}
            className={textareaClass}
          />
        </div>
      ) : null}
    </>
  );
}
