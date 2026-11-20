"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Container, EASE } from "@/components/home/ui";
import { PaperSection } from "@/components/paper/paper-sections";
import { homeTestimonials } from "@/data/home";
import { TEAM } from "@/data/team";
import { PRINT } from "@/lib/paper";

/*
 * The people who show up: the team and the partners we've built with, as
 * rows of round faces. The faces near the cursor grow, like a magnifier
 * passing over the room.
 */

type Face = { name: string; src: string };

const PEOPLE: Face[] = [
  ...TEAM.flatMap((t) => t.members)
    .filter((m) => m.portrait && m.name && !m.open)
    .map((m) => ({ name: m.name as string, src: m.portrait as string })),
  ...homeTestimonials
    .filter((t) => t.avatar && !t.avatar.toLowerCase().includes("novita"))
    .map((t) => ({ name: t.name, src: t.avatar })),
];

const PER_ROW = 10;
/** Four rows, each starting at a different person so neighbours differ. */
const ROWS = [0, 13, 5, 19].map((shift) =>
  Array.from({ length: PER_ROW }, (_, i) => PEOPLE[(shift + i * 3) % PEOPLE.length]),
);

/** How far from the cursor a face still grows, and by how much at most. */
const REACH = 150;
const GROW = 0.75;

export function FaceWall({ events }: { events: number }) {
  const reduce = !!useReducedMotion();
  const wall = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const magnify = (x: number, y: number) => {
    const faces = wall.current?.querySelectorAll<HTMLElement>("[data-face]");
    faces?.forEach((el) => {
      const r = el.getBoundingClientRect();
      // measure from the face's resting centre, ignoring its current scale
      const s = Number(el.dataset.scale || 1);
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = Math.hypot(cx - x, cy - y) / s;
      const next = 1 + GROW * Math.max(0, 1 - d / REACH) ** 2;
      el.dataset.scale = String(next);
      el.style.transform = `scale(${next})`;
      el.style.zIndex = next > 1.05 ? "2" : "";
    });
  };

  const onMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType === "touch") return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => magnify(clientX, clientY));
  };
  const onLeave = () => {
    cancelAnimationFrame(frame.current);
    wall.current?.querySelectorAll<HTMLElement>("[data-face]").forEach((el) => {
      el.dataset.scale = "1";
      el.style.transform = "scale(1)";
      el.style.zIndex = "";
    });
  };

  return (
    <PaperSection tone="paper">
      <Container>
        <motion.h2
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: EASE }}
          className="mx-auto max-w-[680px] text-balance text-center text-[34px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[48px]"
        >
          Made by the people <span style={{ color: PRINT }}>who show up</span>
        </motion.h2>

        <div ref={wall} onPointerMove={onMove} onPointerLeave={onLeave} className="mx-auto mt-14 flex w-fit flex-col items-center gap-3 py-4 md:gap-4">
          {ROWS.map((row, r) => (
            <ul key={r} className="flex flex-wrap justify-center gap-3 md:gap-5">
              {row.map((f, i) => (
                <motion.li
                  key={`${r}-${i}`}
                  title={f.name}
                  initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.05 * (r * 2 + i) * 0.5 }}
                  className="relative"
                >
                  <span
                    data-face
                    className="relative block size-10 overflow-hidden rounded-full bg-[#e6e1d9] ring-2 ring-[#f4efe7] transition-transform duration-200 ease-out md:size-12"
                  >
                    <Image src={f.src} alt={f.name} fill sizes="96px" className="object-cover" />
                  </span>
                </motion.li>
              ))}
            </ul>
          ))}
        </div>

        <p className="mt-8 text-center text-[15px] text-[#141414]/55">
          Builders from {events}+ events, and counting…
        </p>
      </Container>
    </PaperSection>
  );
}
