"use client";

import { useState } from "react";
import { Check, Copy, FileText } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

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
      const response = await fetch(markdownUrl.replace(/^https?:\/\/[^/]+/, ""));
      await navigator.clipboard.writeText(await response.text());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(markdownUrl, "_blank", "noopener,noreferrer");
    }
  };

  const button =
    "inline-flex h-9 items-center gap-2 rounded-full border border-[var(--home-line)] bg-[var(--home-paper)] px-3.5 text-[13px] font-medium text-[var(--home-ink)] transition-colors duration-200 hover:border-primary/40 hover:text-primary";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="mr-1 text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--home-ink-soft)]">
        Use with AI
      </span>
      <button type="button" onClick={copy} className={button}>
        {copied ? <Check weight="bold" className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy as Markdown"}
      </button>
      <a href={markdownUrl} target="_blank" rel="noopener noreferrer" className={button}>
        <FileText className="size-3.5" />
        View .md
      </a>
      <a
        href={`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={button}
      >
        Open in ChatGPT
      </a>
      <a
        href={`https://claude.ai/new?q=${encodeURIComponent(prompt)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={button}
      >
        Open in Claude
      </a>
    </div>
  );
}
