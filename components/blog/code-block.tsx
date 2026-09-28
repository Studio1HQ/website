"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { highlight } from "sugar-high";

type CodeBlockProps = {
  code: string;
  language?: string;
};

export function CodeBlock({ code, language = "text" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeHTML = highlight(code);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <figure className="not-prose my-7 overflow-hidden rounded-lg border border-border bg-zinc-950 text-zinc-100 shadow-[0_18px_52px_-36px_rgba(0,0,0,0.65)]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.035] px-4 py-2">
        <span className="font-mono text-xs uppercase tracking-wide text-zinc-400">
          {language}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: codeHTML }} />
      </pre>
    </figure>
  );
}
