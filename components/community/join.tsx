"use client";

import { useRef, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, CheckCircle, DiscordLogo, EnvelopeSimple } from "@phosphor-icons/react";
import { Container, EASE } from "@/components/home/ui";
import { DitherField } from "@/components/home/dither-field";
import { IndexBar, PaperSection } from "@/components/paper/paper-sections";
import { GRAIN, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

export const DISCORD_URL = "https://discord.gg/cCbjnxVhzx";

const rise = (reduce: boolean, delay = 0) =>
  ({
    initial: reduce ? false : { opacity: 0, y: 36 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 1.1, ease: EASE, delay },
  }) as const;

/** Email signup for news of the next hackathon or meetup. */
function Subscribe() {
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
      <p className="mt-6 flex items-center gap-2 text-[15px] font-medium">
        <CheckCircle weight="fill" className="size-5" style={{ color: PRINT }} />
        You&apos;re in. We&apos;ll email you when the next one opens.
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="mt-6" noValidate>
      {/* Left empty by people; bots fill it */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="flex flex-col gap-2 sm:flex-row">
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
          className="h-12 min-w-0 flex-1 rounded-full bg-white px-5 text-[15px] outline-none ring-1 ring-inset ring-[#141414]/15 transition-shadow placeholder:text-[#141414]/35 focus:ring-2 focus:ring-[#f97316]"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#141414] px-6 text-[14px] font-medium text-white transition-colors hover:bg-[#f97316] disabled:opacity-60"
        >
          {state === "sending" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      <p className={cn("mt-3 text-[12.5px]", state === "error" ? "text-[#c2410c]" : "text-[#141414]/45")}>
        {state === "error" ? error : "One email per new hackathon or meetup. Unsubscribe any time."}
      </p>
    </form>
  );
}

/** Join the community: the Discord, and the email list for what's next. */
export function JoinCommunity({ index }: { index: number }) {
  const reduce = !!useReducedMotion();
  return (
    <PaperSection id="join" tone="paper" className="scroll-mt-24">
      <Container>
        <IndexBar index={index} name="Join" />
        <motion.h2 {...rise(reduce)} className="mt-6 max-w-[680px] text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]">
          Join the Studio1 <span style={{ color: PRINT }}>community</span>
        </motion.h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          {/* Discord */}
          <motion.a
            {...rise(reduce, 0.08)}
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative isolate flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[6px] bg-[#141414] p-7 text-white md:p-9"
          >
            <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]" style={{ backgroundImage: GRAIN }} />
            <DitherField still strength={1.8} seed={7.4} className="absolute inset-y-0 right-0 -z-10 h-full w-[55%] opacity-60 [mask-image:linear-gradient(to_left,black_30%,transparent)]" />
            <span className="flex size-14 items-center justify-center rounded-[6px] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105" style={{ background: "#5865F2" }}>
              <DiscordLogo weight="fill" className="size-8" />
            </span>
            <div>
              <h3 className="text-[30px] font-medium leading-[1.05] tracking-[-0.04em] md:text-[36px]">Hang out on Discord</h3>
              <p className="mt-3 max-w-[440px] text-[16px] leading-[1.55] text-white/65">
                Event announcements first, help with your builds, and the people you met at the last meetup.
              </p>
              <span className="mt-7 inline-flex h-12 items-center gap-3 rounded-full bg-white py-1.5 pl-5 pr-1.5 text-[14px] font-medium text-[#141414]">
                Join the Discord
                <span className="flex size-9 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45" style={{ background: PRINT }}>
                  <ArrowUpRight weight="bold" className="size-4" />
                </span>
              </span>
            </div>
          </motion.a>

          {/* Email list */}
          <motion.div {...rise(reduce, 0.16)} className="relative isolate flex flex-col justify-between overflow-hidden rounded-[6px] bg-white/80 p-7 ring-1 ring-inset ring-[#141414]/10 md:p-9 [&>*:not(canvas)]:relative">
            <DitherField still strength={1.8} seed={2.6} className="absolute inset-y-0 right-0 -z-10 h-full w-[50%] opacity-70 [mask-image:linear-gradient(to_left,black_30%,transparent)]" />
            <span className="flex size-14 items-center justify-center bg-[#141414] text-[#f4efe7]">
              <EnvelopeSimple weight="regular" className="size-7" />
            </span>
            <div className="mt-10">
              <h3 className="text-[30px] font-medium leading-[1.05] tracking-[-0.04em] md:text-[36px]">Hear about the next one</h3>
              <p className="mt-3 max-w-[420px] text-[16px] leading-[1.55] text-[#141414]/60">
                Get an email when registrations open for a hackathon or a meetup near you.
              </p>
              <Subscribe />
            </div>
          </motion.div>
        </div>
      </Container>
    </PaperSection>
  );
}
