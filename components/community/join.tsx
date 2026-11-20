"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CheckCircle } from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import { PaperSection } from "@/components/paper/paper-sections";
import { PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";
import { DiscordIcon } from "@/components/community/discord-icon";
import { LumaLogo } from "@/components/community/luma-logo";

export const DISCORD_URL = "https://discord.gg/cCbjnxVhzx";
export const LUMA_URL = "https://luma.com/studio1";

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
/**
 * The newsletter: one paper card, the ask and the email on the left, four
 * photos from our events on the right.
 */
export function JoinCommunity() {
  const reduce = !!useReducedMotion();
  return (
    <PaperSection id="join" tone="paper" className="scroll-mt-24">
      <Container>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.1, ease: EASE }}
          className="grid items-center gap-8 overflow-hidden rounded-[10px] bg-white/80 p-5 ring-1 ring-inset ring-[#141414]/10 md:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12 lg:p-12"
        >
          <div>
            <h2 className="max-w-[480px] text-balance text-[32px] font-medium leading-[1.06] tracking-[-0.045em] md:text-[44px]">
              Picture a weekend where you <span style={{ color: PRINT }}>built it with us</span>
            </h2>
            <p className="mt-4 max-w-[440px] text-[16px] leading-[1.6] text-[#141414]/60">
              One email when a hackathon or meetup opens near you. No spam, unsubscribe any time.
            </p>
            <div className="mt-8 max-w-[460px]">
              <Subscribe light />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2.5 text-[14px]">
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 font-medium ring-1 ring-inset ring-[#141414]/[0.12] transition-colors hover:bg-[#f6f3ee]">
                <DiscordIcon className="size-4 text-[#5865F2]" /> Join the Discord
              </a>
              <a href={LUMA_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 font-medium ring-1 ring-inset ring-[#141414]/[0.12] transition-colors hover:bg-[#f6f3ee]">
                Follow on <LumaLogo className="h-[13px] w-auto -translate-y-px" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {COLLAGE.map(([src], i) => (
              <motion.div
                key={src}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.15 + i * 0.08 }}
                className="relative aspect-[4/3] overflow-hidden rounded-[6px] bg-[#e6e1d9]"
              >
                <Image src={src} alt="" fill sizes="(min-width: 1024px) 300px, 50vw" className="object-cover" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Container>
    </PaperSection>
  );
}
