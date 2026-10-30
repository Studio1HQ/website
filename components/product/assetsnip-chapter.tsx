"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CountUp } from "@/components/paper/paper-sections";
import { EASE } from "@/components/home/ui";
import ProductChapter, {
  CopyButton,
  FeatureTile,
} from "@/components/product/product-chapter";
import { getProduct } from "@/constants/products";
import { NIGHT, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/*
 * AssetSnip's chapter: a small capture you can play with beside the
 * screenshot. Pick a colour from the scanned palette and switch the export
 * between CSS, Tailwind and DESIGN.md, the way the extension hands it over.
 */

const assetsnip = getProduct("assetsnip");

/** What a sample scan of one landing page turned up. */
const SCAN = [
  { label: "Colors", count: 51, tint: PRINT },
  { label: "SVGs", count: 26, tint: "#fb923c" },
  { label: "Fonts", count: 14, tint: "#fdba74" },
  { label: "Media", count: 6, tint: "#141414" },
  { label: "Gradients", count: 5, tint: "rgba(20,20,20,0.35)" },
];
const SCAN_TOTAL = SCAN.reduce((sum, kind) => sum + kind.count, 0);

const PALETTE = [
  { name: "teal", hex: "#20A79C", role: "primary" },
  { name: "mint", hex: "#36C4B7", role: "accent" },
  { name: "clay", hex: "#D97757", role: "highlight" },
  { name: "sun", hex: "#F2B84B", role: "warning" },
  { name: "ink", hex: "#16191D", role: "text" },
  { name: "paper", hex: "#F6F1E9", role: "background" },
];

const FORMATS = ["CSS", "Tailwind", "DESIGN.md"] as const;
type Format = (typeof FORMATS)[number];

/** The palette as the chosen export: the lines around it, then one per colour. */
function exportLines(format: Format) {
  const colours = {
    CSS: PALETTE.map((c) => `  --color-${c.name}: ${c.hex};`),
    Tailwind: PALETTE.map((c) => `    ${c.name}: "${c.hex}",`),
    "DESIGN.md": PALETTE.map((c) => `- ${c.name} \`${c.hex}\`: ${c.role}`),
  }[format];
  const [before, after] = {
    CSS: [[":root {"], ["}"]],
    Tailwind: [
      ["theme: {", "  colors: {"],
      ["  },", "}"],
    ],
    "DESIGN.md": [["## Colors"], ["", "## Type: Inter, 600 headings"]],
  }[format];
  return { before, colours, after };
}

function CapturePanel() {
  const reduceMotion = useReducedMotion();
  const [format, setFormat] = useState<Format>("CSS");
  const [picked, setPicked] = useState(0);
  const { before, colours, after } = exportLines(format);
  const code = [...before, ...colours, ...after].join("\n");

  return (
    <div className="flex min-w-0 flex-col rounded-[8px] bg-white/80 p-5 shadow-[inset_0_1px_0_#fff,0_40px_80px_-48px_rgba(20,20,20,0.5)] ring-1 ring-inset ring-[#141414]/10 sm:p-6">
      {/* Scan summary */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[13px] font-medium">
            <span aria-hidden className="relative flex size-2">
              <span
                className="absolute inset-0 animate-ping rounded-full opacity-60 motion-reduce:hidden"
                style={{ background: PRINT }}
              />
              <span
                className="relative size-2 rounded-full"
                style={{ background: PRINT }}
              />
            </span>
            Sample scan
          </p>
          <p className="mt-1 text-[12px] text-[#141414]/50">
            One landing page, one click
          </p>
        </div>
        <p className="text-right">
          <span className="block text-[30px] font-medium leading-none tracking-[-0.05em]">
            <CountUp value={SCAN_TOTAL} />
          </span>
          <span className="text-[11.5px] text-[#141414]/50">
            assets extracted
          </span>
        </p>
      </div>

      <div className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
        {SCAN.map((kind, index) => (
          <motion.span
            key={kind.label}
            className="h-full origin-left first:rounded-l-full last:rounded-r-full"
            style={{ flex: kind.count, background: kind.tint }}
            initial={reduceMotion ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.7, ease: EASE, delay: index * 0.08 }}
          />
        ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1">
        {SCAN.map((kind) => (
          <li
            key={kind.label}
            className="flex items-center gap-1.5 text-[11.5px] text-[#141414]/60"
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ background: kind.tint }}
            />
            <span className="tabular-nums text-[#141414]">{kind.count}</span>
            {kind.label}
          </li>
        ))}
      </ul>

      {/* Palette: pick a swatch to find it in the export */}
      <div
        role="radiogroup"
        aria-label="Captured palette"
        className="mt-5 grid grid-cols-6 gap-1.5"
      >
        {PALETTE.map((colour, index) => {
          const active = picked === index;
          return (
            <button
              key={colour.name}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${colour.name} ${colour.hex}`}
              onClick={() => setPicked(index)}
              className="group flex min-w-0 flex-col items-center gap-1.5"
            >
              <span
                className="relative block aspect-square w-full rounded-[6px] ring-1 ring-inset ring-[#141414]/10 transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transform-none"
                style={{ background: colour.hex }}
              >
                {active ? (
                  <motion.span
                    layoutId="assetsnip-pick"
                    aria-hidden
                    className="absolute -inset-[4px] rounded-[8px] border-[1.5px]"
                    style={{ borderColor: PRINT }}
                    transition={{ duration: 0.35, ease: EASE }}
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "w-full truncate text-center font-mono text-[10px] transition-colors",
                  active ? "text-[#141414]" : "text-[#141414]/45",
                )}
              >
                {colour.hex}
              </span>
            </button>
          );
        })}
      </div>

      {/* Export */}
      <div
        role="group"
        aria-label="Export format"
        className="mt-5 inline-flex self-start rounded-full bg-[#141414]/[0.06] p-0.5"
      >
        {FORMATS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={format === option}
            onClick={() => setFormat(option)}
            className={cn(
              "relative rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
              format === option
                ? "text-[#141414]"
                : "text-[#141414]/55 hover:text-[#141414]",
            )}
          >
            {format === option ? (
              <motion.span
                layoutId="assetsnip-format"
                aria-hidden
                className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(20,20,20,0.18)]"
                transition={{ duration: 0.3, ease: EASE }}
              />
            ) : null}
            <span className="relative">{option}</span>
          </button>
        ))}
      </div>

      <div
        className="relative mt-2.5 flex-1 rounded-[6px] text-[#f4efe7]"
        style={{ background: NIGHT }}
      >
        <CopyButton text={code} className="absolute right-2.5 top-2.5 z-[1]" />
        <pre
          data-lenis-prevent
          className="overflow-x-auto py-3.5 font-mono text-[12px] leading-[1.7]"
        >
          <code>
            {before.map((line, row) => (
              <span
                key={`b${row}`}
                className="block whitespace-pre px-4 text-[#f4efe7]/45"
              >
                {line}
              </span>
            ))}
            {colours.map((line, row) => (
              <span
                key={`c${row}`}
                className={cn(
                  "relative block whitespace-pre px-4 transition-colors duration-300",
                  row === picked
                    ? "bg-white/[0.07] text-[#f4efe7]"
                    : "text-[#f4efe7]/65",
                )}
              >
                {row === picked ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-[2px]"
                    style={{ background: PRINT }}
                  />
                ) : null}
                {line}
              </span>
            ))}
            {after.map((line, row) => (
              <span
                key={`a${row}`}
                className="block min-h-[1.7em] whitespace-pre px-4 text-[#f4efe7]/45"
              >
                {line}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

export default function AssetSnipChapter({ index }: { index: number }) {
  return (
    <ProductChapter
      product={assetsnip}
      index={index}
      reverse
      aside={<CapturePanel />}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {assetsnip.features.map((feature) => (
          <FeatureTile key={feature.key} feature={feature} />
        ))}
      </div>
    </ProductChapter>
  );
}
