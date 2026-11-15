"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import { useToast } from "@/components/internal/toast";
import { buttonClass, textareaClass } from "@/components/internal/ui";

/**
 * "Copy for the client": puts the plain-text report on the clipboard, ready
 * to paste into Slack or an email. When the browser won't allow it, the
 * text opens below so it can be selected and copied by hand.
 */
export function ReportCopyButton({ text }: { text: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [showText, setShowText] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast("success", "Report copied. Paste it into Slack or an email.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setShowText(true);
      toast("error", "Couldn't copy. Select the text below and copy it.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={buttonClass("secondary", "sm")}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />} Copy for the client
      </button>
      {showText ? (
        <div className="basis-full">
          <label
            htmlFor="client-report-text"
            className="mb-1 block text-[12px] text-[var(--i-muted)]"
          >
            The report as text
          </label>
          <textarea
            id="client-report-text"
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
