import type { CoverPattern, CoverTone } from "@/data/hackathons";
import { GRAIN, INK, NIGHT, PAPER, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

/**
 * Printed poster used as a hackathon's banner until it has real artwork:
 * one of three paper tones, a pattern seeded by the slug, and the name set
 * large in the bottom corner.
 */

const TONES: Record<
  CoverTone,
  { bg: string; fg: string; line: string; accent: string; grain: string }
> = {
  print: {
    bg: PRINT,
    fg: "#ffffff",
    line: "rgba(255,255,255,0.34)",
    accent: INK,
    grain: "opacity-[0.14] mix-blend-multiply",
  },
  night: {
    bg: NIGHT,
    fg: PAPER,
    line: "rgba(244,239,231,0.16)",
    accent: PRINT,
    grain: "opacity-[0.18] mix-blend-screen",
  },
  paper: {
    bg: "#e8dfd0",
    fg: INK,
    line: "rgba(20,20,20,0.16)",
    accent: PRINT,
    grain: "opacity-[0.14] mix-blend-multiply",
  },
};

/** FNV-1a, so a slug always draws the same pattern. */
function hash(text: string) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** Small seeded PRNG (mulberry32). */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 400;
const H = 250;

function Pattern({
  pattern,
  seed,
  line,
  accent,
}: {
  pattern: CoverPattern;
  seed: number;
  line: string;
  accent: string;
}) {
  const next = random(seed);

  if (pattern === "grid") {
    const step = 25;
    const cells = Array.from({ length: 6 }, () => ({
      x: (8 + Math.floor(next() * 8)) * step,
      y: Math.floor(next() * 6) * step,
    }));
    return (
      <>
        {Array.from({ length: W / step + 1 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={i * step}
            x2={i * step}
            y1={0}
            y2={H}
            stroke={line}
          />
        ))}
        {Array.from({ length: H / step + 1 }, (_, i) => (
          <line
            key={`h${i}`}
            y1={i * step}
            y2={i * step}
            x1={0}
            x2={W}
            stroke={line}
          />
        ))}
        {cells.map((cell, i) => (
          <rect
            key={i}
            x={cell.x}
            y={cell.y}
            width={step}
            height={step}
            fill={accent}
          />
        ))}
      </>
    );
  }

  if (pattern === "rings") {
    const cx = 300 + next() * 60;
    const cy = 40 + next() * 60;
    const highlight = 3 + Math.floor(next() * 4);
    return (
      <>
        {Array.from({ length: 16 }, (_, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={(i + 1) * 22}
            fill="none"
            stroke={i === highlight ? accent : line}
            strokeWidth={i === highlight ? 3 : 1}
          />
        ))}
        <circle cx={cx} cy={cy} r={9} fill={accent} />
      </>
    );
  }

  if (pattern === "dots") {
    const step = 16;
    const big = { x: 270 + next() * 60, y: 105 + next() * 30 };
    return (
      <>
        {Array.from({ length: Math.floor(W / step) }, (_, col) =>
          Array.from({ length: Math.floor(H / step) }, (_, row) => (
            <circle
              key={`${col}-${row}`}
              cx={col * step + step / 2}
              cy={row * step + step / 2}
              r={1.6}
              fill={line}
              // Denser toward the top right, where the copy isn't
              opacity={Math.min(1, (col / (W / step)) * 1.6 * (1 - row / 22))}
            />
          )),
        )}
        <circle cx={big.x} cy={big.y} r={44} fill={accent} />
      </>
    );
  }

  // bars: an equaliser rising from the bottom right
  const count = 26;
  const width = 6;
  const gap = 3.5;
  const start = W - count * (width + gap);
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const height = 24 + next() * 170 * (0.35 + (i / count) * 0.65);
        return (
          <rect
            key={i}
            x={start + i * (width + gap)}
            y={H - height}
            width={width}
            height={height}
            fill={next() > 0.82 ? accent : line}
          />
        );
      })}
    </>
  );
}

export function HackathonCover({
  slug,
  name,
  tone,
  pattern,
  topLeft = "Studio1 Hackathons",
  topRight,
  bottom,
  size = "card",
  className,
}: {
  slug: string;
  name: string;
  tone: CoverTone;
  pattern: CoverPattern;
  topLeft?: string;
  topRight?: string;
  bottom?: string;
  size?: "card" | "poster";
  className?: string;
}) {
  const theme = TONES[tone];
  return (
    <div
      className={cn(
        "relative isolate aspect-[16/10] w-full overflow-hidden",
        className,
      )}
      style={{ background: theme.bg, color: theme.fg }}
    >
      <svg
        aria-hidden
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 -z-10 size-full"
      >
        <Pattern
          pattern={pattern}
          seed={hash(slug)}
          line={theme.line}
          accent={theme.accent}
        />
      </svg>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10",
          theme.grain,
        )}
        style={{ backgroundImage: GRAIN }}
      />
      <div
        className={cn(
          "flex h-full flex-col justify-between",
          size === "poster" ? "p-6 sm:p-7" : "p-4 sm:p-5",
        )}
      >
        <div className="flex items-center justify-between gap-4 text-[10px] font-medium uppercase tracking-[0.16em] opacity-80">
          <span>{topLeft}</span>
          {topRight ? <span>{topRight}</span> : null}
        </div>
        <div className="max-w-[78%]">
          <p
            aria-hidden
            className={cn(
              "font-medium leading-[0.92] tracking-[-0.055em]",
              size === "poster"
                ? "text-[40px] sm:text-[52px]"
                : "text-[28px] sm:text-[32px]",
            )}
          >
            {name}
          </p>
          {bottom ? (
            <p className="mt-2 text-[11px] font-medium opacity-80">{bottom}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
