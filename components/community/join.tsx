"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, CheckCircle } from "@phosphor-icons/react";
import { EASE } from "@/components/home/ui";
import { PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";
import { DiscordIcon } from "@/components/community/discord-icon";
import { LumaLogo } from "@/components/community/luma-logo";

export const DISCORD_URL = "https://discord.gg/cCbjnxVhzx";
export const LUMA_URL = "https://luma.com/studio1";

/** Photos from our events, laid edge to edge behind the signup card. */
const WALL = [
  "aki-hacks/01", "ai-engineer-singapore/01", "hackspire-2/01", "scee-hackathon/01", "synchronicity-s2/01", "coscup/01",
  "claude-code-delhi/01", "react-alicante/01", "aki-hacks/02", "cncf-taiwan/01", "ai-engineer-singapore/02", "cityjs-athens/01",
  "bengaluru-cloud-ai/01", "scee-hackathon/02", "hackspire-2/02", "synchronicity-s2/02", "coscup/02", "ai-engineer-singapore/03",
].map((p) => `/assets/events/${p}.webp`);

/** The four photos inside the card, each with a word on it. */
const COLLAGE: [string, string][] = [
  ["/assets/events/aki-hacks/03.webp", "hackathons"],
  ["/assets/events/ai-engineer-singapore/04.webp", "talks"],
  ["/assets/events/synchronicity-s2/03.webp", "friends"],
  ["/assets/events/scee-hackathon/03.webp", "demos"],
];

/** Email signup for news of the next hackathon or meetup. */
export function Subscribe({ wide = false, light = false }: { wide?: boolean; light?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const shown = useRef(Date.now());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/community/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, website: form.get("website"), fillMs: Date.now() - shown.current }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className={cn("mx-auto flex h-14 items-center justify-center gap-2 text-[15px] font-medium", light ? "text-[#141414]" : "text-white")}>
        <CheckCircle weight="fill" className="size-5" style={{ color: PRINT }} />
        You&apos;re in. We&apos;ll email you when the next one opens.
      </p>
    );
  }
  return (
    <form onSubmit={submit} noValidate>
      {/* Left empty by people; bots fill it */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className={cn("mx-auto flex items-center gap-1.5 rounded-full p-1.5 ring-1 ring-inset transition-shadow focus-within:ring-[#f97316]", light ? "bg-white shadow-[0_18px_40px_-28px_rgba(20,20,20,0.45)] ring-[#141414]/[0.12]" : "bg-white/[0.08] ring-white/10", wide ? "max-w-[560px] [&_button]:h-12 [&_input]:h-12" : "max-w-[440px]")}>
        <label className="sr-only" htmlFor="community-email">Email address</label>
        <input
          id="community-email"
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn("h-11 min-w-0 flex-1 bg-transparent px-4 text-[15px] outline-none", light ? "text-[#141414] placeholder:text-[#141414]/35" : "text-white placeholder:text-white/35")}
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className={cn("inline-flex h-11 shrink-0 items-center justify-center rounded-full px-6 text-[15px] font-medium transition-colors hover:bg-[#f97316] hover:text-white disabled:opacity-60", light ? "bg-[#141414] text-white" : "bg-[#f4efe7] text-[#141414]")}
        >
          {state === "sending" ? "Joining…" : "Join"}
        </button>
      </div>
      {state === "error" ? <p className="mt-3 text-[13px] text-[#fdba74]">{error}</p> : null}
    </form>
  );
}

/**
 * The newsletter: a wall of photos from our events, and on it one card that
 * asks for an email, with the Discord as the other way in.
 */
export function JoinCommunity({ hero = false }: { hero?: boolean }) {
  const reduce = !!useReducedMotion();
  const Heading = hero ? "h1" : "h2";
  return (
    <section id="join" className={cn("relative isolate scroll-mt-24 overflow-hidden bg-[#141414]", hero && "mt-[72px] md:mt-[84px]")}>
      {/* The wall */}
      <div aria-hidden className="absolute inset-0 -z-10 grid grid-cols-3 grid-rows-6 md:grid-cols-6 md:grid-rows-3">
        {WALL.map((src, i) => (
          <motion.div
            key={src}
            className="relative overflow-hidden"
            initial={reduce ? false : { opacity: 0 }}
            {...(hero ? { animate: { opacity: 1 } } : { whileInView: { opacity: 1 }, viewport: { once: true, margin: "-60px" } })}
            transition={{ duration: 1.2, ease: EASE, delay: (i % 6) * 0.06 + Math.floor(i / 6) * 0.1 }}
          >
            <Image src={src} alt="" fill sizes="(min-width: 768px) 17vw, 34vw" className="object-cover" />
          </motion.div>
        ))}
        <span className="absolute inset-0 bg-[#141414]/35" />
      </div>

      {/* The card */}
      <div className={cn("px-4", hero ? "py-14 md:py-20" : "py-20 md:py-28")}>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 40 }}
          {...(hero ? { animate: { opacity: 1, y: 0 } } : { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" } })}
          transition={{ duration: 1.1, ease: EASE, delay: hero ? 0.35 : 0 }}
          className="mx-auto max-w-[760px] rounded-[14px] bg-[#141414] px-5 py-10 text-center shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] sm:px-10 md:px-14 md:py-14"
        >
          {hero ? <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.2em] text-white/45">Studio1 Community</p> : null}
          <Heading className="mx-auto max-w-[560px] text-balance text-[30px] font-medium leading-[1.1] tracking-[-0.04em] text-white md:text-[44px]">
            Picture a weekend where you <span style={{ color: PRINT }}>built it with us:</span>
          </Heading>

          <div className="relative mt-9 grid grid-cols-2 gap-1.5 overflow-hidden rounded-[10px]">
            {COLLAGE.map(([src, word], i) => (
              <div key={src} className="relative aspect-[16/10] overflow-hidden">
                <Image src={src} alt="" fill sizes="(min-width: 768px) 330px, 45vw" className="object-cover" />
                <span aria-hidden className="absolute inset-0 bg-black/15" />
                <motion.span
                  className={cn(
                    "absolute rounded-[4px] bg-white px-2.5 py-1 text-[12.5px] font-medium text-[#141414] shadow-[0_8px_18px_-10px_rgba(0,0,0,0.6)]",
                    i === 0 && "left-3 top-3 -rotate-3",
                    i === 1 && "right-3 top-3 rotate-2",
                    i === 2 && "bottom-3 left-3 rotate-2",
                    i === 3 && "bottom-3 right-3 -rotate-2",
                  )}
                  initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.5 + i * 0.12 }}
                >
                  {word}
                </motion.span>
              </div>
            ))}
            {/* A flag across the middle */}
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6 whitespace-nowrap rounded-[6px] px-4 py-2 text-[18px] font-semibold tracking-[-0.02em] text-white shadow-[0_14px_30px_-12px_rgba(0,0,0,0.7)] md:text-[24px]" style={{ background: PRINT }}>
              welcome to Studio1
            </span>
          </div>

          <div className="mt-9">
            <Subscribe />
          </div>
          <p className="mt-4 text-[13px] text-white/50">
            One email when a hackathon or meetup opens. Rather chat?{" "}
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-[#f97316]">
              <DiscordIcon className="size-3.5" /> Join the Discord <ArrowUpRight weight="bold" className="size-3" />
            </a>
            <span className="mx-2 text-white/25">/</span>
            <a href={LUMA_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-[#f97316]">
              Follow on <LumaLogo className="h-[12px] w-auto translate-y-[1px]" />
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
