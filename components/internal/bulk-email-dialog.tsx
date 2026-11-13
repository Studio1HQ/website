"use client";

import { useMemo, useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Copy, EnvelopeSimple, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { sendBulkEmail } from "@/app/internal/(dashboard)/bulk-email-actions";
import { firstName } from "@/lib/first-name";
import { isEmailAddress } from "@/lib/form-checks";
import { isEmailPipeline } from "@/lib/internal/email-banners";
import {
  DEFAULT_CALL_URL,
  EMAIL_TEMPLATES,
  TEMPLATE_GROUPS,
  fillTemplate,
  reasonFor,
  renderEmail,
  unfilledParts,
} from "@/lib/internal/email-templates";
import { statusLabel, type SectionKey } from "@/lib/internal/sections";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/internal/toast";
import {
  SendLaterField,
  defaultSendLater,
  formatSendLater,
  sendLaterIso,
  toLocalInput,
} from "@/components/internal/email-delivery";
import { Avatar, Notice, buttonClass, inputClass, textareaClass } from "@/components/internal/ui";

/** The suggested send time as the picker's value, or null. */
function initialPickerValue(iso: string | undefined) {
  const at = iso ? new Date(iso) : null;
  return at && !Number.isNaN(at.getTime()) && at.getTime() > Date.now() ? toLocalInput(at) : null;
}

/** A token for one send, for the server's idempotency key. */
function newNonce() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export type Recipient = { id: string; name: string; email: string; program: string };

/** The most one send takes; bigger lists go in batches of this size. */
const BATCH = 100;

/** Resend holds a scheduled email for up to 30 days. */
const MAX_AHEAD_MS = 29 * 24 * 60 * 60 * 1000;

/**
 * One template to everyone selected. The message keeps {first_name},
 * {program} and {sender}, filled in per person when it sends; the preview
 * shows any recipient's copy. Sending takes two clicks. More than BATCH
 * people go in batches, one after another.
 */
export function BulkEmailDialog({
  sectionKey,
  recipients,
  sender,
  mailerReady,
  onSent,
  initialTemplate,
  initialSendAt,
  children,
}: {
  sectionKey: SectionKey;
  recipients: Recipient[];
  sender: string;
  mailerReady: boolean;
  onSent: () => void;
  /** The template it opens on (the email plan's step). */
  initialTemplate?: string;
  /** Suggested send time (ISO): starts on "Send later" when it's ahead and within Resend's 30 days. */
  initialSendAt?: string;
  children: React.ReactNode;
}) {
  const templates = EMAIL_TEMPLATES[sectionKey] ?? [];
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [sending, startSending] = useTransition();
  const [templateKey, setTemplateKey] = useState(
    templates.some((item) => item.key === initialTemplate) ? initialTemplate! : (templates[0]?.key ?? "custom"),
  );
  const template = templates.find((item) => item.key === templateKey) ?? templates[0];
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [call, setCall] = useState(template?.call ?? false);
  const [callUrl, setCallUrl] = useState(DEFAULT_CALL_URL);
  const [move, setMove] = useState(Boolean(template?.status));
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [later, setLater] = useState(() => {
    const at = initialSendAt ? Date.parse(initialSendAt) : Number.NaN;
    return at > Date.now() + 10 * 60 * 1000 && at < Date.now() + MAX_AHEAD_MS;
  });
  const [sendAt, setSendAt] = useState(() =>
    initialPickerValue(initialSendAt) ?? defaultSendLater(),
  );
  // One per send from this dialog: a retry of the same send goes out once,
  // and the next send gets a fresh token.
  const [nonce, setNonce] = useState(newNonce);

  const reachable = recipients.filter((person) => isEmailAddress(person.email));
  const unfilled = unfilledParts(`${subject}\n${body}`);
  const unreachable = recipients.length - reachable.length;
  const previewPerson = reachable.find((person) => person.id === previewId) ?? reachable[0];
  const vars = useMemo(
    () => ({ first_name: firstName(previewPerson?.name ?? ""), program: previewPerson?.program ?? "", sender }),
    [previewPerson?.name, previewPerson?.program, sender],
  );
  const moveTo = template?.status;

  const choose = (key: string) => {
    const next = templates.find((item) => item.key === key);
    if (!next) return;
    setTemplateKey(key);
    setSubject(next.subject);
    setBody(next.body);
    setCall(next.call);
    setMove(Boolean(next.status));
    setConfirming(false);
  };

  const preview = useMemo(
    () =>
      renderEmail({
        body: fillTemplate(body, vars),
        call: call ? { label: "Book a call", url: callUrl } : null,
        reason: reasonFor(sectionKey, vars.program),
        unsubscribeUrl: "#",
        banner: isEmailPipeline(sectionKey) ? { pipeline: sectionKey, template: templateKey } : undefined,
        program: vars.program,
        assetBase: "",
      }).html,
    [body, call, callUrl, sectionKey, templateKey, vars.first_name, vars.program, vars.sender],
  );

  const send = () =>
    startSending(async () => {
      const ids = reachable.map((person) => person.id);
      const options = {
        template: templateKey,
        subject,
        body,
        call,
        callUrl,
        status: move && moveTo ? moveTo : undefined,
        sendAt: sendLaterIso(later, sendAt),
      };
      let sent = 0;
      let skipped = 0;
      let blocked = 0;
      let scheduledFor: string | undefined;
      const warnings: string[] = [];
      let failure: string | null = null;
      for (let start = 0; start < ids.length; start += BATCH) {
        const batch = ids.slice(start, start + BATCH);
        // Each batch gets its own key: a retry of the same batch goes out once.
        const result = await sendBulkEmail(sectionKey, batch, {
          ...options,
          nonce: ids.length > BATCH ? `${nonce}-${start / BATCH}` : nonce,
        });
        if (!result.ok) {
          failure = result.message;
          break;
        }
        sent += result.sent;
        skipped += result.skipped ?? 0;
        blocked += result.blocked ?? 0;
        scheduledFor = result.scheduledFor ?? scheduledFor;
        if (result.warning) warnings.push(result.warning);
      }
      setConfirming(false);
      if (sent > 0 || !failure) {
        const skips = [
          skipped ? `skipped ${skipped} without an address` : "",
          blocked ? `skipped ${blocked} that bounced or complained before` : "",
        ].filter(Boolean);
        toast(
          "success",
          `${scheduledFor ? "Scheduled" : "Sent"} ${sent} ${sent === 1 ? "email" : "emails"}${
            scheduledFor ? ` for ${formatSendLater(scheduledFor)}` : ""
          }${skips.length ? `, ${skips.join(", ")}` : ""}`,
        );
        for (const warning of warnings) toast("error", warning);
      }
      if (failure) {
        toast(
          "error",
          sent > 0
            ? `Stopped after ${sent}: ${failure} Open it again to send the rest.`
            : failure,
        );
      }
      setNonce(newNonce());
      if (!failure) setOpen(false);
      if (sent > 0 || !failure) onSent();
    });

  const copyAddresses = () => {
    void navigator.clipboard.writeText(reachable.map((person) => person.email).join(", "));
    toast("success", `Copied ${reachable.length} addresses. Paste them into Bcc.`);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setConfirming(false);
      }}
    >
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(1080px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]">
          <div className="flex items-center justify-between border-b border-[var(--i-line)] px-5 py-3.5">
            <div>
              <Dialog.Title className="text-[15px] font-medium">
                Email {reachable.length} {reachable.length === 1 ? "person" : "people"}
              </Dialog.Title>
              <Dialog.Description className="text-[12.5px] text-[var(--i-muted)]">
                Everyone gets their own copy with their own name. Replies come to you.
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
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--i-faint)]">{group}</p>
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
                <input
                  value={subject}
                  onChange={(event) => {
                    setSubject(event.target.value);
                    setConfirming(false);
                  }}
                  maxLength={200}
                  className={inputClass()}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[12px] text-[var(--i-muted)]">
                  Message. <span className="text-[var(--i-faint)]">{"{first_name}"} and {"{program}"} fill in for each person.</span>
                </span>
                <textarea
                  value={body}
                  onChange={(event) => {
                    setBody(event.target.value);
                    setConfirming(false);
                  }}
                  rows={11}
                  maxLength={10_000}
                  className={textareaClass}
                />
              </label>
              <div className="space-y-2.5 rounded-xl border border-[var(--i-line)] p-3">
                <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
                  <input type="checkbox" checked={call} onChange={(event) => setCall(event.target.checked)} className="size-4 accent-[var(--i-accent)]" />
                  Add a &ldquo;Book a call&rdquo; button
                </label>
                {call ? (
                  <input value={callUrl} onChange={(event) => setCallUrl(event.target.value)} aria-label="Call booking link" className={inputClass("sm")} />
                ) : null}
                {moveTo ? (
                  <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
                    <input type="checkbox" checked={move} onChange={(event) => setMove(event.target.checked)} className="size-4 accent-[var(--i-accent)]" />
                    Also move everyone to {statusLabel(moveTo)}
                    {later ? " now" : ""}
                  </label>
                ) : null}
                {mailerReady ? (
                  <SendLaterField
                    enabled={later}
                    onEnabledChange={(next) => {
                      setLater(next);
                      setConfirming(false);
                    }}
                    value={sendAt}
                    onValueChange={(next) => {
                      setSendAt(next);
                      setConfirming(false);
                    }}
                    inputClassName={cn(inputClass("sm"), "w-auto")}
                  />
                ) : null}
              </div>
              <div>
                <p className="mb-1.5 text-[12px] text-[var(--i-muted)]">
                  Recipients{unreachable ? ` · ${unreachable} without an email address will be skipped` : ""}
                </p>
                <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {reachable.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => setPreviewId(person.id)}
                      title={`Preview ${person.email}'s copy`}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-[12px] ring-1 ring-inset",
                        person.id === previewPerson?.id
                          ? "bg-[var(--i-accent-soft)] text-[var(--i-accent-text)] ring-[var(--i-accent)]"
                          : "ring-[var(--i-line)] hover:bg-[var(--i-hover)]",
                      )}
                    >
                      <Avatar name={person.name} email={person.email} size={24} />
                      {person.name || person.email}
                    </button>
                  ))}
                </div>
              </div>
              {unfilled.length ? (
                <Notice tone="warning">
                  Fill in the parts in brackets before sending: {unfilled.map((part) => `[${part}]`).join(", ")}.
                </Notice>
              ) : null}
              {!mailerReady ? (
                <Notice tone="warning">
                  Sending from the dashboard needs a Resend API key in Vercel (RESEND_API_KEY). Until then,
                  copy the addresses into Bcc in your mail app.
                </Notice>
              ) : null}
            </div>
            <div className="border-t border-[var(--i-line)] bg-[var(--i-sunken)] p-5 lg:border-l lg:border-t-0">
              <p className="mb-2 text-[12px] text-[var(--i-muted)]">
                Preview for <span className="font-medium text-[var(--i-ink)]">{previewPerson?.name || previewPerson?.email}</span>
                {reachable.length > 1 ? " · click a recipient to see their copy" : ""}
              </p>
              <iframe
                title="Email preview"
                srcDoc={preview}
                sandbox=""
                className="h-[640px] w-full rounded-xl border border-[var(--i-line)] bg-[#f4efe7]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--i-line)] px-5 py-3">
            {confirming ? (
              <span className="mr-auto text-[12.5px] text-[var(--i-muted)]">
                {later && sendLaterIso(later, sendAt)
                  ? `This schedules ${reachable.length} ${reachable.length === 1 ? "email" : "emails"} for ${formatSendLater(sendLaterIso(later, sendAt)!)}`
                  : `This sends ${reachable.length} ${reachable.length === 1 ? "email" : "emails"} now`}
                {move && moveTo ? ` and moves everyone to ${statusLabel(moveTo)} now` : ""}. Anyone who bounced or
                complained before is skipped.
              </span>
            ) : null}
            <Dialog.Close asChild>
              <button type="button" className={buttonClass("ghost")}>
                Cancel
              </button>
            </Dialog.Close>
            {mailerReady ? (
              confirming ? (
                <button type="button" onClick={send} disabled={sending} className={buttonClass("accent")}>
                  <PaperPlaneTilt size={15} />{" "}
                  {sending ? (later ? "Scheduling…" : "Sending…") : `Yes, ${later ? "schedule" : "send"} ${reachable.length}`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={!subject.trim() || !body.trim() || reachable.length === 0 || unfilled.length > 0}
                  className={buttonClass("primary")}
                >
                  <EnvelopeSimple size={15} /> Send to {reachable.length} {reachable.length === 1 ? "person" : "people"}
                </button>
              )
            ) : (
              <button type="button" onClick={copyAddresses} disabled={reachable.length === 0} className={buttonClass("primary")}>
                <Copy size={15} /> Copy addresses
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
