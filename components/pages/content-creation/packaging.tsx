"use client";

import { motion, useReducedMotion } from "motion/react";
import { Container, EASE } from "@/components/home/ui";
import {
  Accent,
  CELL,
  IndexBar,
  MUTED,
  PaperSection,
} from "@/components/paper/paper-sections";
import { cn } from "@/lib/utils";
import {
  IconClick,
  IconPhoto,
  IconSearch,
  IconDeviceMobile,
} from "@tabler/icons-react";

const layers = [
  {
    icon: IconPhoto,
    title: "Clear preview packaging",
    body: "Readable titles, thumbnails, and descriptions that set the right expectation before a developer presses play.",
  },
  {
    icon: IconSearch,
    title: "Search-friendly context",
    body: "Titles, descriptions, tags, and chapters written around the topic, product, and developer problem being explained.",
  },
  {
    icon: IconClick,
    title: "A strong technical opening",
    body: "Cold opens and demo beats that get to the technical point quickly instead of starting with a long brand intro.",
  },
  {
    icon: IconDeviceMobile,
    title: "Shorts from the same idea",
    body: "Short clips and vertical cuts that reuse the strongest explanation without pretending every topic needs a full campaign.",
  },
];

export default function Packaging({ index = 4 }: { index?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <PaperSection tone="paper">
      <Container>
        <IndexBar index={index} name="The packaging layer" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="max-w-md text-[32px] font-medium leading-[1.2] tracking-[-0.045em] sm:text-[40px] lg:text-[46px]">
              <span>
                Make the technical idea clear before <Accent>play</Accent>
              </span>
            </h2>
            <p className={cn("mt-6 max-w-md text-[16px] leading-[1.6]", MUTED)}>
              We support the practical details around a video: title, thumbnail,
              description, chapters, clips, and upload-ready assets when needed.
            </p>
          </div>

          <ol className="grid gap-2">
            {layers.map((layer, position) => (
              <li key={layer.title}>
                <motion.div
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, y: 18, filter: "blur(8px)" }
                  }
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: false, amount: 0.4 }}
                  transition={{
                    duration: 0.8,
                    ease: EASE,
                    delay: position * 0.06,
                  }}
                >
                  <div
                    className={cn(
                      "group relative isolate grid gap-5 overflow-hidden p-6 sm:grid-cols-[auto_1fr] sm:gap-6 md:p-7",
                      CELL,
                    )}
                  >
                    {/* Orange wash rising from the bottom on hover */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(120% 80% at 50% 120%, rgba(249,115,22,0.18), transparent 70%)",
                      }}
                    />
                    <span className="flex size-12 items-center justify-center rounded-[6px] transition-colors duration-500 group-hover:text-[#ea580c] bg-[#f8f6f2] text-[#141414] shadow-[inset_0_3px_8px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.10)]">
                      <layer.icon
                        className="size-6"
                        stroke={1.6}
                        aria-hidden="true"
                      />
                    </span>
                    <div>
                      <h3 className="text-[20px] font-medium tracking-[-0.03em] md:text-[22px]">
                        {layer.title}
                      </h3>
                      <p
                        className={cn(
                          "mt-2.5 max-w-xl text-[15px] leading-[1.6]",
                          MUTED,
                        )}
                      >
                        {layer.body}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </PaperSection>
  );
}
