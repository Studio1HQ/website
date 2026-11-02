"use client";

import { useState } from "react";
import { Check, Copy, FileText } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/** OpenAI blossom, in ink. */
function ChatGPTLogo() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="currentColor"
    >
      <path d="M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9A6.07 6.07 0 0 0 4.98 4.18a5.98 5.98 0 0 0-4 2.9 6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.52 2.9A5.98 5.98 0 0 0 13.26 24a6.06 6.06 0 0 0 5.77-4.21 5.99 5.99 0 0 0 4-2.9 6.06 6.06 0 0 0-.75-7.07Zm-9.02 12.61a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.79.79 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.05v5.58a4.5 4.5 0 0 1-4.49 4.5Zm-9.66-4.13a4.47 4.47 0 0 1-.53-3.01l.14.09 4.78 2.76a.77.77 0 0 0 .78 0l5.84-3.37v2.33a.08.08 0 0 1-.03.06l-4.83 2.79a4.5 4.5 0 0 1-6.15-1.65ZM2.34 7.9a4.49 4.49 0 0 1 2.37-1.97v5.68a.77.77 0 0 0 .39.68l5.81 3.35-2.02 1.17a.08.08 0 0 1-.07 0l-4.83-2.79A4.5 4.5 0 0 1 2.34 7.87Zm16.6 3.86-5.84-3.39 2.02-1.16a.08.08 0 0 1 .07 0l4.83 2.79a4.49 4.49 0 0 1-.68 8.1v-5.68a.79.79 0 0 0-.4-.66Zm2.01-3.02-.14-.09-4.77-2.78a.78.78 0 0 0-.79 0L9.41 9.23V6.9a.07.07 0 0 1 .03-.06l4.83-2.79a4.5 4.5 0 0 1 6.68 4.66ZM8.31 12.86 6.29 11.7a.08.08 0 0 1-.04-.06V6.08a4.5 4.5 0 0 1 7.38-3.45l-.14.08-4.78 2.76a.79.79 0 0 0-.39.68Zm1.1-2.37 2.6-1.5 2.6 1.5v3l-2.6 1.5-2.6-1.5Z" />
    </svg>
  );
}

/** Claude spark, in its clay orange. */
function ClaudeLogo() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-3.5" fill="#D97757">
      <path d="M4.71 15.96 9.43 13.31l.08-.23-.08-.13h-.23l-.79-.05-2.7-.07-2.34-.1-2.27-.12-.57-.12L0 11.79l.06-.35.48-.32.69.06 1.52.1 2.28.16 1.65.1 2.45.25h.39l.05-.16-.13-.1-.1-.09-2.36-1.6-2.55-1.69-1.34-.97-.72-.5-.37-.46-.16-1.02.66-.72.88.06.22.06.89.69 1.91 1.48 2.49 1.83.36.3.15-.1.02-.07-.17-.27-1.35-2.45-1.45-2.49-.64-1.03-.17-.62a2.98 2.98 0 0 1-.1-.73l.75-1.02L6.86 0l1 .13.42.37.62 1.42 1 2.23 1.56 3.04.46.9.24.83.09.25h.16v-.15l.13-1.71.24-2.1.23-2.7.08-.76.37-.9.74-.49.58.28.48.68-.07.44-.28 1.85-.56 2.9-.36 1.95h.21l.24-.25.98-1.3 1.65-2.06.73-.82.85-.9.54-.43h1.03l.76 1.13-.34 1.17-1.06 1.35-.88 1.14-1.27 1.71-.79 1.37.07.11.19-.02 2.87-.61 1.55-.28 1.85-.32.84.39.09.4-.33.81-1.98.49-2.32.46-3.46.82-.04.03.05.06 1.56.15.67.04h1.63l3.04.22.79.52.48.64-.08.49-1.22.62-1.65-.39-3.84-.91-1.32-.33h-.18v.11l1.1 1.07 2.01 1.82 2.52 2.34.13.58-.32.46-.34-.05-2.2-1.66-.85-.74-1.93-1.62h-.13v.17l.44.65 2.34 3.52.12 1.08-.17.35-.61.21-.66-.12-1.37-1.92-1.41-2.16-1.14-1.94-.14.08-.67 7.24-.32.37-.73.28-.61-.46-.32-.75.32-1.48.39-1.92.31-1.53.29-1.9.17-.63-.01-.04-.14.02-1.44 1.98-2.19 2.96-1.74 1.86-.42.16-.72-.37.07-.66.4-.59 2.39-3.04 1.44-1.88.93-1.09-.01-.16h-.06l-6.35 4.12-1.13.15-.49-.46.06-.75.23-.24 1.91-1.31Z" />
    </svg>
  );
}

/**
 * "Use this article with AI" actions: view or copy the post as Markdown, or
 * open it straight in ChatGPT / Claude with the Markdown URL as context.
 */
export function PostAiActions({
  markdownUrl,
  title,
  className,
}: {
  markdownUrl: string;
  title: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const prompt = `Read ${markdownUrl} so I can ask questions about "${title}".`;

  const copy = async () => {
    try {
      const response = await fetch(
        markdownUrl.replace(/^https?:\/\/[^/]+/, ""),
      );
      await navigator.clipboard.writeText(await response.text());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(markdownUrl, "_blank", "noopener,noreferrer");
    }
  };

  const button =
    "inline-flex h-8 items-center gap-1.5 rounded-full bg-white/80 px-3 text-[12.5px] font-medium text-[#141414] shadow-[inset_0_1px_0_#fff] ring-1 ring-inset ring-[#141414]/[0.08] transition-colors duration-200 hover:bg-white hover:text-[#c2410c]";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--home-ink-soft)]">
        Use with AI
      </span>
      <button type="button" onClick={copy} className={button}>
        {copied ? (
          <Check weight="bold" className="size-3.5 text-primary" />
        ) : (
          <Copy className="size-3.5" />
        )}
        {copied ? "Copied" : "Copy as Markdown"}
      </button>
      <a
        href={markdownUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={button}
      >
        <FileText className="size-3.5" />
        View .md
      </a>
      <a
        href={`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={button}
      >
        <ChatGPTLogo />
        Open in ChatGPT
      </a>
      <a
        href={`https://claude.ai/new?q=${encodeURIComponent(prompt)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={button}
      >
        <ClaudeLogo />
        Open in Claude
      </a>
    </div>
  );
}
