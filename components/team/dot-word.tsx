"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Distance between dot centres, in CSS pixels. */
const PITCH = 5;
/** How far around the cursor the dots react, in CSS pixels. */
const RADIUS = 90;
/** Largest push away from the cursor, in CSS pixels. */
const PUSH = 26;

type Dot = {
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** When the dot appears in the intro, in ms. */
  at: number;
};

/**
 * A word set in fine dots across the full width of its container. The text is
 * drawn once on a hidden canvas in the page font and sampled on a grid. Dots
 * near the cursor move away and spring back when it leaves.
 */
export function DotWord({
  text,
  color = "#f97316",
  className,
}: {
  text: string;
  color?: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let dotR = 1.6;
    let raf = 0;
    let start = 0;
    const mouse = { x: -9999, y: -9999, inside: false };

    /** Sample the word into dots that fill the container's width. */
    const layout = () => {
      const family =
        getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
      const probe = document.createElement("canvas").getContext("2d", {
        willReadFrequently: true,
      });
      if (!probe) return;
      const size = 400;
      const tracking = -size * 0.035;
      probe.font = `500 ${size}px ${family}`;
      const metrics = probe.measureText(text);
      const ascent = metrics.actualBoundingBoxAscent;
      const pad = size * 0.2;

      // Draw with room to spare, then crop to the ink so the word sits flush
      // with the container's edges
      const off = probe.canvas;
      off.width = Math.ceil(metrics.width + pad * 2);
      off.height = Math.ceil(size * 1.4);
      probe.font = `500 ${size}px ${family}`;
      if ("letterSpacing" in probe) {
        (
          probe as CanvasRenderingContext2D & { letterSpacing: string }
        ).letterSpacing = `${tracking}px`;
      }
      probe.fillStyle = "#000";
      probe.textBaseline = "alphabetic";
      probe.fillText(text, pad, ascent + pad);
      const raw = probe.getImageData(0, 0, off.width, off.height).data;
      let minX = off.width;
      let maxX = 0;
      let minY = off.height;
      let maxY = 0;
      for (let y = 0; y < off.height; y++) {
        for (let x = 0; x < off.width; x++) {
          if (raw[(y * off.width + x) * 4 + 3] > 140) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX <= minX) return;
      const inkW = maxX - minX + 1;
      const inkH = maxY - minY + 1;
      const alphaAt = (x: number, y: number) =>
        raw[((y + minY) * off.width + (x + minX)) * 4 + 3];

      width = wrap.clientWidth;
      const scale = width / inkW;
      height = Math.ceil(inkH * scale);
      // Keep the dots fine on small screens too
      const pitch = width < 640 ? 3.5 : PITCH;
      dotR = pitch * 0.34;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const next: Dot[] = [];
      for (let y = pitch / 2; y < height; y += pitch) {
        for (let x = pitch / 2; x < width; x += pitch) {
          const sx = Math.min(inkW - 1, Math.floor(x / scale));
          const sy = Math.min(inkH - 1, Math.floor(y / scale));
          if (alphaAt(sx, sy) > 140) {
            next.push({
              hx: x,
              hy: y,
              x,
              y,
              vx: 0,
              vy: 0,
              at: (x / width) * 900 + ((y / pitch) % 4) * 25,
            });
          }
        }
      }
      dots = next;
    };

    const draw = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      let moving = false;
      ctx.beginPath();
      for (const d of dots) {
        if (!reduceMotion && mouse.inside) {
          const dx = d.hx - mouse.x;
          const dy = d.hy - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < RADIUS && dist > 0.01) {
            const f = (1 - dist / RADIUS) ** 2 * PUSH;
            d.vx += (d.hx + (dx / dist) * f - d.x) * 0.16;
            d.vy += (d.hy + (dy / dist) * f - d.y) * 0.16;
          }
        }
        // Spring home, with damping
        d.vx += (d.hx - d.x) * 0.06;
        d.vy += (d.hy - d.y) * 0.06;
        d.vx *= 0.78;
        d.vy *= 0.78;
        d.x += d.vx;
        d.y += d.vy;
        if (Math.abs(d.vx) + Math.abs(d.vy) > 0.02) moving = true;

        const shown = reduceMotion
          ? 1
          : Math.min(1, Math.max(0, (t - d.at) / 300));
        if (shown <= 0) {
          moving = true;
          continue;
        }
        if (shown < 1) moving = true;
        const r = dotR * shown;
        ctx.moveTo(d.x + r, d.y);
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      }
      ctx.fill();
      raf = moving || mouse.inside ? requestAnimationFrame(draw) : 0;
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.inside =
        mouse.x > -RADIUS &&
        mouse.y > -RADIUS &&
        mouse.x < rect.width + RADIUS &&
        mouse.y < rect.height + RADIUS;
      if (mouse.inside) kick();
    };
    const onLeave = () => {
      mouse.inside = false;
      kick();
    };

    let ro: ResizeObserver | undefined;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      layout();
      start = performance.now();
      kick();
      let lastW = wrap.clientWidth;
      ro = new ResizeObserver(() => {
        if (wrap.clientWidth === lastW) return;
        lastW = wrap.clientWidth;
        layout();
        start = performance.now() - 2000;
        kick();
      });
      ro.observe(wrap);
    });

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [text, color, reduceMotion]);

  return (
    <div ref={wrapRef} className={cn("w-full", className)}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={text}
        className="block w-full"
      />
    </div>
  );
}
