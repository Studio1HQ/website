import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/internal/sections";

/* Presentational pieces shared by server and client components (no hooks). */

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});

/** "12 Nov 2026, 14:05" in IST, where the team works. */
export function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : `${dateFormat.format(date)} IST`;
}

/** "just now", "5m ago", "3h ago", "2d ago", then "12 Nov". */
export function relativeDate(value: unknown, now = Date.now()) {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  const seconds = Math.round((now - date.getTime()) / 1000);
  if (Number.isNaN(seconds)) return "—";
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d ago`;
  return dayFormat.format(date);
}

export function text(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  return Array.isArray(value) ? value.join(", ") : String(value);
}

/* ---------------------------------------------------------------- avatar */

const AVATAR_TONES = [
  "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200",
];

export function initials(name: string, email = "") {
  const words = (name || email.split("@")[0] || "?")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(" ")
    .filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

export function Avatar({
  name,
  email,
  size = 32,
  className,
  src,
}: {
  name: string;
  email?: string;
  size?: 20 | 24 | 28 | 32 | 40 | 48 | 64;
  className?: string;
  /** A profile photo (team people); initials when there's none. */
  src?: string | null;
}) {
  if (src) {
    return (
      // Private, already-small WebP from /internal/team-file: no optimizer.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden
        width={size}
        height={size}
        className={cn("inline-block shrink-0 rounded-full bg-[var(--i-sunken)] object-cover ring-1 ring-[var(--i-line)]", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const key = (email || name).toLowerCase();
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium",
        AVATAR_TONES[hash % AVATAR_TONES.length],
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials(name, email)}
    </span>
  );
}

/* ---------------------------------------------------------------- status */

const STATUS_TONES: Record<string, { dot: string; badge: string }> = {
  orange: {
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-200 dark:ring-orange-500/25",
  },
  sky: {
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/25",
  },
  violet: {
    dot: "bg-violet-500",
    badge: "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-500/25",
  },
  amber: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/25",
  },
  emerald: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/25",
  },
  rose: {
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/25",
  },
  stone: {
    dot: "bg-stone-400",
    badge: "bg-stone-100 text-stone-700 ring-stone-200 dark:bg-stone-500/10 dark:text-stone-300 dark:ring-stone-500/25",
  },
};

const STATUS_TONE: Record<string, keyof typeof STATUS_TONES> = {
  new: "orange",
  reviewing: "sky",
  confirmed: "sky",
  shortlisted: "violet",
  interviewing: "violet",
  offer: "amber",
  waitlisted: "amber",
  accepted: "emerald",
  hired: "emerald",
  attended: "emerald",
  completed: "emerald",
  interviewed: "violet",
  rejected: "rose",
  no_show: "rose",
  dropped: "rose",
  withdrawn: "stone",
};

export function statusTone(status: string) {
  return STATUS_TONES[STATUS_TONE[status] ?? "stone"];
}

export function StatusDot({ status, className }: { status: string; className?: string }) {
  return (
    <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", statusTone(status).dot, className)} />
  );
}

export function StatusBadge({ status }: { status: unknown }) {
  if (typeof status !== "string" || !status) {
    return <span className="text-[var(--i-faint)]">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset",
        statusTone(status).badge,
      )}
    >
      <StatusDot status={status} />
      {statusLabel(status)}
    </span>
  );
}

/* ------------------------------------------------------------------ tags */

const TAG_TONES: Record<string, string> = {
  "strong fit": "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/25",
  maybe: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/25",
  "not a fit": "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/25",
  "follow up": "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/25",
};

export function tagTone(tag: string) {
  return (
    TAG_TONES[tag.toLowerCase()] ??
    "bg-[var(--i-sunken)] text-[var(--i-ink-2)] ring-[var(--i-line)]"
  );
}

export function TagChip({
  tag,
  children,
  className,
}: {
  tag: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-[11rem] items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[12px] font-medium ring-1 ring-inset",
        tagTone(tag),
        className,
      )}
    >
      <span className="truncate">{tag}</span>
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- buttons */

export function buttonClass(
  variant: "primary" | "accent" | "secondary" | "ghost" | "danger" = "secondary",
  size: "sm" | "md" = "md",
) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-[background-color,box-shadow,color,opacity] disabled:pointer-events-none disabled:opacity-50",
    size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-8 px-3 text-[13px]",
    variant === "primary" &&
      "bg-[var(--i-ink)] text-[var(--i-panel)] shadow-[var(--i-shadow-sm)] hover:opacity-90",
    variant === "accent" &&
      "bg-[var(--i-accent)] text-white shadow-[var(--i-shadow-sm)] hover:opacity-90",
    variant === "secondary" &&
      "border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-sm)] hover:bg-[var(--i-hover)]",
    variant === "ghost" &&
      "text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]",
    variant === "danger" &&
      "border border-rose-200 bg-[var(--i-panel)] text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10",
  );
}

/* ---------------------------------------------------------------- fields */

/**
 * Text inputs, textareas and select triggers: a sunken well that turns white
 * on focus. No height, so textareas can use it; inputs use `inputClass`.
 */
export const fieldClass =
  "block w-full min-w-0 rounded-lg border border-[var(--i-line)] bg-[var(--i-sunken)] px-3 text-[13px] text-[var(--i-ink)] outline-none transition-colors placeholder:text-[var(--i-faint)] focus:border-[var(--i-line-strong)] focus:bg-[var(--i-panel)] disabled:cursor-not-allowed disabled:opacity-60";

/** md (h-9) in forms and dialogs, sm (h-8) in toolbars, xs (h-7) in table rows. */
export function inputClass(size: "xs" | "sm" | "md" = "md") {
  return cn(fieldClass, size === "xs" ? "h-7 px-2" : size === "sm" ? "h-8" : "h-9");
}

export const textareaClass = cn(fieldClass, "resize-y py-2 leading-relaxed");

/* ----------------------------------------------------------------- menus */

/** Dropdown menus, popover lists and select lists. */
export const menuContentClass =
  "internal-pop z-50 min-w-[12rem] overflow-hidden rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] p-1 text-[13px] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]";

export const menuItemClass =
  "flex cursor-default select-none items-center gap-2.5 rounded-md px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--i-hover)] data-[disabled]:opacity-50";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-[var(--i-line)] bg-[var(--i-sunken)] px-1 font-sans text-[11px] text-[var(--i-muted)]">
      {children}
    </kbd>
  );
}

/* ---------------------------------------------------------------- layout */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1.5 text-[12.5px] text-[var(--i-muted)]">{eyebrow}</div>
        ) : null}
        <h1 className="text-[22px] font-medium leading-tight tracking-[-0.01em]">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-[var(--i-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] shadow-[var(--i-shadow-sm)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3">
      <h2 className="text-[13px] font-medium">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-[var(--i-line)] bg-[var(--i-sunken)] text-[var(--i-muted)] shadow-[var(--i-shadow-sm)]">
        {icon}
      </div>
      <p className="text-[14px] font-medium">{title}</p>
      {children ? (
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-[var(--i-muted)]">{children}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "warning";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-[13px] leading-relaxed",
        tone === "error" && "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
        tone === "info" && "border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-muted)]",
      )}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- detail */

/** Applicant-supplied links: http(s) only, new tab, no referrer. */
export function safeUrl(href: unknown): URL | null {
  if (typeof href !== "string" || !href.trim()) return null;
  try {
    const url = new URL(href.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export function prettyUrl(url: URL) {
  return url
    .toString()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\/$/, "");
}

export function ExternalLink({
  href,
  children,
  className,
}: {
  href: unknown;
  children?: ReactNode;
  className?: string;
}) {
  const url = safeUrl(href);
  if (!url) {
    return typeof href === "string" && href ? (
      <span className="break-all">{href}</span>
    ) : (
      <span className="text-[var(--i-faint)]">—</span>
    );
  }
  return (
    <a
      href={url.toString()}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={cn(
        "group/link inline-flex max-w-full items-center gap-1 text-[var(--i-ink)] underline decoration-[var(--i-line-strong)] underline-offset-[3px] transition-colors hover:text-[var(--i-accent-text)] hover:decoration-[var(--i-accent)]",
        className,
      )}
    >
      <span className="truncate">{children ?? prettyUrl(url)}</span>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="size-3 shrink-0 text-[var(--i-faint)] group-hover/link:text-[var(--i-accent)]"
      >
        <path
          d="M6 3h7v7M13 3 4 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}

export function Fields({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">{children}</dl>;
}

export function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="text-[12px] text-[var(--i-muted)]">{label}</dt>
      <dd className="mt-1 text-[13.5px] leading-relaxed text-[var(--i-ink)]">
        {empty ? <span className="text-[var(--i-faint)]">—</span> : children}
      </dd>
    </div>
  );
}

export function LongText({ value }: { value: unknown }) {
  const content = text(value);
  if (!content) return <p className="text-[13.5px] text-[var(--i-faint)]">No answer.</p>;
  return (
    <p className="max-w-[68ch] whitespace-pre-wrap break-words text-[14px] leading-[1.7] text-[var(--i-ink-2)]">
      {content}
    </p>
  );
}
