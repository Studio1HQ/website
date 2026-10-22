"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const CELL = 5; // grid pitch (css px)
const SIZE = 2; // square size (css px)

// 4x4 Bayer matrix, normalised to 0..1: ordered-dither thresholds.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/**
 * Orange ordered-dither squares drifting in a slow wave, fading out toward
 * the left so they blend into the card. Only animates while on screen.
 */
export function DitherField({ className, seed = 0 }: { className?: string; seed?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let visible = false;
    let cols = 0;
    let rows = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / CELL);
      rows = Math.ceil(height / CELL);
    };

    const draw = (time: number) => {
      const t = time / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const u = x / Math.max(1, cols - 1); // 0 left .. 1 right
          const v = y / Math.max(1, rows - 1);
          // Slow travelling wave plus a gentle swell from the right edge.
          const wave =
            0.5 +
            0.5 * Math.sin(u * 5.2 - t * 0.9 + seed + Math.sin(v * 3.1 + t * 0.6) * 1.4);
          // Fade to nothing toward the left, and softly at the top and bottom.
          const edge = Math.pow(u, 2.2) * Math.sin(Math.PI * Math.min(1, Math.max(0, v))) ** 0.6;
          const value = wave * edge * (0.75 + 0.25 * Math.sin(t * 0.7 + v * 4 + seed));
          if (value > BAYER[(y % 4) * 4 + (x % 4)]) {
            ctx.globalAlpha = 0.12 + value * 0.3;
            ctx.fillStyle = value > 0.75 ? "#fdba74" : "#f97316";
            ctx.fillRect(x * CELL, y * CELL, SIZE, SIZE);
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (time: number) => {
      draw(time);
      if (visible && !reduceMotion) raf = requestAnimationFrame(loop);
    };

    resize();
    draw(seed * 1000);

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !reduceMotion) raf = requestAnimationFrame(loop);
    });
    observer.observe(canvas);
    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    resizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [reduceMotion, seed]);

  return <canvas ref={canvasRef} aria-hidden className={cn("pointer-events-none", className)} />;
}
