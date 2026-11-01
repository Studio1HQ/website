/**
 * A soft, short "tick" made with Web Audio (no audio file). Browsers only
 * allow sound after the visitor has clicked or pressed a key on the page,
 * so until then this stays silent.
 */
let ctx: AudioContext | null = null;
let unlocked = false;

function unlock() {
  unlocked = true;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (Ctor) ctx = new Ctor();
  }
  void ctx?.resume();
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });
}

/** Plays one quiet tick. `pitch` shifts it slightly so a run feels natural. */
export function tick(pitch = 1) {
  if (!unlocked || !ctx || ctx.state !== "running") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(1900 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(900 * pitch, now + 0.04);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}
