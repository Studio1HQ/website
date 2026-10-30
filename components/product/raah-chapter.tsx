"use client";

import type { ReactNode } from "react";
import { Terminal } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { EASE } from "@/components/home/ui";
import ProductChapter, {
  CopyButton,
  FeatureTile,
} from "@/components/product/product-chapter";
import { getProduct } from "@/constants/products";
import { NIGHT, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/*
 * Raah's chapter: the install snippet beside the product clip (one script
 * tag is the whole setup, so it gets the spotlight), then four small
 * dashboard widgets drawn in code, one per feature.
 */

const raah = getProduct("raah");

/** The snippet from raah.dev, split into tokens for colouring. */
const SNIPPET: [kind: "tag" | "attr" | "value" | "plain", text: string][][] = [
  [["tag", "<script"]],
  [["attr", "  defer"]],
  [
    ["attr", "  src"],
    ["plain", "="],
    ["value", '"https://t.raah.dev/script.js"'],
  ],
  [
    ["attr", "  data-pid"],
    ["plain", "="],
    ["value", '"YOUR_PROJECT_ID"'],
  ],
  [
    ["attr", "  data-domain"],
    ["plain", "="],
    ["value", '"yoursite.com"'],
  ],
  [["tag", "></script>"]],
];
const SNIPPET_TEXT = SNIPPET.map((line) =>
  line.map(([, text]) => text).join(""),
).join("\n");

const TOKEN_COLOR = {
  tag: "text-[#fb923c]",
  attr: "text-[#f4efe7]/70",
  value: "text-[#fcd9b6]",
  plain: "text-[#f4efe7]/45",
} as const;

const STEPS = [
  {
    title: "Create a project",
    detail: "Add your domain and get a project ID.",
  },
  {
    title: "Paste one script tag",
    detail: "It goes in <head>. No SDK, no build step.",
  },
  {
    title: "Watch real users",
    detail: "Each visit is enriched at the edge with ISP, city, and country.",
  },
];

/** Dark card: the snippet with a copy button, then the three setup steps. */
function InstallCard() {
  return (
    <div
      className="flex min-w-0 flex-col rounded-[8px] p-5 text-[#f4efe7] shadow-[0_40px_80px_-48px_rgba(20,20,20,0.7)] sm:p-6"
      style={{ background: NIGHT }}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-[13px] font-medium">
          <Terminal
            aria-hidden
            weight="duotone"
            className="size-4"
            style={{ color: PRINT }}
          />
          Install
        </p>
        <p className="text-[12px] text-[#f4efe7]/50">Live in under a minute</p>
      </div>

      <div className="relative mt-4 rounded-[6px] bg-white/[0.04] ring-1 ring-inset ring-white/[0.08]">
        <CopyButton
          text={SNIPPET_TEXT}
          className="absolute right-2.5 top-2.5"
        />
        <pre
          data-lenis-prevent
          className="overflow-x-auto p-4 pr-24 font-mono text-[12.5px] leading-[1.75]"
        >
          <code>
            {SNIPPET.map((line, row) => (
              <span key={row} className="block whitespace-pre">
                {line.map(([kind, text], at) => (
                  <span key={at} className={TOKEN_COLOR[kind]}>
                    {text}
                  </span>
                ))}
              </span>
            ))}
          </code>
        </pre>
      </div>

      <ol className="relative mt-6 flex-1 space-y-5">
        {/* The thread the steps hang on */}
        <span
          aria-hidden
          className="absolute bottom-3 left-[11px] top-3 w-px bg-white/[0.12]"
        />
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative flex gap-4">
            <span
              className={cn(
                "relative flex size-[23px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                index === STEPS.length - 1
                  ? "text-white"
                  : "bg-[#262626] text-[#f4efe7]/80 ring-1 ring-inset ring-white/10",
              )}
              style={
                index === STEPS.length - 1 ? { background: PRINT } : undefined
              }
            >
              {index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[14.5px] font-medium tracking-[-0.01em]">
                {step.title}
              </p>
              <p className="mt-1 text-[13px] leading-[1.55] text-[#f4efe7]/55">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard widgets (sample data, the same figures raah.dev shows)     */
/* ------------------------------------------------------------------ */

/** Grows from zero the first time it scrolls into view. */
function useGrow() {
  const reduceMotion = useReducedMotion();
  return (delay = 0) => ({
    initial: reduceMotion ? false : ("hidden" as const),
    whileInView: "shown" as const,
    viewport: { once: true, amount: 0.6 },
    transition: { duration: 1, ease: EASE, delay },
  });
}

const CHANNELS = [
  { name: "Google", revenue: 9016 },
  { name: "Reddit", revenue: 4704 },
  { name: "Newsletter", revenue: 3038 },
];

function RevenueWidget() {
  const grow = useGrow();
  const total = CHANNELS.reduce((sum, channel) => sum + channel.revenue, 0);
  const top = CHANNELS[0].revenue;
  return (
    <div>
      <p className="text-[24px] font-medium leading-none tracking-[-0.04em] tabular-nums">
        ${total.toLocaleString("en-US")}
      </p>
      <p className="mt-1.5 text-[11.5px] text-[#141414]/50">
        342 confirmed payments
      </p>
      <ul className="mt-4 space-y-2.5">
        {CHANNELS.map((channel, index) => (
          <li key={channel.name} className="text-[11.5px]">
            <div className="flex justify-between gap-2">
              <span className="text-[#141414]/70">{channel.name}</span>
              <span className="tabular-nums text-[#141414]/50">
                ${channel.revenue.toLocaleString("en-US")}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#141414]/[0.07]">
              <motion.div
                className="h-full origin-left rounded-full"
                style={{
                  width: `${(channel.revenue / top) * 100}%`,
                  background: PRINT,
                  opacity: 1 - index * 0.28,
                }}
                variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }}
                {...grow(index * 0.12)}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const FUNNEL = [
  { step: "Pricing", visits: 8600 },
  { step: "Checkout", visits: 4200 },
  { step: "Purchase", visits: 342 },
];

function FunnelWidget() {
  const grow = useGrow();
  const top = FUNNEL[0].visits;
  const rate = (FUNNEL[FUNNEL.length - 1].visits / top) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[24px] font-medium leading-none tracking-[-0.04em] tabular-nums">
          {rate.toFixed(1)}%
        </p>
        <p className="text-[11.5px] text-[#141414]/50">pricing → paid</p>
      </div>
      <div className="mt-4 grid h-[104px] grid-cols-3 items-end gap-2">
        {FUNNEL.map((stage, index) => (
          <div key={stage.step} className="flex h-full flex-col justify-end">
            <span className="mb-1 text-center text-[10.5px] tabular-nums text-[#141414]/55">
              {stage.visits.toLocaleString("en-US")}
            </span>
            <motion.div
              className="origin-bottom rounded-t-[4px]"
              style={{
                height: `${Math.max((stage.visits / top) * 100, 6)}%`,
                background:
                  index === FUNNEL.length - 1 ? PRINT : "rgba(20,20,20,0.14)",
              }}
              variants={{ hidden: { scaleY: 0 }, shown: { scaleY: 1 } }}
              {...grow(index * 0.12)}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-2 border-t border-[#141414]/10 pt-1.5">
        {FUNNEL.map((stage) => (
          <span
            key={stage.step}
            className="truncate text-center text-[10.5px] text-[#141414]/60"
          >
            {stage.step}
          </span>
        ))}
      </div>
    </div>
  );
}

const VITALS = [
  { name: "LCP", value: "2.1s", score: 0.84 },
  { name: "INP", value: "164ms", score: 0.9 },
  { name: "CLS", value: "0.04", score: 0.96 },
];

function VitalsWidget() {
  const grow = useGrow();
  const radius = 20;
  return (
    <div>
      <div className="grid grid-cols-3 gap-1">
        {VITALS.map((vital, index) => (
          <div key={vital.name} className="flex flex-col items-center">
            <svg viewBox="0 0 48 48" className="size-[56px] -rotate-90">
              <circle
                cx="24"
                cy="24"
                r={radius}
                fill="none"
                stroke="rgba(20,20,20,0.08)"
                strokeWidth="4"
              />
              <motion.circle
                cx="24"
                cy="24"
                r={radius}
                fill="none"
                stroke={PRINT}
                strokeWidth="4"
                strokeLinecap="round"
                variants={{
                  hidden: { pathLength: 0 },
                  shown: { pathLength: vital.score },
                }}
                {...grow(index * 0.12)}
              />
            </svg>
            <span className="mt-2 text-[13px] font-medium tabular-nums tracking-[-0.02em]">
              {vital.value}
            </span>
            <span className="text-[10.5px] text-[#141414]/50">
              {vital.name}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] text-[#141414]/60">
        <span aria-hidden className="size-1.5 rounded-full bg-[#16a34a]" />
        All three pass at p75
      </p>
    </div>
  );
}

const ROUTES = [
  { where: "Frankfurt · Fiber", seconds: 0.4 },
  { where: "Virginia · Cable", seconds: 0.7 },
  { where: "São Paulo · Mobile", seconds: 1.3 },
  { where: "Mumbai · Mobile", seconds: 2.1 },
];
const SLOW = 1.5;

function NetworkWidget() {
  const grow = useGrow();
  const top = Math.max(...ROUTES.map((route) => route.seconds));
  return (
    <div>
      <p className="text-[11.5px] font-medium text-[#141414]/70">
        POST /api/checkout · p75
      </p>
      <ul className="mt-3 space-y-2">
        {ROUTES.map((route, index) => {
          const slow = route.seconds >= SLOW;
          return (
            <li key={route.where} className="text-[11px]">
              <div className="flex justify-between gap-2">
                <span className="truncate text-[#141414]/65">
                  {route.where}
                </span>
                <span
                  className={cn(
                    "tabular-nums",
                    slow ? "font-medium text-[#c2410c]" : "text-[#141414]/50",
                  )}
                >
                  {route.seconds.toFixed(1)}s
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#141414]/[0.07]">
                <motion.div
                  className="h-full origin-left rounded-full"
                  style={{
                    width: `${(route.seconds / top) * 100}%`,
                    background: slow ? PRINT : "rgba(20,20,20,0.28)",
                  }}
                  variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }}
                  {...grow(index * 0.1)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const WIDGETS: Record<string, ReactNode> = {
  revenue: <RevenueWidget />,
  funnels: <FunnelWidget />,
  vitals: <VitalsWidget />,
  network: <NetworkWidget />,
};

export default function RaahChapter({ index }: { index: number }) {
  const t = useTranslations("ProductPage");
  return (
    <ProductChapter product={raah} index={index} aside={<InstallCard />}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {raah.features.map((feature) => (
          <FeatureTile key={feature.key} feature={feature}>
            {WIDGETS[feature.key]}
          </FeatureTile>
        ))}
      </div>
      <p className="mt-3 text-right text-[11.5px] text-[#141414]/40">
        {t("sampleData")}
      </p>
    </ProductChapter>
  );
}
