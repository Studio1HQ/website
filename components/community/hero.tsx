"use client";

import Image from "next/image";
import { PixelPortrait } from "@/components/about-us/pixel-portrait";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "@/components/home/ui";
import type { CommunityItem } from "@/lib/community";
import { DiscordIcon } from "@/components/community/discord-icon";
import { DISCORD_URL, LUMA_URL } from "@/components/community/join";
import { LumaLogo } from "@/components/community/luma-logo";
import { PAPER, PRINT } from "@/lib/paper";

type Totals = {
  events: number;
  cities: number;
  meetups: number;
  hackathons: number;
};

export function CommunityHero({
  totals,
}: {
  totals: Totals;
  next?: CommunityItem[];
}) {
  const reduce = useReducedMotion();
  const stats = [
    {
      value: `${totals.events}+`,
      label: "Events hosted",
      href: "#past-events",
      artwork: "events",
    },
    {
      value: totals.cities,
      label: "Cities connected",
      href: "#cities",
      artwork: "cities",
    },
    {
      value: totals.hackathons,
      label: "Hackathons",
      href: "#up-next",
      artwork: "hackathons",
    },
    {
      value: totals.meetups,
      label: "Meetups",
      href: "#meetups",
      artwork: "meetups",
    },
  ];
  return (
    <section
      className="px-4 pb-4 pt-24 sm:px-6 lg:pt-28"
      style={{ background: PAPER }}
    >
      <div className="mx-auto max-w-[1440px] overflow-hidden rounded-3xl bg-[#171918] text-white">
        <div className="grid lg:min-h-[560px] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASE }}
            className="flex min-w-0 flex-col items-start justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-10 lg:py-16 xl:px-14"
          >
            <div className="mb-7 flex flex-wrap items-center gap-x-4 gap-y-3">
              <div className="flex shrink-0 -space-x-2">
                {["shivay-lamba", "piuli-biswas", "souradeep-pradhan"].map(
                  (person, index) => (
                    <span
                      key={person}
                      className="relative flex size-12 items-center justify-center rounded-full border-[3px] bg-white p-0.5 shadow-[0_0_0_2px_#171918]"
                      style={{
                        borderColor: ["#38bdf8", "#fbbf24", "#f45d48"][index],
                      }}
                    >
                      <Image
                        src={`/assets/team/${person}.webp`}
                        alt=""
                        width={40}
                        height={40}
                        className="size-full rounded-full object-cover grayscale"
                      />
                    </span>
                  ),
                )}
              </div>
              <span className="inline-flex items-center gap-1.5 text-base font-medium tracking-tight text-white/85">
                <span>Studio1 community</span>
                <span
                  className="inline-flex items-center gap-1 pl-0.5"
                  aria-hidden="true"
                >
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      className="size-1 rounded-full bg-white/70"
                      animate={
                        reduce
                          ? undefined
                          : {
                              opacity: [0.25, 1, 0.25],
                              y: [0, -2.5, 0],
                              scale: [0.85, 1.2, 0.85],
                            }
                      }
                      transition={
                        reduce
                          ? undefined
                          : {
                              duration: 1.3,
                              repeat: Infinity,
                              delay: dot * 0.2,
                              ease: "easeInOut",
                            }
                      }
                    />
                  ))}
                </span>
              </span>
            </div>
            <h1 className="w-full max-w-[540px] text-balance text-[clamp(2.25rem,3.8vw,3.75rem)] font-medium leading-[1.1] tracking-[-0.045em]">
              Where developers
              <span className="block">
                <span style={{ color: PRINT }}>show up</span> and build.
              </span>
            </h1>
            <p className="mt-5 w-full max-w-[420px] text-pretty text-base leading-[1.7] text-white/65 sm:text-[17px]">
              Meetups, hackathons and the people who build at them. Find your
              community in {totals.cities} cities and online.
            </p>
            <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-white px-5 text-sm font-semibold text-[#171918] transition hover:bg-orange-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400"
              >
                <DiscordIcon className="size-5 text-[#5865F2]" /> Join the
                Discord
              </a>
              <a
                href={LUMA_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow on Luma"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-medium transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400"
              >
                Follow on <LumaLogo className="h-4 w-auto" />
              </a>
            </div>
          </motion.div>
          <figure className="relative m-3 mt-0 min-h-[280px] overflow-hidden rounded-2xl sm:min-h-[380px] lg:m-4 lg:ml-0">
            <Image
              src="/assets/events/kubecon-india-2026/01.webp"
              alt="Speakers and attendees in the main hall at KubeCon India 2026"
              fill
              preload
              sizes="(min-width: 1536px) 680px, (min-width: 1024px) 48vw, 100vw"
              className="object-cover object-center"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10"
            />
            <figcaption className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <span className="mb-2 block text-sm font-medium text-white/70">
                Out in the community
              </span>
              <span className="block text-xl font-medium tracking-tight sm:text-2xl">
                KubeCon India 2026
              </span>
              <span className="mt-1 block text-sm text-white/70">
                Real conversations. Shared ideas.
              </span>
            </figcaption>
          </figure>
        </div>
        <nav
          aria-label="Explore the community"
          className="grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-6 md:grid-cols-4"
        >
          {stats.map(({ value, label, href, artwork }, index) => (
            <motion.a
              key={label}
              href={href}
              initial={reduce ? false : { opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.55,
                delay: 0.15 + index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{
                y: -3,
                scale: 1.015,
                transition: { duration: 0.25, ease: "easeOut" },
              }}
              className="group relative isolate flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[linear-gradient(145deg,#202321,#252826)] px-5 py-5 text-left shadow-[inset_0_2px_5px_rgba(0,0,0,0.5),inset_0_-1px_0_rgba(255,255,255,0.08)] transition-[border-color,box-shadow] duration-200 hover:border-white/[0.18] hover:shadow-[inset_0_2px_5px_rgba(0,0,0,0.5),inset_0_-1px_0_rgba(255,255,255,0.08),0_8px_24px_-6px_rgba(0,0,0,0.5)] focus-visible:border-white/[0.18] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70 sm:px-6"
            >
              {/* Film grain overlay */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[1] opacity-[0.035] mix-blend-overlay"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "repeat",
                }}
              />
              <div
                aria-hidden
                className="absolute bottom-2 right-2 size-16 opacity-35 transition-opacity duration-300 group-hover:opacity-60 group-focus-visible:opacity-60 sm:size-20"
              >
                <PixelPortrait
                  src={`/assets/community/stats-${artwork}.svg`}
                  alt=""
                  trackCardPointer
                />
              </div>
              <span className="relative z-[2] text-sm text-white/65 transition-colors group-hover:text-white">
                {label}
              </span>
              <span className="relative z-[2] mt-3 text-3xl font-medium leading-none tracking-tight tabular-nums sm:text-4xl">
                {value}
              </span>
            </motion.a>
          ))}
        </nav>
      </div>
    </section>
  );
}
