import type { CSSProperties, ReactNode } from "react";
import { ImageResponse } from "next/og";
import { Mark, Panel, PrintMark, loadFonts, type Art } from "@/app/blog-cover/cover";
import { OG_SIZE } from "@/lib/og";
import { INK, PAPER, PRINT } from "@/lib/paper";

/*
 * Share cards in the paper design: copy on the paper sheet at left (Studio1
 * mark, section, headline, call to action), the orange print panel at right
 * with a framed illustration, as on the blog covers.
 */

const MUTED = "rgba(20,20,20,0.6)";
const PANEL_WIDTH = 440;

const flex = (style: CSSProperties = {}): CSSProperties => ({ display: "flex", ...style });

/** Long titles step down so every card fits three lines. */
function titleSize(title: string) {
  if (title.length <= 24) return 68;
  if (title.length <= 40) return 60;
  if (title.length <= 60) return 52;
  if (title.length <= 75) return 46;
  return 42;
}

function CallToAction({ label }: { label: string }) {
  return (
    <div style={flex({ alignItems: "center", gap: 22 })}>
      <div
        style={flex({
          alignItems: "center",
          gap: 16,
          height: 64,
          padding: "0 8px 0 30px",
          borderRadius: 999,
          background: INK,
          color: PAPER,
          fontSize: 24,
          fontWeight: 500,
        })}
      >
        {label}
        <div
          style={flex({
            width: 48,
            height: 48,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            background: PRINT,
          })}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M7 17 17 7M8 7h9v9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <div style={flex({ fontSize: 22, color: MUTED })}>studio1hq.com</div>
    </div>
  );
}

function Card({ art, children }: { art: Art; children: ReactNode }) {
  return (
    <div style={flex({ width: "100%", height: "100%", fontFamily: "Studio1 Sans", color: INK, background: PAPER })}>
      <div
        style={flex({
          flex: 1,
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 56px 60px 64px",
        })}
      >
        <div style={flex({ alignItems: "center", gap: 14 })}>
          <Mark size={44} color={PRINT} />
          <div style={flex({ fontSize: 32, fontWeight: 500, letterSpacing: "-0.03em" })}>Studio1</div>
        </div>
        {children}
      </div>
      <Panel art={art} width={PANEL_WIDTH} height={OG_SIZE.height} zoom={0.84} />
    </div>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <div style={flex({ alignItems: "center", gap: 14, fontSize: 24, color: MUTED })}>
      <div style={flex({ width: 14, height: 14, background: PRINT })} />
      {children}
    </div>
  );
}

const MARK_ART: Art = { label: "studio1-mark", node: <PrintMark /> };

/** Numbers from the homepage About section. */
const HOME_STATS: [string, string][] = [
  ["35", "Devtool and AI teams"],
  ["3M", "Content views"],
  ["40", "Developer events"],
];

const HOME_ART: Art = {
  label: "results.fig",
  node: (
    <div
      style={flex({
        flexDirection: "column",
        width: 400,
        padding: "28px 34px 12px",
        background: "#fff",
        boxShadow: "0 30px 60px -30px rgba(20,20,20,0.35)",
      })}
    >
      <div style={flex({ fontSize: 17, fontWeight: 500, letterSpacing: "0.12em", color: MUTED })}>TRUSTED BY TEAMS</div>
      {HOME_STATS.map(([value, label], index) => (
        <div
          key={label}
          style={flex({
            flexDirection: "column",
            padding: "16px 0",
            borderBottom: index < HOME_STATS.length - 1 ? "1px solid rgba(20,20,20,0.12)" : "none",
          })}
        >
          <div style={flex({ fontSize: 56, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.04em" })}>
            {value}
            <span style={{ color: PRINT }}>+</span>
          </div>
          <div style={flex({ marginTop: 8, fontSize: 22, color: MUTED })}>{label}</div>
        </div>
      ))}
    </div>
  ),
};

const headers = {
  // URLs carry a version and the title, so a changed card is a new URL.
  "Cache-Control": "public, max-age=31536000, immutable",
};

/** The homepage card: the hero line, what Studio1 does, and the call to book. */
export async function renderHomeCard() {
  return new ImageResponse(
    (
      <Card art={HOME_ART}>
        <div style={flex({ flexDirection: "column" })}>
          {/* The hero's own line breaks, DevRel in print orange */}
          <div
            style={flex({
              flexDirection: "column",
              fontSize: 58,
              fontWeight: 500,
              lineHeight: 1.08,
              letterSpacing: "-0.045em",
            })}
          >
            <div style={flex({})}>{"Developer Marketing &"}</div>
            <div style={flex({})}>
              <span style={{ color: PRINT, marginRight: 16 }}>DevRel</span>
              <span>Agency</span>
            </div>
            <div style={flex({})}>for Devtools</div>
          </div>
          <div style={flex({ marginTop: 20, fontSize: 24, lineHeight: 1.4, color: MUTED })}>
            Technical content, docs, video, launches and GitHub growth for devtool and AI teams.
          </div>
        </div>
        <CallToAction label="Book a strategy call" />
      </Card>
    ),
    { ...OG_SIZE, fonts: await loadFonts(), headers },
  );
}

/** Any other page: its section, its title, and the next step. */
export async function renderPageCard({ kicker, title, cta }: { kicker: string; title: string; cta: string }) {
  return new ImageResponse(
    (
      <Card art={MARK_ART}>
        <div style={flex({ flexDirection: "column", gap: 22 })}>
          <Kicker>{kicker}</Kicker>
          <div
            style={flex({
              fontSize: titleSize(title),
              fontWeight: 500,
              lineHeight: 1.08,
              letterSpacing: "-0.045em",
            })}
          >
            {title}
          </div>
        </div>
        <CallToAction label={cta} />
      </Card>
    ),
    { ...OG_SIZE, fonts: await loadFonts(), headers },
  );
}

/** Email headers: a slim strip across the top of a 600px email. */
export const EMAIL_BANNER_SIZE = { width: 1200, height: 240 };

/** Headlines end in print orange, like the site's titles ("Growth Lead."). */
function OrangeEnd({ text }: { text: string }) {
  const last = text.slice(-1);
  return /[.?!]/.test(last) ? (
    <>
      {text.slice(0, -1)}
      <span style={{ color: PRINT }}>{last}</span>
    </>
  ) : (
    <>{text}</>
  );
}

/**
 * The slim paper strip at the top of every email (lib/internal/email-banners.ts):
 * the Studio1 mark, kicker and headline on the paper, and a narrow orange
 * print panel with the framed mark.
 */
export async function renderEmailBanner({ kicker, title, label }: { kicker: string; title: string; label: string }) {
  const size = title.length <= 22 ? 54 : title.length <= 28 ? 48 : 42;
  return new ImageResponse(
    (
      <div
        style={flex({
          width: "100%",
          height: "100%",
          fontFamily: "Studio1 Sans",
          color: INK,
          background: PAPER,
        })}
      >
        <div style={flex({ flex: 1, alignItems: "center", gap: 30, padding: "0 48px 0 52px" })}>
          <Mark size={64} color={PRINT} />
          <div style={flex({ flexDirection: "column", gap: 10 })}>
            <div style={flex({ alignItems: "center", gap: 12, fontSize: 22, color: MUTED })}>
              <div style={flex({ width: 12, height: 12, background: PRINT })} />
              {kicker}
            </div>
            <div
              style={flex({
                fontSize: size,
                fontWeight: 500,
                lineHeight: 1.05,
                letterSpacing: "-0.04em",
              })}
            >
              <span>
                <OrangeEnd text={title} />
              </span>
            </div>
          </div>
        </div>
        <Panel
          art={{ label, node: <PrintMark /> }}
          width={260}
          height={EMAIL_BANNER_SIZE.height}
          zoom={0.36}
        />
      </div>
    ),
    { ...EMAIL_BANNER_SIZE, fonts: await loadFonts(), headers },
  );
}
