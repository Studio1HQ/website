import { readFile } from "fs/promises";
import path from "path";
import type { CSSProperties, ReactNode } from "react";
import { ImageResponse } from "next/og";
import { getAllPosts } from "@/lib/blog";
import { BLOG_COVER_SIZE } from "@/lib/blog-cover";
import { coverArtFor, titleLead, type CoverArtKey } from "@/lib/blog-cover-art";
import { INK, PRINT } from "@/lib/paper";

/*
 * Blog covers in the paper design, drawn with next/og at BLOG_COVER_SIZE: an
 * illustration picked from what the post is about, framed on the orange print
 * panel. No title on the image; every place a cover appears shows it already.
 */

const MUTED = "rgba(20,20,20,0.55)";
const LINE = "rgba(20,20,20,0.12)";
const CREAM = "#f4efe7";
const LOGO_PATH =
  "M0 35C0 16.6807 14.0744 1.64844 32 0.126953V141H51.0523C52.4308 137.344 54.7446 133.689 57.9938 130.033C61.1446 126.508 64.6892 123.44 68.6277 120.829C72.5662 118.349 76.3569 116.782 80 116.129V86.7544C75.4708 87.9292 71.3846 89.6919 67.7415 92.0415C64 94.5225 60.7508 97.46 57.9938 100.854C56.5345 102.72 55.2545 104.659 54.1539 106.671V0H125C144.33 0 160 15.6699 160 35V125C160 144.33 144.33 160 125 160H124V18H104.948C103.569 21.6816 101.255 25.3628 98.0062 29.0444C94.8554 32.5942 91.3108 35.6841 87.3723 38.314C83.4338 40.812 79.6431 42.3896 76 43.0474V72.6304C80.5292 71.4473 84.6154 69.6724 88.2585 67.3057C92 64.8076 95.2492 61.8491 98.0062 58.4307C99.4655 56.5513 100.745 54.5986 101.846 52.5723V160H35C15.67 160 0 144.33 0 125V35Z";

/** The orange print panel: flat print orange, like the homepage contact banner. */
const PANEL: CSSProperties = {
  backgroundColor: PRINT,
};

const flex = (style: CSSProperties = {}): CSSProperties => ({ display: "flex", ...style });
const card = (style: CSSProperties = {}): CSSProperties =>
  flex({ flexDirection: "column", background: "#fff", boxShadow: "0 30px 60px -30px rgba(20,20,20,0.35)", ...style });

/** Small uppercase caption used across the illustrations. */
function Caption({ children, color = MUTED }: { children: ReactNode; color?: string }) {
  return <div style={flex({ fontSize: 15, fontWeight: 500, letterSpacing: "0.12em", color })}>{children}</div>;
}

function Tag({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div style={flex({ padding: "5px 9px", fontSize: 15, fontWeight: 500, color: dark ? CREAM : "#fff", background: dark ? INK : PRINT })}>
      {children}
    </div>
  );
}

/** A grey text line, standing in for copy. */
function Bar({ width, color = "rgba(20,20,20,0.12)", height = 12 }: { width: number | string; color?: string; height?: number }) {
  return <div style={flex({ width, height, borderRadius: 999, background: color })} />;
}

export function Mark({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160">
      <path fillRule="evenodd" clipRule="evenodd" d={LOGO_PATH} fill={color} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Illustrations, one per kind of post                                  */
/* ------------------------------------------------------------------ */

function Versus({ left, right }: { left: string; right: string }) {
  const side = (label: string, name: string, bars: number[], accent: boolean) => (
    <div style={card({ width: 500, padding: "26px 30px" })}>
      <Caption color={accent ? PRINT : MUTED}>{label}</Caption>
      <div style={flex({ marginTop: 8, fontSize: 34, fontWeight: 500, letterSpacing: "-0.03em" })}>{name}</div>
      <div style={flex({ flexDirection: "column", gap: 10, marginTop: 18 })}>
        {bars.map((width, index) => (
          <Bar key={index} width={`${width}%`} color={index === 0 && accent ? PRINT : undefined} />
        ))}
      </div>
    </div>
  );
  return (
    <div style={flex({ flexDirection: "column", alignItems: "center" })}>
      {side("OPTION A", left, [82, 64, 48], false)}
      <div
        style={flex({
          width: 92,
          height: 92,
          marginTop: -18,
          marginBottom: -18,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          background: INK,
          color: CREAM,
          fontSize: 30,
          fontWeight: 500,
          border: `6px solid ${CREAM}`,
        })}
      >
        vs
      </div>
      {side("OPTION B", right, [70, 88, 56], true)}
    </div>
  );
}

function Bench({ name }: { name: string }) {
  // Decorative bars, varied per model name so reviews don't look identical.
  const seed = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rows: [string, number][] = ["Coding", "Reasoning", "Long context", "Speed", "Cost"].map((label, index) => [
    label,
    52 + ((seed * (index + 3) * 7) % 42),
  ]);
  return (
    <div style={card({ width: 540, padding: "30px 32px" })}>
      <div style={flex({ justifyContent: "space-between", alignItems: "center" })}>
        <Caption>BENCHMARKS</Caption>
        <Tag>review</Tag>
      </div>
      <div style={flex({ marginTop: 10, fontSize: 36, fontWeight: 500, letterSpacing: "-0.035em" })}>{name}</div>
      <div style={flex({ flexDirection: "column", gap: 18, marginTop: 26 })}>
        {rows.map(([label, value], index) => (
          <div key={label} style={flex({ alignItems: "center", gap: 18 })}>
            <div style={flex({ width: 140, fontSize: 18, color: MUTED })}>{label}</div>
            <div style={flex({ flex: 1, height: 16, background: CREAM })}>
              <div style={flex({ width: `${value}%`, background: index === 0 ? PRINT : INK })} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pricing() {
  const rows: [string, string][] = [
    ["Advice only", "$"],
    ["Part-time lead", "$$"],
    ["Embedded team", "$$$"],
  ];
  return (
    <div style={flex({ position: "relative" })}>
      <div style={card({ width: 500, padding: "32px 34px" })}>
        <Caption>ENGAGEMENT MODELS</Caption>
        <div style={flex({ flexDirection: "column", marginTop: 18 })}>
          {rows.map(([label, price]) => (
            <div
              key={label}
              style={flex({ justifyContent: "space-between", padding: "16px 0", borderBottom: `2px dashed ${LINE}`, fontSize: 24 })}
            >
              <span>{label}</span>
              <span style={{ fontWeight: 500, color: PRINT }}>{price}</span>
            </div>
          ))}
        </div>
        <div style={flex({ justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: `3px solid ${INK}`, fontSize: 26, fontWeight: 500 })}>
          <span>Fractional</span>
          <span>per month</span>
        </div>
      </div>
      <div
        style={flex({
          position: "absolute",
          right: -40,
          top: -34,
          padding: "10px 16px",
          border: `3px solid ${INK}`,
          background: CREAM,
          fontSize: 22,
          fontWeight: 500,
          transform: "rotate(8deg)",
        })}
      >
        PART-TIME
      </div>
    </div>
  );
}

function Doc({ file, lines }: { file: string; lines: { text?: string; bar?: number; accent?: boolean; indent?: boolean }[] }) {
  return (
    <div style={card({ width: 560 })}>
      <div style={flex({ alignItems: "center", gap: 8, padding: "16px 20px", borderBottom: `1px solid ${LINE}`, background: CREAM })}>
        {[0, 1, 2].map((dot) => (
          <div key={dot} style={flex({ width: 12, height: 12, borderRadius: 999, background: "rgba(20,20,20,0.18)" })} />
        ))}
        <div style={flex({ marginLeft: 14, padding: "5px 12px", background: "#fff", fontSize: 17, fontWeight: 500 })}>{file}</div>
      </div>
      <div style={flex({ flexDirection: "column", gap: 16, padding: "26px 30px 32px" })}>
        {lines.map((line, index) =>
          line.text ? (
            <div
              key={index}
              style={flex({
                fontSize: 22,
                fontWeight: line.accent ? 500 : 400,
                color: line.accent ? INK : MUTED,
                paddingLeft: line.indent ? 22 : 0,
              })}
            >
              {line.text}
            </div>
          ) : (
            <div key={index} style={flex({ paddingLeft: line.indent ? 22 : 0 })}>
              <Bar width={line.bar ?? 300} color={line.accent ? PRINT : undefined} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function Answer() {
  return (
    <div style={flex({ flexDirection: "column", width: 560, gap: 18 })}>
      <div style={flex({ alignSelf: "flex-end", maxWidth: 420, padding: "18px 22px", background: INK, color: CREAM, fontSize: 22, lineHeight: 1.35 })}>
        What&apos;s the best tool for this job?
      </div>
      <div style={card({ padding: "24px 26px" })}>
        <Caption>AI ANSWER</Caption>
        <div style={flex({ flexDirection: "column", gap: 12, marginTop: 16 })}>
          <div style={flex({ alignItems: "center", gap: 14, padding: "14px 16px", background: "#fdf0e4", border: `2px solid ${PRINT}` })}>
            <span style={{ fontSize: 22, fontWeight: 500, color: PRINT }}>1</span>
            <span style={{ fontSize: 22, fontWeight: 500 }}>Your tool</span>
            <div style={flex({ marginLeft: "auto" })}>
              <Tag>cited</Tag>
            </div>
          </div>
          {[2, 3].map((rank) => (
            <div key={rank} style={flex({ alignItems: "center", gap: 14, padding: "12px 16px" })}>
              <span style={{ fontSize: 22, color: MUTED }}>{rank}</span>
              <Bar width={rank === 2 ? 220 : 170} />
            </div>
          ))}
        </div>
        <div style={flex({ gap: 8, marginTop: 14, paddingTop: 16, borderTop: `1px solid ${LINE}` })}>
          {["docs", "github", "reddit"].map((source) => (
            <div key={source} style={flex({ padding: "5px 11px", border: `1px solid ${LINE}`, fontSize: 15, color: MUTED })}>
              {source}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A generative answer with numbered citations, your page first among its sources. */
function Citations() {
  const marker = (n: number, accent = false) => (
    <div
      style={flex({
        width: 26,
        height: 26,
        alignItems: "center",
        justifyContent: "center",
        fontSize: 15,
        fontWeight: 500,
        color: accent ? "#fff" : MUTED,
        background: accent ? PRINT : CREAM,
      })}
    >
      {n}
    </div>
  );
  const sources: [string, boolean][] = [
    ["yourtool.dev/docs", true],
    ["github.com", false],
    ["reddit.com", false],
  ];
  return (
    <div style={card({ width: 560, padding: "28px 30px" })}>
      <div style={flex({ justifyContent: "space-between", alignItems: "center" })}>
        <Caption>GENERATED ANSWER</Caption>
        <Tag dark>GEO</Tag>
      </div>
      <div style={flex({ flexDirection: "column", gap: 14, marginTop: 22 })}>
        <div style={flex({ alignItems: "center", gap: 10 })}>
          <Bar width={360} />
          {marker(1, true)}
        </div>
        <div style={flex({ alignItems: "center", gap: 10 })}>
          <Bar width={300} />
          {marker(2)}
        </div>
        <div style={flex({ alignItems: "center", gap: 10 })}>
          <Bar width={250} color={PRINT} />
          {marker(1, true)}
        </div>
      </div>
      <div style={flex({ flexDirection: "column", marginTop: 22, paddingTop: 8, borderTop: `1px solid ${LINE}` })}>
        {sources.map(([source, cited], index) => (
          <div
            key={source}
            style={flex({
              alignItems: "center",
              gap: 14,
              marginTop: 10,
              padding: "10px 14px",
              background: cited ? "#fdf0e4" : "transparent",
              border: cited ? `2px solid ${PRINT}` : "2px solid transparent",
            })}
          >
            {marker(index + 1, cited)}
            <span style={{ fontSize: 20, fontWeight: cited ? 500 : 400, color: cited ? INK : MUTED }}>{source}</span>
            {cited ? (
              <div style={flex({ marginLeft: "auto" })}>
                <Tag>cited twice</Tag>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A search box, the answer shown above the links, and the follow-up questions. */
function AnswerBox() {
  return (
    <div style={flex({ flexDirection: "column", width: 560, gap: 16 })}>
      <div style={flex({ alignItems: "center", gap: 14, padding: "16px 22px", borderRadius: 999, background: "#fff", boxShadow: "0 20px 40px -26px rgba(20,20,20,0.4)" })}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="10.5" cy="10.5" r="6.5" stroke={INK} strokeWidth="2.2" />
          <path d="m15.5 15.5 5 5" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 21 }}>what is answer engine optimization?</span>
      </div>
      <div style={card({ padding: "24px 28px" })}>
        <div style={flex({ justifyContent: "space-between", alignItems: "center" })}>
          <Caption>THE ANSWER</Caption>
          <Tag>AEO</Tag>
        </div>
        <div style={flex({ marginTop: 14, fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em" })}>Answer first, in 40 to 60 words.</div>
        <div style={flex({ flexDirection: "column", gap: 10, marginTop: 14 })}>
          <Bar width={430} />
          <Bar width={360} />
        </div>
        <div style={flex({ alignItems: "center", gap: 10, marginTop: 18, fontSize: 17, color: MUTED })}>
          <div style={flex({ width: 14, height: 14, background: PRINT })} />
          yourtool.dev
        </div>
      </div>
      <div style={card({ padding: "6px 28px" })}>
        {["People also ask: is AEO the same as SEO?", "How do I get cited in AI answers?"].map((question, index) => (
          <div
            key={question}
            style={flex({
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 0",
              borderTop: index ? `1px solid ${LINE}` : "none",
              fontSize: 19,
              color: index ? MUTED : INK,
            })}
          >
            <span>{question}</span>
            <span style={{ color: MUTED }}>⌄</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Scorecard() {
  const engines = ["ChatGPT", "Perplexity", "Gemini"];
  // Which of the 12 prompts mentioned the tool, per engine (illustrative).
  const hits = ["110100110010", "011011010110", "100110011001"];
  return (
    <div style={card({ width: 580, padding: "30px 32px" })}>
      <div style={flex({ justifyContent: "space-between", alignItems: "center" })}>
        <Caption>12 PROMPTS × 3 ENGINES</Caption>
        <Tag dark>audit</Tag>
      </div>
      <div style={flex({ flexDirection: "column", gap: 14, marginTop: 24 })}>
        {engines.map((engine, row) => (
          <div key={engine} style={flex({ alignItems: "center", gap: 16 })}>
            <div style={flex({ width: 118, fontSize: 18, color: MUTED })}>{engine}</div>
            <div style={flex({ gap: 6 })}>
              {hits[row].split("").map((hit, col) => (
                <div
                  key={col}
                  style={flex({
                    width: 28,
                    height: 28,
                    background: hit === "1" ? PRINT : CREAM,
                    border: hit === "1" ? "none" : `1px solid ${LINE}`,
                  })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={flex({ alignItems: "center", gap: 10, marginTop: 22, paddingTop: 16, borderTop: `1px solid ${LINE}`, fontSize: 16, color: MUTED })}>
        <div style={flex({ width: 14, height: 14, background: PRINT })} />
        <span>mentioned</span>
        <div style={flex({ width: 14, height: 14, marginLeft: 14, background: CREAM, border: `1px solid ${LINE}` })} />
        <span>missing</span>
      </div>
    </div>
  );
}

function Funnel({
  caption = "BEYOND PAGEVIEWS",
  labels = ["Pageviews", "Signups", "Activated", "Revenue"],
}: {
  caption?: string;
  labels?: [string, string, string, string];
}) {
  const stages: [string, number][] = labels.map((label, index) => [label, [400, 318, 250, 190][index]]);
  return (
    <div style={card({ width: 560, padding: "30px 32px" })}>
      <Caption>{caption}</Caption>
      <div style={flex({ flexDirection: "column", gap: 14, marginTop: 24 })}>
        {stages.map(([label, width], index) => (
          <div key={label} style={flex({ alignItems: "center", gap: 18 })}>
            <div
              style={flex({
                width,
                height: 58,
                alignItems: "center",
                paddingLeft: 18,
                background: index === stages.length - 1 ? PRINT : index === 0 ? CREAM : INK,
                color: index === 0 ? MUTED : "#fff",
                fontSize: 20,
                fontWeight: 500,
              })}
            >
              {label}
            </div>
            {index === stages.length - 1 ? <Tag dark>ROI</Tag> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const LAUNCH_CHECKLIST: [string, boolean][] = [
  ["Docs before launch", false],
  ["Quickstart that works", true],
  ["Clear pricing page", false],
  ["Real code examples", true],
  ["A feedback loop", false],
];

/** Rows are [label, passed]; a failed row is struck through in print orange. */
function Checklist({
  caption = "LAUNCH CHECKLIST",
  tag = "3 misses",
  items = LAUNCH_CHECKLIST,
}: {
  caption?: string;
  tag?: string;
  items?: [string, boolean][];
}) {
  return (
    <div style={card({ width: 540, padding: "30px 32px" })}>
      <div style={flex({ justifyContent: "space-between", alignItems: "center" })}>
        <Caption>{caption}</Caption>
        <Tag>{tag}</Tag>
      </div>
      <div style={flex({ flexDirection: "column", marginTop: 14 })}>
        {items.map(([label, done]) => (
          <div key={label} style={flex({ alignItems: "center", gap: 16, padding: "14px 0", borderBottom: `1px solid ${LINE}` })}>
            <div
              style={flex({
                width: 30,
                height: 30,
                alignItems: "center",
                justifyContent: "center",
                background: done ? INK : PRINT,
                color: "#fff",
                fontSize: 18,
                fontWeight: 500,
              })}
            >
              {done ? "✓" : "×"}
            </div>
            <span style={{ fontSize: 22, color: done ? INK : MUTED, textDecoration: done ? "none" : "line-through" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Network() {
  const nodes: [number, number, string][] = [
    [80, 90, "AK"],
    [300, 40, "JM"],
    [500, 110, "RS"],
    [540, 300, "LT"],
    [430, 470, "DV"],
    [190, 480, "NP"],
    [50, 320, "OW"],
  ];
  const center: [number, number] = [290, 270];
  return (
    <div style={flex({ position: "relative", width: 600, height: 560 })}>
      <svg width="600" height="560" viewBox="0 0 600 560" style={{ position: "absolute", left: 0, top: 0 }}>
        {nodes.map(([x, y], index) => (
          <line key={`c${index}`} x1={center[0]} y1={center[1]} x2={x} y2={y} stroke={INK} strokeOpacity="0.35" strokeWidth="2" />
        ))}
        {nodes.map(([x, y], index) => {
          const [nx, ny] = nodes[(index + 1) % nodes.length];
          return <line key={`r${index}`} x1={x} y1={y} x2={nx} y2={ny} stroke={INK} strokeOpacity="0.18" strokeWidth="2" strokeDasharray="4 8" />;
        })}
      </svg>
      {nodes.map(([x, y, initials], index) => (
        <div
          key={initials}
          style={flex({
            position: "absolute",
            left: x - 38,
            top: y - 38,
            width: 76,
            height: 76,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            background: index % 3 === 0 ? INK : "#fff",
            color: index % 3 === 0 ? CREAM : INK,
            fontSize: 22,
            fontWeight: 500,
            boxShadow: "0 18px 30px -18px rgba(20,20,20,0.4)",
          })}
        >
          {initials}
        </div>
      ))}
      <div
        style={flex({
          position: "absolute",
          left: center[0] - 74,
          top: center[1] - 74,
          width: 148,
          height: 148,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          background: CREAM,
          border: `4px solid ${INK}`,
        })}
      >
        <Mark size={72} color={PRINT} />
      </div>
    </div>
  );
}

function Tiles() {
  return (
    <div style={flex({ flexWrap: "wrap", width: 590, gap: 14 })}>
      {Array.from({ length: 10 }, (_, index) => {
        const tone = [PRINT, "#fff", INK, "#fff", CREAM][index % 5];
        const dark = tone === INK || tone === PRINT;
        return (
          <div
            key={index}
            style={flex({
              width: 106,
              height: 150,
              flexDirection: "column",
              justifyContent: "space-between",
              padding: 14,
              background: tone,
              color: dark ? "#fff" : INK,
              boxShadow: "0 18px 30px -20px rgba(20,20,20,0.35)",
            })}
          >
            <span style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-0.04em" }}>{String(index + 1).padStart(2, "0")}</span>
            <Bar width={58} height={8} color={dark ? "rgba(255,255,255,0.45)" : "rgba(20,20,20,0.18)"} />
          </div>
        );
      })}
    </div>
  );
}

function Pages() {
  const page = (rotate: number, x: number, y: number, top: boolean) => (
    <div
      style={card({
        position: "absolute",
        left: x,
        top: y,
        width: 330,
        height: 430,
        padding: 26,
        gap: 14,
        transform: `rotate(${rotate}deg)`,
      })}
    >
      <div style={flex({ height: 150, background: top ? PRINT : CREAM, alignItems: "center", justifyContent: "center" })}>
        {top ? <Mark size={78} color={CREAM} /> : null}
      </div>
      <Bar width="90%" height={16} color={top ? INK : undefined} />
      <Bar width="70%" height={16} color={top ? INK : undefined} />
      <Bar width="96%" />
      <Bar width="84%" />
      <Bar width="60%" />
    </div>
  );
  return (
    <div style={flex({ position: "relative", width: 600, height: 540 })}>
      {page(-11, 30, 70, false)}
      {page(9, 240, 60, false)}
      {page(-1, 135, 40, true)}
    </div>
  );
}

function Terminal({ command, result = "→ decision ready" }: { command: string; result?: string }) {
  const lines: { bar?: number; color?: string; text?: string; indent?: number }[] = [
    { text: `$ ${command}`, color: CREAM },
    { bar: 360, color: "rgba(244,239,231,0.28)" },
    { bar: 280, color: PRINT, indent: 1 },
    { bar: 330, color: "rgba(244,239,231,0.28)", indent: 1 },
    { bar: 210, color: "rgba(244,239,231,0.28)", indent: 1 },
    { text: result, color: PRINT },
  ];
  return (
    <div style={flex({ flexDirection: "column", width: 560, background: INK, boxShadow: "0 30px 60px -30px rgba(20,20,20,0.45)" })}>
      <div style={flex({ alignItems: "center", gap: 8, padding: "16px 20px", borderBottom: "1px solid rgba(244,239,231,0.12)" })}>
        {[0, 1, 2].map((dot) => (
          <div key={dot} style={flex({ width: 12, height: 12, borderRadius: 999, background: "rgba(244,239,231,0.25)" })} />
        ))}
        <span style={{ marginLeft: 14, fontSize: 16, color: "rgba(244,239,231,0.6)" }}>terminal</span>
      </div>
      <div style={flex({ flexDirection: "column", gap: 20, padding: "30px 32px 36px" })}>
        {lines.map((line, index) =>
          line.text ? (
            <div key={index} style={flex({ fontSize: 24, color: line.color })}>
              {line.text}
            </div>
          ) : (
            <div key={index} style={flex({ paddingLeft: (line.indent ?? 0) * 28 })}>
              <Bar width={line.bar ?? 200} color={line.color} height={14} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

/** Tabler's outline GitHub mark (MIT), drawn with a stroke. */
const GITHUB_PATH =
  "M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5";
const STAR_PATH = "M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6L2.5 9.5l6.6-.8z";

function StarHistory() {
  const W = 536;
  const H = 200;
  // Illustrative star count: flat, a jump at each launch moment, then a steady climb.
  const points: [number, number][] = [
    [0, 192], [80, 186], [150, 178], [178, 172], [206, 108], [250, 96], [300, 86],
    [330, 80], [362, 34], [420, 24], [480, 16], [W, 8],
  ];
  const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`).join(" ");
  const launches: { x: number; y: number; label: string }[] = [
    { x: 206, y: 108, label: "Show HN" },
    { x: 362, y: 34, label: "Launch week" },
  ];
  return (
    <div style={card({ width: 600, padding: "28px 32px 26px" })}>
      <div style={flex({ justifyContent: "space-between", alignItems: "center" })}>
        <div style={flex({ alignItems: "center", gap: 12, fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em" })}>
          <svg width={32} height={32} viewBox="0 0 24 24">
            <path d={GITHUB_PATH} fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ color: MUTED }}>your-org /</span>
          <span>launch</span>
        </div>
        <div style={flex({ alignItems: "center", gap: 6, padding: "6px 10px", background: PRINT, color: "#fff", fontSize: 18, fontWeight: 500 })}>
          <svg width={18} height={18} viewBox="0 0 24 24">
            <path d={STAR_PATH} fill="#fff" />
          </svg>
          12k
        </div>
      </div>
      <div style={flex({ marginTop: 18 })}>
        <Caption>STAR HISTORY</Caption>
      </div>
      <div style={flex({ position: "relative", width: W, height: H, flexShrink: 0, marginTop: 16 })}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }}>
          {[0.25, 0.5, 0.75].map((row) => (
            <line key={row} x1="0" x2={W} y1={H * row} y2={H * row} stroke={LINE} strokeWidth="2" strokeDasharray="6 6" />
          ))}
          <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={PRINT} fillOpacity="0.14" />
          <path d={line} fill="none" stroke={PRINT} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
          {launches.map(({ x, y }) => (
            <circle key={x} cx={x} cy={y} r="10" fill={INK} stroke="#fff" strokeWidth="4" />
          ))}
        </svg>
        {launches.map(({ x, y, label }) => (
          <div key={label} style={flex({ position: "absolute", left: x - 150, top: y - 14, width: 132, justifyContent: "flex-end" })}>
            <Tag dark>{label}</Tag>
          </div>
        ))}
      </div>
      <div style={flex({ justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${LINE}`, fontSize: 15, color: MUTED })}>
        <span>Day 0</span>
        <span>Day 30</span>
        <span>Day 90</span>
      </div>
    </div>
  );
}

const PLAY_PATH = "M7 4.5v15l12.5-7.5z";
const UPVOTE_PATH = "M12 5l7.5 10h-15z";

/** A video frame with a play button, progress bar and chapter chips. */
function Player({ file, chapters }: { file: string; chapters: string[] }) {
  return (
    <div style={card({ width: 580 })}>
      <div style={flex({ alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${LINE}`, background: CREAM })}>
        <div style={flex({ fontSize: 17, fontWeight: 500 })}>{file}</div>
        <Tag>demo</Tag>
      </div>
      <div style={flex({ position: "relative", height: 260, margin: "20px 22px 0", alignItems: "center", justifyContent: "center", background: INK })}>
        <div style={flex({ position: "absolute", left: 24, top: 24, flexDirection: "column", gap: 12 })}>
          <Bar width={220} height={10} color="rgba(244,239,231,0.3)" />
          <Bar width={150} height={10} color={PRINT} />
          <Bar width={250} height={10} color="rgba(244,239,231,0.3)" />
        </div>
        <div style={flex({ width: 96, height: 96, borderRadius: 999, alignItems: "center", justifyContent: "center", background: PRINT })}>
          <svg width={40} height={40} viewBox="0 0 24 24">
            <path d={PLAY_PATH} fill="#fff" />
          </svg>
        </div>
      </div>
      <div style={flex({ flexDirection: "column", gap: 16, padding: "18px 22px 24px" })}>
        <div style={flex({ height: 8, background: CREAM })}>
          <div style={flex({ width: "42%", background: PRINT })} />
        </div>
        <div style={flex({ gap: 8 })}>
          {chapters.map((chapter, index) => (
            <div
              key={chapter}
              style={flex({ padding: "5px 11px", border: `${index === 1 ? 2 : 1}px solid ${index === 1 ? PRINT : LINE}`, fontSize: 15, color: index === 1 ? INK : MUTED })}
            >
              {chapter}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A launch timeline from prep to the week after, launch day in print orange. */
function LaunchPlan() {
  const rows: [string, string][] = [
    ["6 weeks out", "Pick what is new"],
    ["2 weeks out", "Quickstart, demo, listing"],
    ["Launch day", "Reply to every comment"],
    ["Week 2", "Turn the spike into users"],
  ];
  return (
    <div style={card({ width: 560, padding: "30px 32px" })}>
      <div style={flex({ justifyContent: "space-between", alignItems: "center" })}>
        <Caption>LAUNCH PLAN</Caption>
        <Tag dark>T-0</Tag>
      </div>
      <div style={flex({ flexDirection: "column", marginTop: 14 })}>
        {rows.map(([when, what], index) => {
          const today = index === 2;
          return (
            <div key={when} style={flex({ alignItems: "center", gap: 18, padding: "16px 0", borderBottom: index < rows.length - 1 ? `1px solid ${LINE}` : "none" })}>
              <div style={flex({ width: 18, height: 18, background: today ? PRINT : index < 2 ? INK : CREAM, border: index > 2 ? `2px solid ${INK}` : "none" })} />
              <div style={flex({ width: 136, fontSize: 17, color: MUTED })}>{when}</div>
              <div style={flex({ fontSize: 22, fontWeight: today ? 500 : 400 })}>{what}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A ranked link list with a Show HN post on top. */
function RankedList() {
  const upvote = (color: string) => (
    <svg width={18} height={18} viewBox="0 0 24 24">
      <path d={UPVOTE_PATH} fill={color} />
    </svg>
  );
  return (
    <div style={card({ width: 580, padding: "28px 30px" })}>
      <div style={flex({ justifyContent: "space-between", alignItems: "center" })}>
        <Caption>FRONT PAGE</Caption>
        <Tag dark>show</Tag>
      </div>
      <div style={flex({ flexDirection: "column", gap: 6, marginTop: 18 })}>
        <div style={flex({ flexDirection: "column", gap: 10, padding: "16px 18px", background: "#fdf0e4", border: `2px solid ${PRINT}` })}>
          <div style={flex({ alignItems: "center", gap: 12 })}>
            <span style={{ fontSize: 20, color: MUTED }}>1.</span>
            {upvote(PRINT)}
            <span style={{ fontSize: 22, fontWeight: 500 }}>Show HN: Your tool, in one line</span>
          </div>
          <div style={flex({ gap: 10, paddingLeft: 62 })}>
            <Bar width={90} height={9} color="rgba(20,20,20,0.2)" />
            <Bar width={120} height={9} color="rgba(20,20,20,0.2)" />
          </div>
        </div>
        {[2, 3, 4].map((rank) => (
          <div key={rank} style={flex({ alignItems: "center", gap: 12, padding: "14px 18px" })}>
            <span style={{ fontSize: 20, color: MUTED }}>{rank}.</span>
            {upvote("rgba(20,20,20,0.3)")}
            <Bar width={[300, 250, 330][rank - 2]} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A daily trending list with your repo first. */
function Trending() {
  const star = (fill: string) => (
    <svg width={18} height={18} viewBox="0 0 24 24">
      <path d={STAR_PATH} fill={fill} />
    </svg>
  );
  const github = (
    <svg width={26} height={26} viewBox="0 0 24 24">
      <path d={GITHUB_PATH} fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <div style={card({ width: 580, padding: "28px 30px" })}>
      <div style={flex({ justifyContent: "space-between", alignItems: "center" })}>
        <Caption>TRENDING TODAY</Caption>
        <Tag dark>daily</Tag>
      </div>
      <div style={flex({ flexDirection: "column", marginTop: 16 })}>
        <div style={flex({ alignItems: "center", gap: 14, padding: "16px 18px", background: "#fdf0e4", border: `2px solid ${PRINT}` })}>
          {github}
          <span style={{ fontSize: 22, color: MUTED }}>your-org /</span>
          <span style={{ fontSize: 22, fontWeight: 500 }}>launch</span>
          <div style={flex({ marginLeft: "auto", alignItems: "center", gap: 6, padding: "5px 10px", background: PRINT, color: "#fff", fontSize: 16, fontWeight: 500 })}>
            {star("#fff")}
            today
          </div>
        </div>
        {[260, 210, 290].map((width, index) => (
          <div key={index} style={flex({ alignItems: "center", gap: 14, padding: "16px 18px", borderBottom: index < 2 ? `1px solid ${LINE}` : "none" })}>
            {star("rgba(20,20,20,0.25)")}
            <Bar width={width} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Adoption metrics, with raw stars struck off the top of the list. */
function Metrics() {
  const rows: [string, number][] = [
    ["Stars", 92],
    ["Weekly installs", 74],
    ["Active contributors", 52],
    ["Issues closed", 64],
    ["Returning users", 46],
  ];
  return (
    <div style={card({ width: 560, padding: "30px 32px" })}>
      <div style={flex({ justifyContent: "space-between", alignItems: "center" })}>
        <Caption>BEYOND STARS</Caption>
        <Tag>adoption</Tag>
      </div>
      <div style={flex({ flexDirection: "column", gap: 18, marginTop: 24 })}>
        {rows.map(([label, value], index) => (
          <div key={label} style={flex({ alignItems: "center", gap: 18 })}>
            <div style={flex({ width: 210, fontSize: 18, color: index === 0 ? MUTED : INK, textDecoration: index === 0 ? "line-through" : "none" })}>
              {label}
            </div>
            <div style={flex({ flex: 1, height: 16, background: CREAM })}>
              <div style={flex({ width: `${value}%`, background: index === 0 ? "rgba(20,20,20,0.16)" : index === 1 ? PRINT : INK })} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A month of planned posts on a weekday grid. */
function Calendar() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  // One planned piece a few times a week; the rest stay open.
  const cells: (string | null)[] = [
    "Tutorial", null, "Clip", null, null,
    null, "Compare", null, "Video", null,
    "Launch", null, null, "Docs", null,
    null, "Guide", null, null, "Recap",
  ];
  const tone = (label: string) => (label === "Launch" ? PRINT : label === "Compare" || label === "Video" ? INK : "#fdf0e4");
  return (
    <div style={card({ width: 600, padding: "28px 30px" })}>
      <div style={flex({ justifyContent: "space-between", alignItems: "center" })}>
        <Caption>CONTENT CALENDAR</Caption>
        <Tag dark>month</Tag>
      </div>
      <div style={flex({ gap: 8, marginTop: 18 })}>
        {days.map((day) => (
          <div key={day} style={flex({ width: 100, fontSize: 15, color: MUTED })}>
            {day}
          </div>
        ))}
      </div>
      <div style={flex({ flexWrap: "wrap", gap: 8, marginTop: 10, width: 540 })}>
        {cells.map((label, index) => (
          <div
            key={index}
            style={flex({
              width: 100,
              height: 64,
              alignItems: "flex-end",
              padding: "8px 10px",
              background: label ? tone(label) : CREAM,
              color: label && tone(label) !== "#fdf0e4" ? "#fff" : INK,
              fontSize: 16,
              fontWeight: 500,
            })}
          >
            {label ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A creator's sponsored post: avatar, media with a play button, and link chips. */
function Creator() {
  return (
    <div style={card({ width: 560, padding: "26px 28px" })}>
      <div style={flex({ alignItems: "center", gap: 14 })}>
        <div style={flex({ width: 56, height: 56, borderRadius: 999, alignItems: "center", justifyContent: "center", background: INK, color: CREAM, fontSize: 20, fontWeight: 500 })}>
          DV
        </div>
        <div style={flex({ flexDirection: "column", gap: 8 })}>
          <Bar width={160} height={12} color="rgba(20,20,20,0.5)" />
          <Bar width={110} height={10} />
        </div>
        <div style={flex({ marginLeft: "auto" })}>
          <Tag>sponsored</Tag>
        </div>
      </div>
      <div style={flex({ flexDirection: "column", gap: 10, marginTop: 18 })}>
        <Bar width="94%" />
        <Bar width="72%" />
      </div>
      <div style={flex({ height: 230, marginTop: 18, alignItems: "center", justifyContent: "center", background: PRINT })}>
        <div style={flex({ width: 84, height: 84, borderRadius: 999, alignItems: "center", justifyContent: "center", background: CREAM })}>
          <svg width={36} height={36} viewBox="0 0 24 24">
            <path d={PLAY_PATH} fill={PRINT} />
          </svg>
        </div>
      </div>
      <div style={flex({ gap: 8, marginTop: 16 })}>
        {["demo", "repo link", "docs link"].map((chip) => (
          <div key={chip} style={flex({ padding: "5px 11px", border: `1px solid ${LINE}`, fontSize: 15, color: MUTED })}>
            {chip}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A founder's launch post with an install command, and creator quote posts stacking up beside it. */
function LaunchPost() {
  return (
    <div style={flex({ position: "relative", width: 720, height: 470 })}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={card({ position: "absolute", left: 380 + i * 30, top: 36 + i * 128, width: 300, padding: "16px 18px", gap: 10 })}
        >
          <div style={flex({ alignItems: "center", gap: 10 })}>
            <div style={flex({ width: 30, height: 30, borderRadius: 999, background: "rgba(20,20,20,0.18)" })} />
            <Bar width={110} height={10} color="rgba(20,20,20,0.4)" />
            <div style={flex({ marginLeft: "auto" })}>
              <Tag>quote</Tag>
            </div>
          </div>
          <Bar width="92%" height={10} />
          <Bar width="64%" height={10} />
        </div>
      ))}
      <div style={card({ position: "absolute", left: 0, top: 0, width: 440, padding: "22px 24px" })}>
        <div style={flex({ alignItems: "center", gap: 12 })}>
          <div style={flex({ width: 48, height: 48, borderRadius: 999, alignItems: "center", justifyContent: "center", background: INK, color: CREAM, fontSize: 18, fontWeight: 500 })}>
            {">_"}
          </div>
          <div style={flex({ flexDirection: "column", gap: 8 })}>
            <Bar width={130} height={11} color="rgba(20,20,20,0.5)" />
            <Bar width={90} height={9} />
          </div>
          <div style={flex({ marginLeft: "auto" })}>
            <Tag>launch</Tag>
          </div>
        </div>
        <div style={flex({ flexDirection: "column", gap: 9, marginTop: 16 })}>
          <Bar width="90%" />
          <Bar width="62%" />
        </div>
        <div style={flex({ marginTop: 14, padding: "10px 14px", background: INK, color: CREAM, fontSize: 17 })}>$ npx your-tool init</div>
        <div style={flex({ height: 150, marginTop: 12, alignItems: "center", justifyContent: "center", background: PRINT })}>
          <div style={flex({ width: 64, height: 64, borderRadius: 999, alignItems: "center", justifyContent: "center", background: CREAM })}>
            <svg width={28} height={28} viewBox="0 0 24 24">
              <path d={PLAY_PATH} fill={PRINT} />
            </svg>
          </div>
        </div>
        <div style={flex({ gap: 18, marginTop: 14, fontSize: 15, color: MUTED })}>
          <div style={flex({})}>0:55</div>
          <div style={flex({})}>replies</div>
          <div style={flex({})}>quotes</div>
          <div style={flex({})}>bookmarks</div>
        </div>
      </div>
    </div>
  );
}

/** One canonical post fanning out to the platforms it is republished on. */
function CrossPost() {
  const targets: [string, number][] = [
    ["DEV", 40],
    ["Hashnode", 190],
    ["Medium", 340],
  ];
  return (
    <div style={flex({ position: "relative", width: 620, height: 440 })}>
      <svg width="620" height="440" viewBox="0 0 620 440" style={{ position: "absolute", left: 0, top: 0 }}>
        {targets.map(([name, y]) => (
          <line key={name} x1="300" y1="220" x2="398" y2={y + 40} stroke={INK} strokeOpacity="0.45" strokeWidth="3" strokeDasharray="8 8" />
        ))}
      </svg>
      <div style={card({ position: "absolute", left: 0, top: 100, width: 300, padding: "22px 24px", gap: 14 })}>
        <div style={flex({ justifyContent: "space-between", alignItems: "center" })}>
          <Caption>YOUR BLOG</Caption>
          <Tag>canonical</Tag>
        </div>
        <div style={flex({ height: 70, background: PRINT })} />
        <Bar width="92%" height={14} color={INK} />
        <Bar width="80%" />
        <Bar width="64%" />
      </div>
      {targets.map(([name, y]) => (
        <div key={name} style={card({ position: "absolute", left: 398, top: y, width: 220, height: 80, flexDirection: "row", alignItems: "center", gap: 14, padding: "0 20px" })}>
          <div style={flex({ width: 16, height: 16, background: INK })} />
          <span style={{ fontSize: 24, fontWeight: 500 }}>{name}</span>
        </div>
      ))}
    </div>
  );
}

export function PrintMark() {
  return (
    <div style={flex({ width: 380, height: 380, alignItems: "center", justifyContent: "center", background: CREAM })}>
      <Mark size={220} color={PRINT} />
    </div>
  );
}

/** `scale` overrides the panel's zoom for art too tall to fit the cover at it. */
export type Art = { label: string; node: ReactNode; scale?: number };

/** Picks the illustration from what the post is about. */
const doc = (file: string, lines: Parameters<typeof Doc>[0]["lines"]) => <Doc file={file} lines={lines} />;

/** Each illustration's drawing; some take names from the title. */
const ART: Record<CoverArtKey, (post: CoverPost) => Art> = {
  citations: () => ({ label: "citations.fig", node: <Citations /> }),
  "answer-box": () => ({ label: "answer-box.fig", node: <AnswerBox />, scale: 1.2 }),
  versus: (post) => {
    const [left, right] = titleLead(post.title).split(/\s+vs\.?\s+/i);
    return {
      label: "versus.fig",
      node: right ? <Versus left={left} right={right} /> : <Versus left="Incumbent" right="Your tool" />,
    };
  },
  benchmarks: (post) => ({ label: "benchmarks.fig", node: <Bench name={titleLead(post.title).replace(/\s+review$/i, "")} /> }),
  readme: () => ({
    label: "README.md",
    node: doc("README.md", [
      { text: "# your-tool", accent: true },
      { text: "> What it does, in one line" },
      { text: "## Quickstart", accent: true },
      { text: "npm install your-tool", indent: true },
      { bar: 300, indent: true },
      { bar: 220, accent: true },
    ]),
  }),
  trending: () => ({ label: "trending.fig", node: <Trending /> }),
  metrics: () => ({ label: "metrics.fig", node: <Metrics /> }),
  "show-hn": () => ({ label: "show-hn.fig", node: <RankedList /> }),
  "star-history": () => ({ label: "star-history.fig", node: <StarHistory /> }),
  "llms-txt": () => ({
    label: "llms.txt",
    node: doc("llms.txt", [
      { text: "# Your devtool", accent: true },
      { text: "> What it does, in one line" },
      { text: "## Docs", accent: true },
      { text: "- [Quickstart](/docs/start)", indent: true },
      { text: "- [API reference](/docs/api)", indent: true },
      { bar: 260, indent: true },
    ]),
  }),
  tutorial: () => ({
    label: "tutorial.md",
    node: doc("tutorial.md", [
      { text: "# Build a job queue", accent: true },
      { text: "Step 1: Start the worker", accent: true },
      { text: "You should see: Worker ready", indent: true },
      { text: "Step 2: Submit a job", accent: true },
      { text: "You should see: Job done", indent: true },
      { bar: 260, accent: true },
    ]),
  }),
  "docs-index": () => ({
    label: "docs/index.md",
    node: doc("docs/index.md", [
      { text: "# Docs", accent: true },
      { text: "Tutorials: learn by doing", indent: true },
      { text: "How-to guides: finish a task", indent: true },
      { text: "Reference: look it up", indent: true },
      { text: "Explanation: understand why", indent: true },
      { bar: 300, accent: true },
    ]),
  }),
  quickstart: () => ({
    label: "quickstart.md",
    node: doc("docs/quickstart.md", [
      { text: "# Quickstart", accent: true },
      { bar: 420 },
      { bar: 340 },
      { text: "Cited by AI answers", accent: true },
      { bar: 380, accent: true },
      { bar: 260 },
    ]),
  }),
  answer: () => ({ label: "answer.fig", node: <Answer /> }),
  scorecard: () => ({ label: "audit.fig", node: <Scorecard /> }),
  funnel: (post) =>
    /devrel/i.test(post.title)
      ? { label: "devrel-roi.fig", node: <Funnel caption="DEVREL ROI" labels={["Reach", "Engaged", "Activated", "Revenue"]} /> }
      : { label: "funnel.fig", node: <Funnel /> },
  "dx-audit": () => ({
    label: "dx-audit.fig",
    node: (
      <Checklist
        caption="DX AUDIT"
        tag="3 findings"
        items={[
          ["First result in minutes", false],
          ["Quickstart up to date", true],
          ["Errors say what to do", false],
          ["Access in a few steps", true],
          ["Docs AI can cite", false],
        ]}
      />
    ),
  }),
  "creator-fit": () => ({ label: "creator-fit.fig", node: <Versus left="Reach" right="Fit" /> }),
  "creator-post": () => ({ label: "creator-post.fig", node: <Creator /> }),
  pricing: () => ({ label: "pricing.fig", node: <Pricing /> }),
  checklist: () => ({ label: "checklist.fig", node: <Checklist /> }),
  community: () => ({ label: "community.fig", node: <Network />, scale: 1.05 }),
  projects: () => ({ label: "projects.fig", node: <Tiles /> }),
  calendar: () => ({ label: "calendar.fig", node: <Calendar /> }),
  alternatives: () => ({ label: "alternatives.fig", node: <Versus left="Incumbent" right="Your tool" /> }),
  "cross-post": () => ({ label: "cross-post.fig", node: <CrossPost /> }),
  content: () => ({ label: "content.fig", node: <Pages />, scale: 1.05 }),
  "demo-script": () => ({
    label: "demo-script.md",
    node: doc("demo-script.md", [
      { text: "0:00  The problem, in one line", accent: true },
      { bar: 380 },
      { text: "0:20  Install and first call", accent: true },
      { bar: 320 },
      { text: "1:30  The real result", accent: true },
      { bar: 260, accent: true },
    ]),
  }),
  video: () => ({ label: "demo.fig", node: <Player file="demo.mp4" chapters={["Install", "First call", "Deploy"]} /> }),
  youtube: () => ({ label: "channel.fig", node: <Player file="youtube / tutorial" chapters={["Intro", "Build", "Ship"]} /> }),
  "what-is": (post) => {
    const name = titleLead(post.title).replace(/^what is\s+/i, "").replace(/\?.*$/, "") || "your-tool";
    return { label: "terminal", node: <Terminal command={`${name.toLowerCase()} --explain`} /> };
  },
  build: () => ({ label: "terminal", node: <Terminal command="pnpm install && pnpm dev" result="→ running locally" /> }),
  "hello-world": () => ({ label: "terminal", node: <Terminal command="npx create-your-app" result="→ Hello, world!" /> }),
  devrel: () => ({ label: "devrel.fig", node: <Network />, scale: 1.05 }),
  "launch-post": () => ({ label: "launch-post.fig", node: <LaunchPost />, scale: 1.15 }),
  "launch-plan": () => ({ label: "launch-plan.fig", node: <LaunchPlan /> }),
  mark: () => ({ label: "studio1-mark", node: <PrintMark /> }),
};

/** What a cover needs from a post. Dashboard drafts pass the same shape. */
export type CoverPost = { title: string; tags: readonly string[]; coverArt?: string | null };

function artFor(post: CoverPost): Art {
  return ART[coverArtFor(post)](post);
}

/* ------------------------------------------------------------------ */
/* Composition                                                          */
/* ------------------------------------------------------------------ */

/** Design-tool selection frame around the illustration, with its layer label. */
export function Frame({ label, children }: { label: string; children: ReactNode }) {
  const handle: CSSProperties = { position: "absolute", width: 16, height: 16, background: "#fff", border: `2px solid ${INK}` };
  return (
    <div style={flex({ position: "relative", padding: 18, border: `2px solid ${INK}` })}>
      <div style={{ ...handle, left: -9, top: -9 }} />
      <div style={{ ...handle, right: -9, top: -9 }} />
      <div style={{ ...handle, left: -9, bottom: -9 }} />
      <div style={{ ...handle, right: -9, bottom: -9 }} />
      <div
        style={flex({
          position: "absolute",
          left: -2,
          top: -42,
          padding: "7px 11px",
          background: INK,
          color: CREAM,
          fontSize: 18,
          fontWeight: 500,
        })}
      >
        {label}
      </div>
      {children}
      <div style={flex({ position: "absolute", right: -40, bottom: -46 })}>
        <svg width="50" height="50" viewBox="0 0 24 24">
          <path d="M3.5 2.5 21 10.2l-7.6 2.3-3.3 7.8z" fill={INK} stroke="#fff" strokeWidth="1.2" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Flat orange panel with the horizon line and the framed illustration.
 * `zoom` shrinks the whole composition for smaller canvases (Open Graph cards),
 * so a cover and its share card are the same picture at two sizes.
 */
export function Panel({
  art,
  width,
  height = BLOG_COVER_SIZE.height,
  scale = 1,
  zoom = 1,
}: {
  art: Art;
  width: number;
  height?: number;
  scale?: number;
  zoom?: number;
}) {
  return (
    // No overflow clip here: next/og drops SVGs (icons, charts, the cursor) inside
    // the scaled frame when an ancestor clips. The canvas edge clips anyway.
    <div style={flex({ position: "relative", width, height: "100%", alignItems: "center", justifyContent: "center", ...PANEL })}>
      {/* Horizon: a thin white arc rising from the bottom edge, as on the
          homepage contact banner */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <ellipse
          cx={width / 2}
          cy={height + 420 * zoom}
          rx={Math.max(width * 0.72, 620 * zoom)}
          ry={680 * zoom}
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.4"
          strokeWidth="2"
        />
      </svg>
      <div style={flex({ transform: `scale(${(art.scale ?? scale) * zoom})` })}>
        <Frame label={art.label}>{art.node}</Frame>
      </div>
    </div>
  );
}

let fonts: ReturnType<typeof readFonts> | undefined;

async function readFonts() {
  const fontsDir = path.join(process.cwd(), "app/fonts");
  const [regular, medium] = await Promise.all([
    readFile(path.join(fontsDir, "Studio1Sans-Regular.ttf")),
    readFile(path.join(fontsDir, "Studio1Sans-Medium.ttf")),
  ]);
  return [
    { name: "Studio1 Sans", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Studio1 Sans", data: medium, weight: 500 as const, style: "normal" as const },
  ];
}

/** Studio1 Sans for next/og, read from disk once per server instance. */
export function loadFonts() {
  fonts ??= readFonts();
  return fonts;
}

export function getCoverPost(slug: string) {
  return getAllPosts().find((post) => post.slug === slug) ?? null;
}

export function coverStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

/**
 * A post's cover: its illustration on the orange print panel, no title (the
 * page shows it). At OG_SIZE it is the post's share card: the same picture,
 * zoomed to the 1.91:1 canvas social networks expect.
 */
export async function renderCover(post: CoverPost, size: { width: number; height: number } = BLOG_COVER_SIZE) {
  return new ImageResponse(
    (
      <div style={flex({ width: "100%", height: "100%", fontFamily: "Studio1 Sans", color: INK })}>
        <Panel
          art={artFor(post)}
          width={size.width}
          height={size.height}
          scale={1.4}
          zoom={size.height / BLOG_COVER_SIZE.height}
        />
      </div>
    ),
    { ...size, fonts: await loadFonts() },
  );
}
