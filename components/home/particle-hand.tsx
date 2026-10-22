"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "motion/react";

type Point = {
  tx: number; // target position (css px)
  ty: number;
  sx: number; // scattered start position
  sy: number;
  size: number; // start size (shrinks to 1 dot when assembled)
  shade: number; // 0..1 brightness from the source image
  delay: number; // 0..0.45 stagger so the hand builds wrist -> fingertip
  along: number; // 0 at the wrist .. 1 at the fingertip
  phase: number; // per-particle offset for the idle breathing wave
};

const STEP = 2; // sample every 2px of the source image
const DOT = 1.6; // assembled dot size (css px)
/** Room around the hand so scattered particles are never clipped. */
const PAD = 180;

// Smooth in-out so particles glide rather than snap into place.
function fadeMask(direction: string, width: number) {
  const image = `linear-gradient(${direction}, transparent ${PAD}px, black ${PAD + width * 0.45}px)`;
  return { WebkitMaskImage: image, maskImage: image };
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * A hand drawn as dither particles on a canvas. `progress` (0..1) assembles
 * it: particles stream in from beyond the outer edge, wrist first, pointing
 * finger last; once settled the hand breathes with a fingertip-weighted wave.
 * Driven every frame while on screen.
 */
export function ParticleHand({
  src,
  width,
  height,
  progress,
  fingerAt,
}: {
  src: string;
  width: number;
  height: number;
  progress: MotionValue<number>;
  /** Which side the fingertip is on, so it assembles last. */
  fingerAt: "left" | "right";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let points: Point[] = [];
    let frame = 0;
    let visible = false;
    let disposed = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = (width + PAD * 2) * dpr;
    canvas.height = (height + PAD * 2) * dpr;
    ctx.scale(dpr, dpr);
    ctx.translate(PAD, PAD);

    // Sample the dithered image into particles.
    const image = new Image();
    image.src = src;
    image.onload = () => {
      if (disposed) return;
      const scale = width / image.naturalWidth;
      const off = document.createElement("canvas");
      off.width = image.naturalWidth;
      off.height = image.naturalHeight;
      const octx = off.getContext("2d");
      if (!octx) return;
      octx.drawImage(image, 0, 0);
      const data = octx.getImageData(0, 0, off.width, off.height).data;
      const cx = width / 2;
      const cy = height / 2;
      const next: Point[] = [];
      for (let y = 0; y < off.height; y += STEP) {
        for (let x = 0; x < off.width; x += STEP) {
          const alpha = data[(y * off.width + x) * 4 + 3];
          if (alpha < 40) continue;
          const tx = x * scale;
          const ty = y * scale;
          // Particles stream in from beyond the outer edge (and slightly in
          // front of the screen), travelling toward the logo as one flow.
          const along = fingerAt === "right" ? tx / width : 1 - tx / width;
          const inward = fingerAt === "right" ? -1 : 1;
          const depth = 1.25 + Math.random() * 0.35;
          next.push({
            tx,
            ty,
            sx: cx + (tx - cx) * depth + inward * (90 + Math.random() * 70),
            sy: cy + (ty - cy) * depth + (Math.random() - 0.5) * 10,
            size: 1.8 + Math.random() * 1.6,
            shade: alpha / 255,
            delay: along * 0.32 + Math.random() * 0.06,
            along,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
      points = next;
      draw();
    };

    const draw = () => {
      const p = progress.get();
      const time = performance.now() / 1000;
      const dark = document.documentElement.classList.contains("dark");
      const rgb = dark ? "255,255,255" : "20,14,10";
      ctx.clearRect(-PAD, -PAD, width + PAD * 2, height + PAD * 2);
      for (const pt of points) {
        const local = Math.min(1, Math.max(0, (p - pt.delay) / (1 - 0.45)));
        if (local <= 0) continue;
        const e = easeInOutCubic(local);
        // Once settled the hand breathes: a slow wave that grows toward the
        // fingertip, so the pointing finger visibly reaches.
        const sway = e * pt.along * pt.along;
        const x =
          pt.sx +
          (pt.tx - pt.sx) * e +
          Math.sin(time * 1.4 + pt.along * 3) * 1.6 * sway;
        const y =
          pt.sy +
          (pt.ty - pt.sy) * e +
          Math.sin(time * 1.4 + pt.along * 3 + 1.2) * 2.2 * sway +
          Math.sin(time * 1.2 + pt.phase) * 0.12 * e;
        const size = pt.size + (DOT - pt.size) * e;
        ctx.fillStyle = `rgba(${rgb},${(pt.shade * (0.25 + 0.75 * e)).toFixed(3)})`;
        ctx.fillRect(x, y, size, size);
      }
    };

    const loop = () => {
      if (!visible || disposed) return;
      draw();
      frame = requestAnimationFrame(loop);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible) frame = requestAnimationFrame(loop);
    });
    observer.observe(canvas);

    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [src, width, height, progress, fingerAt]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        width: width + PAD * 2,
        height: height + PAD * 2,
        margin: -PAD,
        // Arm dissolves toward the wrist side instead of ending in a hard cut.
        ...fadeMask(fingerAt === "right" ? "to right" : "to left", width),
      }}
      className="block max-w-none"
    />
  );
}
