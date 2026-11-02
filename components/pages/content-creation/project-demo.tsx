"use client";

import { fadeInUp, staggerChildren } from "@/lib/animations";
import { ExternalLink, PlayCircle } from "lucide-react";
import { motion } from "motion/react";

const demoUrl = "https://x.com/Astrodevil_/status/2085713351901081765/video/1";
const embedUrl =
  "https://platform.twitter.com/embed/Tweet.html?id=2085713351901081765&theme=dark";

export default function ProjectDemo() {
  return (
    <section
      id="project-demo"
      className="relative scroll-mt-28 border-y bg-muted/20 py-20 md:py-28"
    >
      <motion.div
        variants={staggerChildren}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-8"
      >
        <motion.div variants={fadeInUp}>
          <div className="flex size-12 items-center justify-center rounded-[6px] border bg-background text-primary shadow-sm">
            <PlayCircle className="size-6" aria-hidden="true" />
          </div>
          <p className="mt-6 font-secondary text-sm font-medium tracking-wide text-primary">
            Project demo example
          </p>
          <h2 className="mt-4 font-inter text-4xl font-normal tracking-tight md:text-5xl">
            Product-led demos developers can inspect
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            A good technical demo should make the product behavior, code path,
            and developer workflow easy to understand without turning into a
            marketing video.
          </p>
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary1"
          >
            Open demo on X
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[6px] border bg-[#050505] shadow-sm"
        >
          <div className="aspect-[4/5] w-full bg-[#050505]">
            <iframe
              src={embedUrl}
              title="Project demo example on X"
              loading="lazy"
              allow="autoplay; encrypted-media; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              className="size-full border-0"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
