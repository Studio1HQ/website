"use client";

import { useTransition } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { sendTestEmail } from "@/app/internal/(dashboard)/templates/actions";
import { useToast } from "@/components/internal/toast";
import { buttonClass } from "@/components/internal/ui";

/** Sends the template on show to the signed-in person, from its real sender. */
export function TestSendButton({
  pipeline,
  template,
  to,
  ready,
}: {
  pipeline: string;
  template: string;
  to: string;
  ready: boolean;
}) {
  const toast = useToast();
  const [sending, startSending] = useTransition();
  const send = () =>
    startSending(async () => {
      const result = await sendTestEmail(pipeline, template);
      toast(result.ok ? "success" : "error", result.ok ? `Test sent to ${result.to}` : result.message);
    });

  return (
    <button
      type="button"
      onClick={send}
      disabled={!ready || sending}
      title={ready ? `Sends this email, with sample details, to ${to}` : "Needs RESEND_API_KEY"}
      className={buttonClass("secondary")}
    >
      <PaperPlaneTilt size={14} /> {sending ? "Sending…" : "Send me a test"}
    </button>
  );
}
