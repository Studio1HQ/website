"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** How far around the cursor the dots react, in CSS pixels. */
const RADIUS = 110;
/** Largest push away from the cursor, in CSS pixels. */
const PUSH = 30;

type Dot = { hx: number; hy: number; x: number; y: number; vx: number; vy: number; at: number; c: string };

/**
 * An image redrawn as coloured dots on a fine grid, full width of its box.
 * Dots appear left to right, like the figures walking in, and move away
 * from the cursor before springing back.
 */
export function DotArt({ src, alt, className }: { src: string; alt: string; className?: string }) {
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
    let dotR = 2;
    let raf = 0;
    let start = 0;
    let cancelled = false;
    const mouse = { x: -9999, y: -9999, inside: false };
    const img = new Image();

    const layout = () => {
      if (!img.naturalWidth) return;
      const probe = document.createElement("canvas");
      probe.width = img.naturalWidth;
      probe.height = img.naturalHeight;
      const pctx = probe.getContext("2d", { willReadFrequently: true });
      if (!pctx) return;
      pctx.drawImage(img, 0, 0);
      const raw = pctx.getImageData(0, 0, probe.width, probe.height).data;

      width = wrap.clientWidth;
      const scale = width / probe.width;
      height = Math.round(probe.height * scale);
      const pitch = width < 640 ? 4 : width < 1024 ? 5 : 6;
      dotR = pitch * 0.4;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const next: Dot[] = [];
      for (let y = pitch / 2; y < height; y += pitch) {
        for (let x = pitch / 2; x < width; x += pitch) {
          const sx = Math.min(probe.width - 1, Math.floor(x / scale));
          const sy = Math.min(probe.height - 1, Math.floor(y / scale));
          const i = (sy * probe.width + sx) * 4;
          if (raw[i + 3] < 160) continue;
          next.push({
            hx: x,
            hy: y,
            x,
            y,
            vx: 0,
            vy: 0,
            at: (x / width) * 1100 + ((y / pitch) % 5) * 20,
            c: `rgb(${raw[i]},${raw[i + 1]},${raw[i + 2]})`,
          });
        }
      }
      // Group by colour so each colour is one fill
      next.sort((a, b) => (a.c < b.c ? -1 : a.c > b.c ? 1 : 0));
      dots = next;
    };

    const draw = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, width, height);
      let moving = false;
      let colour = "";
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
        d.vx += (d.hx - d.x) * 0.06;
        d.vy += (d.hy - d.y) * 0.06;
        d.vx *= 0.78;
        d.vy *= 0.78;
        d.x += d.vx;
        d.y += d.vy;
        if (Math.abs(d.vx) + Math.abs(d.vy) > 0.02) moving = true;

        const shown = reduceMotion ? 1 : Math.min(1, Math.max(0, (t - d.at) / 360));
        if (shown < 1) moving = true;
        if (shown <= 0) continue;
        if (d.c !== colour) {
          if (colour) ctx.fill();
          ctx.beginPath();
          ctx.fillStyle = d.c;
          colour = d.c;
        }
        const r = dotR * shown;
        ctx.moveTo(d.x + r, d.y);
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      }
      if (colour) ctx.fill();
      raf = moving || mouse.inside ? requestAnimationFrame(draw) : 0;
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.inside = mouse.x > -RADIUS && mouse.y > -RADIUS && mouse.x < rect.width + RADIUS && mouse.y < rect.height + RADIUS;
      if (mouse.inside) kick();
    };
    const onLeave = () => {
      mouse.inside = false;
      kick();
    };

    img.onload = () => {
      if (cancelled) return;
      layout();
      start = performance.now();
      kick();
    };
    img.src = src;

    let lastW = wrap.clientWidth;
    const ro = new ResizeObserver(() => {
      if (wrap.clientWidth === lastW) return;
      lastW = wrap.clientWidth;
      layout();
      start = performance.now() - 5000;
      kick();
    });
    ro.observe(wrap);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [src, reduceMotion]);

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <canvas ref={canvasRef} role="img" aria-label={alt} className="block w-full" style={{ aspectRatio: "1200 / 403" }} />
    </div>
  );
}
