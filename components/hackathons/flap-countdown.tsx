"use client";

import { Fragment, useEffect, useState } from "react";
import {
  FLAP_KEYFRAMES,
  FlapTile,
  type FlapTone,
} from "@/components/hackathons/flap";
import { GRAIN, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;

/**
 * Ticks once a second toward `target`. Starts from the server's time so the
 * first client render matches the HTML, then follows the browser clock.
 */
export function useCountdown(target: number, serverNow: number, active = true) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  const left = Math.max(0, target - now);
  const units: [value: string, unit: string][] = [
    [String(Math.floor(left / DAY)).padStart(2, "0"), "Days"],
    [String(Math.floor(left / 3_600_000) % 24).padStart(2, "0"), "Hours"],
    [String(Math.floor(left / 60_000) % 60).padStart(2, "0"), "Min"],
    [String(Math.floor(left / 1000) % 60).padStart(2, "0"), "Sec"],
  ];
  return { now, units };
}

/**
 * Days : hours : minutes : seconds on flap tiles, sized by `--cw` on an
 * ancestor. Render FLAP_KEYFRAMES once somewhere above it.
 */
export function FlapClock({
  units,
  label,
  tone = "default",
  unitClassName = "text-[#f4efe7]/40",
  dotClassName = "bg-[#f4efe7]/25",
  glass = false,
  className,
}: {
  units: [string, string][];
  /** Spoken prefix, e.g. "Submissions close in". */
  label: string;
  tone?: FlapTone;
  unitClassName?: string;
  dotClassName?: string;
  /** Light tiles, for a glass surface. */
  glass?: boolean;
  className?: string;
}) {
  return (
    <div
      role="timer"
      aria-label={`${label} ${units.map(([value, unit]) => `${Number(value)} ${unit.toLowerCase()}`).join(", ")}`}
      className={cn("flex items-start gap-[calc(var(--cw)*0.28)]", className)}
    >
      {units.map(([value, unit], index) => (
        <Fragment key={unit}>
          {index > 0 ? (
            <span
              aria-hidden
              className="flex h-[calc(var(--cw)*1.5)] flex-col justify-center gap-[calc(var(--cw)*0.2)]"
            >
              <span
                className={cn(
                  "size-[calc(var(--cw)*0.1)] rounded-full",
                  dotClassName,
                )}
              />
              <span
                className={cn(
                  "size-[calc(var(--cw)*0.1)] rounded-full",
                  dotClassName,
                )}
              />
            </span>
          ) : null}
          <span aria-hidden className="flex flex-col items-center">
            <span className="flex gap-[2px]">
              {Array.from(value).map((char, i) => (
                <FlapTile
                  key={i}
                  char={char}
                  tone={tone}
                  glass={glass}
                  flipOnChange
                />
              ))}
            </span>
            <span
              className={cn(
                "mt-2.5 text-[10px] font-medium uppercase tracking-[0.18em]",
                unitClassName,
              )}
            >
              {unit}
            </span>
          </span>
        </Fragment>
      ))}
    </div>
  );
}

/**
 * The event page's hero clock: days, hours, minutes and seconds on
 * split-flap tiles that flip as they change, with the event's progress and
 * key facts underneath. Starts from the server's time so the first render
 * matches, then ticks every second in the browser.
 */
export function FlapCountdown({
  mode,
  target,
  start,
  end,
  serverNow,
  facts,
  endedNote,
}: {
  /** "starts": counting to kickoff; "ends": live, counting to the deadline. */
  mode: "starts" | "ends" | "ended";
  /** Epoch ms the clock counts down to. */
  target: number;
  /** Event window, epoch ms, for the progress bar. */
  start: number;
  end: number;
  serverNow: number;
  facts: [label: string, value: string][];
  /** Shown under the board once the event is over. */
  endedNote?: string;
}) {
  const { now, units } = useCountdown(target, serverNow, mode !== "ended");
  const totalDays = Math.max(1, Math.round((end - start) / DAY));
  const day = Math.min(totalDays, Math.floor((now - start) / DAY) + 1);
  const progress = Math.min(1, Math.max(0, (now - start) / (end - start)));

  const heading = {
    starts: "Kickoff in",
    ends: "Submissions close in",
    ended: "This event has ended",
  }[mode];
  const tone: FlapTone = mode === "ends" ? "live" : "default";

  return (
    <div className="relative isolate overflow-hidden rounded-[6px] bg-[#0d0d0d] p-5 text-[#f4efe7] shadow-[0_60px_100px_-50px_rgba(20,20,20,0.75)] ring-1 ring-inset ring-white/10 [--cw:28px] sm:p-7 sm:[--cw:44px] lg:[--cw:34px] xl:[--cw:46px]">
      <style>{FLAP_KEYFRAMES}</style>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.14] mix-blend-screen"
        style={{ backgroundImage: GRAIN }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-1/3 bg-gradient-to-b from-white/[0.05] to-transparent"
      />

      <p className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.18em]">
        <span
          className="relative flex size-2"
          style={{ opacity: mode === "ended" ? 0.35 : 1 }}
        >
          {mode === "ends" ? (
            <span
              className="absolute inset-0 animate-ping rounded-full opacity-70 motion-reduce:hidden"
              style={{ background: PRINT }}
            />
          ) : null}
          <span
            className="relative size-2 rounded-full"
            style={{ background: mode === "starts" ? "#f4efe7" : PRINT }}
          />
        </span>
        {heading}
      </p>

      {mode === "ended" ? (
        <div aria-hidden className="mt-6 flex gap-[2px]">
          {Array.from("DEPARTED").map((char, i) => (
            <FlapTile key={i} char={char} tone="muted" />
          ))}
        </div>
      ) : (
        <FlapClock units={units} label={heading} tone={tone} className="mt-6" />
      )}

      {mode === "ends" ? (
        <div className="mt-6">
          <div className="flex items-baseline justify-between text-[12px] font-medium text-[#f4efe7]/60">
            <span>
              Day {day} of {totalDays}
            </span>
            <span className="tabular-nums">{Math.round(progress * 100)}%</span>
          </div>
          <div
            className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Event progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${progress * 100}%`, background: PRINT }}
            />
          </div>
        </div>
      ) : null}

      {mode === "ended" && endedNote ? (
        <p className="mt-5 text-[14px] text-[#f4efe7]/60">{endedNote}</p>
      ) : null}

      <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
        {facts.map(([label, value]) => (
          <div
            key={label}
            className="flex min-w-0 flex-col-reverse justify-end"
          >
            <dd className="mt-1 text-[14px] font-medium leading-snug sm:text-[15px]">
              {value}
            </dd>
            <dt
              className={cn(
                "text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#f4efe7]/40",
              )}
            >
              {label}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
