"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { highlight } from "sugar-high";

type CodeBlockProps = {
  code: string;
  language?: string;
};

/** Languages that are prose-like; the JS highlighter mangles them, so render as plain text. */
const PLAIN_LANGUAGES = new Set([
  "text",
  "txt",
  "plain",
  "md",
  "markdown",
  "mdx",
  "yaml",
  "yml",
  "toml",
  "ini",
  "env",
  "csv",
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function CodeBlock({ code, language = "text" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const isPlain = PLAIN_LANGUAGES.has(language.toLowerCase());
  const codeHTML = isPlain ? escapeHtml(code) : highlight(code);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <figure className="not-prose my-8 overflow-hidden rounded-[6px] bg-[#0c0908] text-zinc-100 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.8)] ring-1 ring-black/10">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-500">
            {language}
          </span>
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[12px] text-zinc-300 transition-colors hover:border-[#fb923c]/50 hover:text-white"
        >
          {copied ? (
            <Check className="size-3.5 text-[#fb923c]" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[13.5px] leading-[1.7]">
        <code dangerouslySetInnerHTML={{ __html: codeHTML }} />
      </pre>
    </figure>
  );
}
