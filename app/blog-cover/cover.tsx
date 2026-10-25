import { readFile } from "fs/promises";
import path from "path";
import type { CSSProperties, ReactNode } from "react";
import { ImageResponse } from "next/og";
import { getAllPosts, type BlogPostMeta } from "@/lib/blog";
import { BLOG_COVER_SIZE } from "@/lib/blog-cover";
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

/** The orange print panel: the homepage contact banner's gradient. */
const PANEL: CSSProperties = {
  backgroundColor: "#fb8a1e",
  backgroundImage:
    "radial-gradient(circle at 0% 0%, #ff3a00 0%, rgba(255,58,0,0) 55%), radial-gradient(circle at 100% 0%, #ff3a00 0%, rgba(255,58,0,0) 55%), linear-gradient(180deg, #fb8a1e 0%, #f7a54a 40%, #eeb795 75%, #f2b38a 100%)",
};

const flex = (style: CSSProperties = {}): CSSProperties => ({ display: "flex", ...style });
const card = (style: CSSProperties = {}): CSSProperties =>
  flex({ flexDirection: "column", background: "#fff", boxShadow: "0 30px 60px -30px rgba(90,30,0,0.55)", ...style });

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

function Mark({ size, color }: { size: number; color: string }) {
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

function Funnel() {
  const stages: [string, number][] = [
    ["Pageviews", 400],
    ["Signups", 318],
    ["Activated", 250],
    ["Revenue", 190],
  ];
  return (
    <div style={card({ width: 560, padding: "30px 32px" })}>
      <Caption>BEYOND PAGEVIEWS</Caption>
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

function Checklist() {
  const items: [string, boolean][] = [
    ["Docs before launch", false],
    ["Quickstart that works", true],
    ["Clear pricing page", false],
    ["Real code examples", true],
    ["A feedback loop", false],
  ];
  return (
    <div style={card({ width: 540, padding: "30px 32px" })}>
      <div style={flex({ justifyContent: "space-between", alignItems: "center" })}>
        <Caption>LAUNCH CHECKLIST</Caption>
        <Tag>3 misses</Tag>
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
            boxShadow: "0 18px 30px -18px rgba(90,30,0,0.6)",
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
              boxShadow: "0 18px 30px -20px rgba(90,30,0,0.55)",
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

function Terminal({ name }: { name: string }) {
  const lines: { bar?: number; color?: string; text?: string; indent?: number }[] = [
    { text: `$ ${name.toLowerCase()} --explain`, color: CREAM },
    { bar: 360, color: "rgba(244,239,231,0.28)" },
    { bar: 280, color: PRINT, indent: 1 },
    { bar: 330, color: "rgba(244,239,231,0.28)", indent: 1 },
    { bar: 210, color: "rgba(244,239,231,0.28)", indent: 1 },
    { text: "→ decision ready", color: PRINT },
  ];
  return (
    <div style={flex({ flexDirection: "column", width: 560, background: INK, boxShadow: "0 30px 60px -30px rgba(60,20,0,0.7)" })}>
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

function PrintMark() {
  return (
    <div style={flex({ width: 380, height: 380, alignItems: "center", justifyContent: "center", background: CREAM })}>
      <Mark size={220} color={PRINT} />
    </div>
  );
}

type Art = { label: string; node: ReactNode };

/** Picks the illustration from what the post is about. */
function artFor(post: BlogPostMeta): Art {
  const title = post.title;
  const lead = title.split(":")[0].trim();
  if (/\bvs\b/i.test(lead)) {
    const [left, right] = lead.split(/\s+vs\.?\s+/i);
    return { label: "versus.fig", node: <Versus left={left} right={right} /> };
  }
  if (/\breview\b/i.test(lead)) {
    return { label: "benchmarks.fig", node: <Bench name={lead.replace(/\s+review$/i, "")} /> };
  }
  if (/llms\.txt/i.test(title)) {
    return {
      label: "llms.txt",
     
      node: (
        <Doc
          file="llms.txt"
          lines={[
            { text: "# Your devtool", accent: true },
            { text: "> What it does, in one line" },
            { text: "## Docs", accent: true },
            { text: "- [Quickstart](/docs/start)", indent: true },
            { text: "- [API reference](/docs/api)", indent: true },
            { bar: 260, indent: true },
          ]}
        />
      ),
    };
  }
  if (/\bdocs\b|documentation/i.test(title)) {
    return {
      label: "quickstart.md",
     
      node: (
        <Doc
          file="docs/quickstart.md"
          lines={[
            { text: "# Quickstart", accent: true },
            { bar: 420 },
            { bar: 340 },
            { text: "Cited by AI answers", accent: true },
            { bar: 380, accent: true },
            { bar: 260 },
          ]}
        />
      ),
    };
  }
  if (/chatgpt|perplexity/i.test(title)) return { label: "answer.fig", node: <Answer /> };
  if (/visibility/i.test(title)) return { label: "audit.fig", node: <Scorecard /> };
  if (/\broi\b/i.test(title)) return { label: "funnel.fig", node: <Funnel /> };
  if (/\bcosts?\b/i.test(title)) return { label: "pricing.fig", node: <Pricing /> };
  if (/mistake/i.test(title)) return { label: "checklist.fig", node: <Checklist /> };
  if (/communit/i.test(title)) return { label: "community.fig", node: <Network /> };
  if (/projects/i.test(title)) return { label: "projects.fig", node: <Tiles /> };
  if (/content/i.test(title)) return { label: "content.fig", node: <Pages /> };
  if (/^what is/i.test(title)) {
    const name = lead.replace(/^what is\s+/i, "").replace(/\?.*$/, "");
    return { label: "terminal", node: <Terminal name={name} /> };
  }
  return { label: "studio1-mark", node: <PrintMark /> };
}

/* ------------------------------------------------------------------ */
/* Composition                                                          */
/* ------------------------------------------------------------------ */

/** Design-tool selection frame around the illustration, with its layer label. */
function Frame({ label, children }: { label: string; children: ReactNode }) {
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

/** Orange panel with the horizon glow and the framed illustration. */
function Panel({ art, width, scale = 1 }: { art: Art; width: number; scale?: number }) {
  return (
    <div style={flex({ position: "relative", width, height: "100%", alignItems: "center", justifyContent: "center", overflow: "hidden", ...PANEL })}>
      {/* Horizon: a soft glowing arc rising from the bottom edge */}
      <svg
        width={width}
        height={BLOG_COVER_SIZE.height}
        viewBox={`0 0 ${width} ${BLOG_COVER_SIZE.height}`}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <defs>
          <radialGradient id="horizon" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fb8a1e" />
            <stop offset="55%" stopColor="#f9a53f" />
            <stop offset="92%" stopColor="#f6c78a" />
            <stop offset="97%" stopColor="#fff0d7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fff0d7" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse
          cx={width / 2}
          cy={BLOG_COVER_SIZE.height + 420}
          rx={Math.max(width * 0.72, 620)}
          ry={680}
          fill="url(#horizon)"
          opacity="0.9"
        />
      </svg>
      <div style={flex({ transform: `scale(${scale})` })}>
        <Frame label={art.label}>{art.node}</Frame>
      </div>
    </div>
  );
}

async function loadFonts() {
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

export function getCoverPost(slug: string) {
  return getAllPosts().find((post) => post.slug === slug) ?? null;
}

export function coverStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

/** A post's cover: its illustration on the orange print panel, no title (the page shows it). */
export async function renderCover(post: BlogPostMeta) {
  return new ImageResponse(
    (
      <div style={flex({ width: "100%", height: "100%", fontFamily: "Studio1 Sans", color: INK })}>
        <Panel art={artFor(post)} width={BLOG_COVER_SIZE.width} scale={1.4} />
      </div>
    ),
    { ...BLOG_COVER_SIZE, fonts: await loadFonts() },
  );
}
