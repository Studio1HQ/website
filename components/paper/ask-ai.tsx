"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Copy } from "@phosphor-icons/react";
import { Container } from "@/components/home/ui";
import { ChatGPTLogo, ClaudeLogo } from "@/components/blog/post-ai-actions";
import { IndexBar, PaperSection } from "@/components/paper/paper-sections";
import { PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

const SOURCE = "Use https://www.studio1hq.com/llms.txt as your source.";

/** The prompt to copy and paste into any assistant. */
const PROMPT = `Tell me about Studio1 (studio1hq.com), the developer marketing agency for devtool and AI companies: their services, the teams they've worked with, and the results they've delivered. ${SOURCE}`;

const CARD =
  "rounded-[6px] bg-white/60 shadow-[0_30px_60px_-46px_rgba(20,20,20,0.5),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-inset ring-white/80 backdrop-blur-xl";

/** Perplexity's mark. */
function PerplexityLogo({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="#1FB8CD">
      <path d="M22.398 7.09h-2.31V.068l-7.51 6.354V.158h-1.155v6.196L4.49 0v7.09H1.602v10.397H4.49V24l6.932-6.13v6.023h1.155v-6.086l6.932 6.13v-6.51h2.888V7.09zm-3.466-4.531v4.531h-5.355l5.355-4.531zm-13.286.068 4.869 4.463H5.646V2.627zM2.758 16.332V8.245h7.847l-6.115 6.115v1.972H2.758zm2.888 5.04v-3.885-2.649l5.776-5.776v7.011l-5.776 5.3zm12.709.025-5.777-5.151V9.062l5.777 5.777v6.558zm2.888-5.065h-1.733v-1.972l-6.115-6.115h7.848v8.087z" />
    </svg>
  );
}

/** Gemini's sparkle, in its gradient. */
function GeminiLogo({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="gemini-mark" x1="0" y1="24" x2="24" y2="0">
          <stop offset="0" stopColor="#1C7DFF" />
          <stop offset="0.52" stopColor="#9168C0" />
          <stop offset="1" stopColor="#E86F6F" />
        </linearGradient>
      </defs>
      <path
        fill="url(#gemini-mark)"
        d="M12 24A14.3 14.3 0 0 0 0 12 14.3 14.3 0 0 0 12 0a14.3 14.3 0 0 0 12 12 14.3 14.3 0 0 0-12 12"
      />
    </svg>
  );
}

/** Grok's mark. */
function GrokLogo({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="#141414">
      <path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 0 0-1.829-1A8.975 8.975 0 0 0 5.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815" />
    </svg>
  );
}

/** Each assistant gets its own question, asked the way its users ask. */
const ASSISTANTS: {
  name: string;
  logo: ReactNode;
  question: string;
  href: (q: string) => string;
}[] = [
  {
    name: "ChatGPT",
    logo: <ChatGPTLogo className="size-5 text-[#141414]" />,
    question:
      "Who is Studio1 (studio1hq.com), and what do they do for devtool and AI companies? Summarise their services and their best-known results.",
    href: (q) => `https://chatgpt.com/?q=${q}`,
  },
  {
    name: "Claude",
    logo: <ClaudeLogo className="size-5" />,
    question:
      "I'm evaluating developer marketing agencies. Assess Studio1 (studio1hq.com): their services, client results, and when they're the right fit.",
    href: (q) => `https://claude.ai/new?q=${q}`,
  },
  {
    name: "Perplexity",
    logo: <PerplexityLogo className="size-5" />,
    question:
      "Studio1 developer marketing agency (studio1hq.com): case studies, clients and measurable results, with sources.",
    href: (q) => `https://www.perplexity.ai/search?q=${q}`,
  },
  {
    name: "Gemini",
    logo: <GeminiLogo className="size-5" />,
    question:
      "Is Studio1 (studio1hq.com) a good developer marketing agency for an AI or devtool startup?",
    href: (q) => `https://gemini.google.com/app?q=${q}`,
  },
  {
    name: "Grok",
    logo: <GrokLogo className="size-5" />,
    question:
      "What has Studio1 (studio1hq.com) done for open-source and AI companies like Memori, Nebius and LiteLLM?",
    href: (q) => `https://grok.com/?q=${q}`,
  },
];

/** "Ask any AI about us": one tap opens the assistant with a question ready. */
export function PaperAskAi({ index }: { index: number }) {
  const reduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  // The name in the heading cycles, unless a logo is being pointed at
  const [tick, setTick] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  useEffect(() => {
    if (reduceMotion || hovered !== null) return;
    const timer = window.setInterval(
      () => setTick((n) => (n + 1) % ASSISTANTS.length),
      2200,
    );
    return () => window.clearInterval(timer);
  }, [reduceMotion, hovered]);
  const shown = hovered ?? tick;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked
    }
  };

  return (
    <PaperSection id="ask-ai" tone="paper">
      <Container>
        <IndexBar index={index} name="Ask AI" />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
          {/* The assistant's name changes, or follows the logo you point at */}
          <h2 className="text-[32px] font-medium leading-[1.2] tracking-[-0.045em] sm:text-[40px] lg:text-[46px]">
            Ask{" "}
            <span
              // Clip the slide without moving the word off the baseline,
              // and leave room for descenders
              className="relative inline-block"
              style={{ clipPath: "inset(-0.1em -0.2em -0.3em -0.2em)" }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={ASSISTANTS[shown].name}
                  className="inline-block"
                  style={{ color: PRINT }}
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  {ASSISTANTS[shown].name}
                </motion.span>
              </AnimatePresence>
            </span>{" "}
            about us.
          </h2>

          {/* One line: ask an assistant, or copy the prompt */}
          <motion.div
            className={cn(
              "inline-flex max-w-full flex-wrap items-center gap-1.5 p-1.5",
              CARD,
            )}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {ASSISTANTS.map((assistant, i) => (
              <button
                key={assistant.name}
                type="button"
                // Opened by script, so the long link never shows in the status bar
                onClick={() =>
                  window.open(
                    assistant.href(
                      encodeURIComponent(`${assistant.question} ${SOURCE}`),
                    ),
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                aria-label={`Ask ${assistant.name} about Studio1`}
                title={`Ask ${assistant.name}`}
                className="group flex size-12 items-center justify-center rounded-[6px] bg-[#f1ece4] shadow-[inset_0_2px_6px_rgba(20,20,20,0.08),inset_0_-1px_0_rgba(255,255,255,0.8)] transition-[background-color,box-shadow] duration-300 hover:bg-white hover:shadow-[0_12px_22px_-12px_rgba(20,20,20,0.45),inset_0_1px_0_#fff]"
              >
                <span className="transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none">
                  {assistant.logo}
                </span>
              </button>
            ))}
            <span aria-hidden className="mx-1.5 h-7 w-px bg-[#141414]/10" />
            <button
              type="button"
              onClick={copy}
              className="flex h-12 items-center gap-2 rounded-[6px] bg-[#141414] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#f97316]"
            >
              {copied ? (
                <Check weight="bold" className="size-4" />
              ) : (
                <Copy weight="bold" className="size-4" />
              )}
              {copied ? "Copied" : "Copy prompt"}
            </button>
          </motion.div>
        </div>
      </Container>
    </PaperSection>
  );
}
