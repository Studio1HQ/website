"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, SlackLogo } from "@phosphor-icons/react";
import { postClientWeek } from "@/app/internal/(dashboard)/clients/workspace-actions";
import { useToast } from "@/components/internal/toast";
import { buttonClass, textareaClass } from "@/components/internal/ui";

/**
 * "Copy weekly update": puts the plain-text update for the client on the
 * clipboard. When the browser won't allow it, the text opens below so it
 * can be selected and copied by hand. Everyone in the area can use it.
 */
export function CopyWeekUpdate({ text }: { text: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [showText, setShowText] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast("success", "Weekly update copied. Paste it into Slack or an email.");
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
        {copied ? <Check size={13} /> : <Copy size={13} />} Copy weekly update
      </button>
      {showText ? (
        <div className="basis-full">
          <label
            htmlFor="client-week-text"
            className="mb-1 block text-[12px] text-[var(--i-muted)]"
          >
            The weekly update as text
          </label>
          <textarea
            id="client-week-text"
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

/**
 * Managers' "Post to Slack" for this client's week. Asks once more before
 * it posts. The page shows it only when Slack is connected.
 */
export function PostWeekToSlack({
  clientId,
  week,
}: {
  clientId: string;
  week: string;
}) {
  const toast = useToast();
  const [armed, setArmed] = useState(false);
  const [sending, startSending] = useTransition();

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(timer);
  }, [armed]);

  const post = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    startSending(async () => {
      const result = await postClientWeek(clientId, week).catch(() => ({
        ok: false as const,
        message: "The request failed. Try again in a minute.",
      }));
      if (result.ok) toast("success", result.message ?? "Posted to Slack");
      else toast("error", result.message);
    });
  };

  return (
    <button
      type="button"
      onClick={post}
      disabled={sending}
      className={buttonClass(armed ? "primary" : "secondary", "sm")}
    >
      <SlackLogo size={13} />
      {sending
        ? "Posting…"
        : armed
          ? "Click again to post"
          : "Post to Slack"}
    </button>
  );
}
