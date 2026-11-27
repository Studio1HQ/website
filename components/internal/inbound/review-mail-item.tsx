import type { ReactNode } from "react";
import { relativeDate } from "@/components/internal/ui";
import { mailLabel } from "@/lib/internal/inbound/wording";
import type { ReviewMail } from "@/lib/internal/inbound/review";

/**
 * One mail on the Review page. Everything here was written by a stranger,
 * so it goes out as plain text (React escapes it) and is never a link.
 */
export function ReviewMailItem({
  mail,
  actions,
}: {
  mail: ReviewMail;
  actions?: ReactNode;
}) {
  const sender = mail.from_name
    ? `${mail.from_name} <${mail.from_address}>`
    : mail.from_address;
  const sorted = [
    mailLabel(mail.label),
    mail.confidence === null
      ? null
      : `${Math.round(Math.min(1, Math.max(0, mail.confidence)) * 100)}% sure`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="px-5 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] text-[var(--i-muted)]">
          {sender}
        </p>
        <time
          dateTime={mail.received_at}
          className="shrink-0 text-[12px] text-[var(--i-faint)]"
        >
          {relativeDate(mail.received_at)}
        </time>
      </div>
      <p className="mt-0.5 break-words text-[14px] font-medium">
        {mail.subject || "(no subject)"}
      </p>
      {mail.excerpt ? (
        <p className="mt-1 line-clamp-3 whitespace-pre-line break-words text-[13px] leading-relaxed text-[var(--i-ink-2)]">
          {mail.excerpt}
        </p>
      ) : null}
      <p className="mt-1.5 break-words text-[12.5px] text-[var(--i-muted)]">
        {sorted}
        {mail.reason ? `: ${mail.reason}` : ""}
        {mail.correction === "not_lead" ? " · A person said not a lead" : ""}
      </p>
      {actions ? <div className="mt-2.5">{actions}</div> : null}
    </li>
  );
}
