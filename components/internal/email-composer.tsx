"use client";

import { useMemo, useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { EnvelopeSimple, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { sendEntryEmail } from "@/app/internal/(dashboard)/email-actions";
import {
  DEFAULT_CALL_URL,
  EMAIL_TEMPLATES,
  TEMPLATE_GROUPS,
  fillTemplate,
  renderEmail,
  type EmailVars,
} from "@/lib/internal/email-templates";
import type { EmailPipeline } from "@/lib/internal/email-banners";
import { statusLabel, type SectionKey } from "@/lib/internal/sections";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import { SendLaterField, defaultSendLater, formatSendLater, sendLaterIso } from "@/components/internal/email-delivery";
import { Notice, buttonClass } from "@/components/internal/ui";

const field =
  "block w-full rounded-lg border border-[var(--i-line)] bg-[var(--i-sunken)] px-3 text-[13px] outline-none transition-colors placeholder:text-[var(--i-faint)] focus:border-[var(--i-line-strong)] focus:bg-[var(--i-panel)]";

/** Pick a template, edit it, preview the paper email, send. */
export function EmailComposer({
  sectionKey,
  id,
  to,
  vars,
  currentStatus,
  mailerReady,
}: {
  sectionKey: SectionKey;
  id: string;
  to: string;
  vars: EmailVars;
  currentStatus: string;
  mailerReady: boolean;
}) {
  const templates = EMAIL_TEMPLATES[sectionKey] ?? [];
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [sending, startSending] = useTransition();
  const [templateKey, setTemplateKey] = useState(templates[0]?.key ?? "custom");
  const template = templates.find((item) => item.key === templateKey) ?? templates[0];
  const [subject, setSubject] = useState(() => fillTemplate(template?.subject ?? "", vars));
  const [body, setBody] = useState(() => fillTemplate(template?.body ?? "", vars));
  const [call, setCall] = useState(template?.call ?? false);
  const [callUrl, setCallUrl] = useState(DEFAULT_CALL_URL);
  const [move, setMove] = useState(Boolean(template?.status));
  const [later, setLater] = useState(false);
  const [sendAt, setSendAt] = useState(defaultSendLater);

  const choose = (key: string) => {
    const next = templates.find((item) => item.key === key);
    if (!next) return;
    setTemplateKey(key);
    setSubject(fillTemplate(next.subject, vars));
    setBody(fillTemplate(next.body, vars));
    setCall(next.call);
    setMove(Boolean(next.status));
  };

  const preview = useMemo(
    () =>
      renderEmail({
        body,
        call: call ? { label: "Book a call", url: callUrl } : null,
        reason: `You're getting this because you ${sectionKey === "hackathons" ? "registered for" : "applied for"} ${vars.program} at Studio1.`,
        unsubscribeUrl: "#",
        banner: { pipeline: sectionKey as EmailPipeline, template: templateKey },
        program: vars.program,
        assetBase: "",
      }).html,
    [body, call, callUrl, sectionKey, templateKey, vars.program],
  );

  const moveTo = template?.status && template.status !== currentStatus ? template.status : undefined;
  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    call ? `${body}\n\nBook a call: ${callUrl}` : body,
  )}`;

  const send = () =>
    startSending(async () => {
      const result = await sendEntryEmail(sectionKey, id, {
        template: templateKey,
        subject,
        body,
        call,
        callUrl,
        status: move && moveTo ? moveTo : undefined,
        sendAt: sendLaterIso(later, sendAt),
      });
      if (result.ok) {
        toast(
          "success",
          result.scheduledFor ? `Email to ${to} scheduled for ${formatSendLater(result.scheduledFor)}` : `Email sent to ${to}`,
        );
        setOpen(false);
      } else {
        toast("error", result.message);
      }
    });

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className={buttonClass("secondary")}>
          <EnvelopeSimple size={15} /> Email
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(1040px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]">
          <div className="flex items-center justify-between border-b border-[var(--i-line)] px-5 py-3.5">
            <div>
              <Dialog.Title className="text-[15px] font-medium">Email {vars.first_name}</Dialog.Title>
              <Dialog.Description className="text-[12.5px] text-[var(--i-muted)]">
                To {to}. Replies come to you.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-4 p-5">
              <div role="radiogroup" aria-label="Template" className="space-y-2.5">
                {TEMPLATE_GROUPS.map((group) => {
                  const items = templates.filter((item) => item.group === group);
                  if (!items.length) return null;
                  return (
                    <div key={group}>
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)]">
                        {group}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            role="radio"
                            aria-checked={item.key === templateKey}
                            onClick={() => choose(item.key)}
                            className={cn(
                              "h-8 rounded-lg px-3 text-[12.5px] transition-colors",
                              item.key === templateKey
                                ? "bg-[var(--i-ink)] font-medium text-[var(--i-panel)]"
                                : "text-[var(--i-ink-2)] ring-1 ring-inset ring-[var(--i-line)] hover:bg-[var(--i-hover)]",
                            )}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <label className="block space-y-1.5">
                <span className="text-[12px] text-[var(--i-muted)]">Subject</span>
                <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} className={cn(field, "h-9")} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[12px] text-[var(--i-muted)]">Message</span>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={12}
                  maxLength={10_000}
                  className={cn(field, "resize-y py-2 leading-relaxed")}
                />
              </label>
              <div className="space-y-2.5 rounded-xl border border-[var(--i-line)] p-3">
                <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
                  <input type="checkbox" checked={call} onChange={(event) => setCall(event.target.checked)} className="size-4 accent-[var(--i-accent)]" />
                  Add a &ldquo;Book a call&rdquo; button
                </label>
                {call ? (
                  <input
                    value={callUrl}
                    onChange={(event) => setCallUrl(event.target.value)}
                    aria-label="Call booking link"
                    placeholder="https://cal.com/…"
                    className={cn(field, "h-8")}
                  />
                ) : null}
                {moveTo ? (
                  <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
                    <input type="checkbox" checked={move} onChange={(event) => setMove(event.target.checked)} className="size-4 accent-[var(--i-accent)]" />
                    Also move to {statusLabel(moveTo)}
                    {later ? " now" : ""}
                  </label>
                ) : null}
                {mailerReady ? (
                  <SendLaterField
                    enabled={later}
                    onEnabledChange={setLater}
                    value={sendAt}
                    onValueChange={setSendAt}
                    inputClassName={cn(field, "h-8 w-auto")}
                  />
                ) : null}
              </div>
              {!mailerReady ? (
                <Notice tone="warning">
                  Sending from the dashboard needs a Resend API key in Vercel (RESEND_API_KEY). Until then,
                  open this in your mail app; it keeps the text but not the paper design.
                </Notice>
              ) : null}
            </div>
            <div className="border-t border-[var(--i-line)] bg-[var(--i-sunken)] p-5 lg:border-l lg:border-t-0">
              <p className="mb-2 text-[12px] text-[var(--i-muted)]">Preview</p>
              <iframe
                title="Email preview"
                srcDoc={preview}
                sandbox=""
                className="h-[640px] w-full rounded-xl border border-[var(--i-line)] bg-[#f4efe7]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--i-line)] px-5 py-3">
            <Dialog.Close asChild>
              <button type="button" className={buttonClass("ghost")}>
                Cancel
              </button>
            </Dialog.Close>
            {mailerReady ? (
              <button type="button" onClick={send} disabled={sending || !subject.trim() || !body.trim()} className={buttonClass("accent")}>
                <PaperPlaneTilt size={15} />{" "}
                {later ? (sending ? "Scheduling…" : "Schedule email") : sending ? "Sending…" : "Send email"}
              </button>
            ) : (
              <a href={mailto} className={buttonClass("primary")}>
                <EnvelopeSimple size={15} /> Open in mail app
              </a>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
