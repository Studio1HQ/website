"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Size of each moving block, in CSS pixels. */
const TILE = 4;
/** How far around the cursor the pixels react. */
const RADIUS = 70;
/** Largest push, in CSS pixels. */
const PUSH = 4;

/** Stable 0-1 noise per tile, so each block scatters a little differently. */
function noise(i: number, j: number) {
  const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * The dithered portrait, cut into small blocks on a canvas. At rest it is the
 * exact image; on hover the blocks around the cursor push away and jitter,
 * like the pixels are shifting, then settle back when the pointer leaves.
 */
export function PixelPortrait({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const state = useRef({
    img: null as HTMLImageElement | null,
    mx: -9999,
    my: -9999,
    px: -9999,
    py: -9999,
    strength: 0,
    target: 0,
    raf: 0,
    w: 0,
    h: 0,
  });

  useEffect(() => {
    if (reduceMotion) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = state.current;

    const draw = () => {
      const { img, w, h } = s;
      if (!img) return;
      ctx.clearRect(0, 0, w, h);
      const sx = img.naturalWidth / w;
      const sy = img.naturalHeight / h;
      const cols = Math.ceil(w / TILE);
      const rows = Math.ceil(h / TILE);
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const x = i * TILE;
          const y = j * TILE;
          let dx = 0;
          let dy = 0;
          if (s.strength > 0.001) {
            const cx = x + TILE / 2 - s.px;
            const cy = y + TILE / 2 - s.py;
            const d = Math.hypot(cx, cy);
            if (d < RADIUS) {
              const f = (1 - d / RADIUS) ** 2 * s.strength;
              const n = noise(i, j);
              const push = PUSH * f * (0.7 + n * 0.6);
              const k = d > 0.001 ? push / d : 0;
              dx = Math.round(cx * k + (n - 0.5) * 1.2 * f);
              dy = Math.round(cy * k + (noise(j, i) - 0.5) * 1.2 * f);
            }
          }
          ctx.drawImage(
            img,
            x * sx,
            y * sy,
            TILE * sx,
            TILE * sy,
            x + dx,
            y + dy,
            TILE,
            TILE,
          );
        }
      }
    };

    const tick = () => {
      // Ease toward the cursor and the target strength, so it glides.
      s.strength += (s.target - s.strength) * 0.045;
      s.px += (s.mx - s.px) * 0.09;
      s.py += (s.my - s.py) * 0.09;
      draw();
      if (s.target === 0 && s.strength < 0.002) {
        s.strength = 0;
        draw();
        s.raf = 0;
        return;
      }
      s.raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!s.raf) s.raf = requestAnimationFrame(tick);
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.w = rect.width;
      s.h = rect.height;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      draw();
    };

    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      s.img = img;
      resize();
      setReady(true);
    };

    const move = (event: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      s.mx = event.clientX - rect.left;
      s.my = event.clientY - rect.top;
      if (s.target === 0 && s.strength < 0.01) {
        s.px = s.mx;
        s.py = s.my;
      }
      s.target = 1;
      start();
    };
    const leave = () => {
      s.target = 0;
      start();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    wrap.addEventListener("pointermove", move);
    wrap.addEventListener("pointerleave", leave);
    return () => {
      observer.disconnect();
      wrap.removeEventListener("pointermove", move);
      wrap.removeEventListener("pointerleave", leave);
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, [src, reduceMotion]);

  return (
    <div ref={wrapRef} className={cn("absolute inset-0", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        sizes="(max-width: 768px) 50vw, 300px"
        className={cn("object-cover object-top", ready && "opacity-0")}
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(
          "absolute inset-0 size-full",
          ready ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
