"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import {
  Article,
  ArrowUpRight,
  Brain,
  Briefcase,
  ChatsCircle,
  CloudArrowUp,
  Code,
  Megaphone,
  PenNib,
  TerminalWindow,
  UsersThree,
  VideoCamera,
  type Icon,
} from "@phosphor-icons/react";
import Logo from "@/components/ui/svgs/logo";
import { GRAIN } from "@/lib/paper";
import { cn } from "@/lib/utils";

/** A distinct icon for each kind of role, matched on its title. */
const ROLE_ICONS: [RegExp, Icon][] = [
  [/genai|llm|agent/i, Brain],
  [/cloud|infra/i, CloudArrowUp],
  [/devrel engineer/i, TerminalWindow],
  [/advocate/i, Megaphone],
  [/technical content writer/i, Article],
  [/writer/i, PenNib],
  [/social media/i, ChatsCircle],
  [/content creator|video/i, VideoCamera],
  [/founder|office|operations/i, Briefcase],
  [/engineer|developer/i, Code],
];

export function RoleIcon({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  const Glyph =
    ROLE_ICONS.find(([pattern]) => pattern.test(title))?.[1] ?? Briefcase;
  return <Glyph weight="duotone" className={className} />;
}

const STRAP = 150;
const WIDTH = 400;

/**
 * Hangs its child from an orange lanyard and clip. It drops in from above
 * and settles with a bounce; it can be pulled and swings back.
 */
export function Hanging({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(reduceMotion ? 0 : -560);
  const swing = useSpring(
    useTransform(x, (v) => v * -0.05),
    { stiffness: 110, damping: 11 },
  );
  const tiltY = useTransform(x, [-220, 220], [12, -12]);
  const left = useTransform([x, y], ([dx, dy]: number[]) => {
    const endX = WIDTH / 2 + dx - 5;
    const endY = STRAP + dy - 38;
    return `M ${WIDTH / 2 - 9} -900 Q ${(WIDTH / 2 - 9 + endX) / 2} ${(endY - 900) / 2} ${endX} ${endY}`;
  });
  const right = useTransform([x, y], ([dx, dy]: number[]) => {
    const endX = WIDTH / 2 + dx + 5;
    const endY = STRAP + dy - 38;
    return `M ${WIDTH / 2 + 9} -900 Q ${(WIDTH / 2 + 9 + endX) / 2} ${(endY - 900) / 2} ${endX} ${endY}`;
  });

  useEffect(() => {
    if (reduceMotion) return;
    const controls = animate(y, 0, {
      type: "spring",
      stiffness: 70,
      damping: 7,
      mass: 1.4,
      delay: 0.3,
    });
    return () => controls.stop();
  }, [reduceMotion, y]);

  return (
    <motion.div
      className="relative mx-auto [perspective:1400px] lg:mr-6"
      // Pulled up by the strap's height, so the card sits where it always did.
      style={{ width: WIDTH, marginTop: -STRAP }}
    >
      {/* Black fabric lanyard */}
      <svg
        aria-hidden
        width={WIDTH}
        height={STRAP + 40}
        className="pointer-events-none absolute inset-x-0 top-0 -z-[1] overflow-visible"
      >
        <defs>
          <linearGradient id="badge-strap" x1="0" x2="1">
            <stop offset="0" stopColor="#0d0b0a" />
            <stop offset="0.5" stopColor="#2c2724" />
            <stop offset="1" stopColor="#0d0b0a" />
          </linearGradient>
        </defs>
        {[left, right].map((d, i) => (
          <g key={i}>
            <motion.path
              d={d}
              fill="none"
              stroke="url(#badge-strap)"
              strokeWidth="11"
            />
            <motion.path
              d={d}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
          </g>
        ))}
      </svg>

      <motion.div
        drag
        dragSnapToOrigin
        dragElastic={0.3}
        dragTransition={{ bounceStiffness: 150, bounceDamping: 8 }}
        whileDrag={{ cursor: "grabbing" }}
        className="relative cursor-grab touch-none select-none [transform-origin:50%_0%] [transform-style:preserve-3d]"
        style={{
          marginTop: STRAP,
          width: WIDTH,
          x,
          y,
          rotate: reduceMotion ? 0 : swing,
          rotateY: reduceMotion ? 0 : tiltY,
        }}
      >
        {/* Hardware: the strap's crimped end, a steel ring through a
            punched slot in the card */}
        <span
          aria-hidden
          className="absolute -top-[40px] left-1/2 z-20 flex -translate-x-1/2 flex-col items-center"
        >
          <span className="relative h-[18px] w-[26px] rounded-[4px] bg-[linear-gradient(180deg,#2c2724,#0d0b0a)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_4px_rgba(0,0,0,0.35)]">
            <span className="absolute left-1/2 top-1/2 size-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffffff,#a8a29a)]" />
          </span>
          <span className="-mt-[3px] h-[36px] w-[18px] rounded-[9px] border-[2.5px] border-[#c9c3bb] shadow-[inset_0_1px_1px_rgba(0,0,0,0.25),0_1px_2px_rgba(0,0,0,0.3)]" />
        </span>
        <span
          aria-hidden
          className="absolute left-1/2 top-[14px] z-10 h-[10px] w-[34px] -translate-x-1/2 rounded-full bg-[#e9e3da] shadow-[inset_0_2px_3px_rgba(0,0,0,0.35)]"
        />

        {children}
      </motion.div>
    </motion.div>
  );
}

/** Phrases in the hero line that get a small icon or product logo. */
const PHRASES: [string, Icon | string][] = [
  ["devtool and SaaS teams", UsersThree],
  ["technical content", Article],
  ["DevRel", Megaphone],
  ["Raah", "/products/raah-logo.svg"],
  ["AssetSnip", "/products/assetsnip-logo.svg"],
];

/** The hero description with small orange icons and product logos inline. */
export function IconText({ text }: { text: string }) {
  const pattern = new RegExp(`(${PHRASES.map(([p]) => p).join("|")})`);
  return (
    <>
      {text.split(pattern).map((part, k) => {
        const match = PHRASES.find(([p]) => p === part);
        if (!match) return part;
        const mark = match[1];
        return (
          <span key={k} className="whitespace-nowrap">
            {typeof mark === "string" ? (
              <span className="relative mr-1.5 inline-block size-[1.05em] translate-y-[0.15em] overflow-hidden rounded-[5px] shadow-[0_2px_6px_-2px_rgba(20,20,20,0.4)]">
                <Image
                  src={mark}
                  alt=""
                  fill
                  sizes="20px"
                  unoptimized
                  className="object-cover"
                />
              </span>
            ) : (
              (() => {
                const Glyph = mark;
                return (
                  <Glyph
                    aria-hidden
                    weight="duotone"
                    className="mr-1 inline size-[1.05em] -translate-y-[0.08em] text-[#f97316]"
                  />
                );
              })()
            )}
            <span className="font-medium text-[#141414]/85">{part}</span>
          </span>
        );
      })}
    </>
  );
}
