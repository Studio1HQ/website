"use client";

import { Icon } from "@phosphor-icons/react";
import {
  ChartBar,
  Lightbulb,
  Target,
  TrendUp,
  Users,
  Flag,
  Globe,
  Heart,
  Rocket,
  HandHeart,
} from "@phosphor-icons/react/dist/ssr";
import { motion, useReducedMotion } from "motion/react";
import { Icon3D } from "@/components/about-us/hero-arrows";
import { Container } from "@/components/home/ui";
import {
  Accent,
  IndexBar,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";
import { PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

const contentData = {
  vision: {
    title: "Our Vision",
    icon: ChartBar,
    points: [
      {
        icon: Target,
        text: "Deliver clear, technical content that developers value",
      },
      {
        icon: Lightbulb,
        text: "Encourage creativity and constant learning",
      },
      {
        icon: TrendUp,
        text: "Drive measurable growth with every project",
      },
      {
        icon: Users,
        text: "Build transparent, long-term partnerships",
      },
      {
        icon: Globe,
        text: "Lead with quality and developer-first thinking",
      },
    ],
  },
  mission: {
    title: "Our Mission",
    icon: Flag,
    points: [
      {
        icon: Rocket,
        text: "Turn technical complexity into developer-friendly storytelling",
      },
      {
        icon: HandHeart,
        text: "Help clients hit growth goals through strategic content",
      },
      {
        icon: Heart,
        text: "Foster a collaborative and inclusive team culture",
      },
      {
        icon: Globe,
        text: "Commit to sustainable, long-term results",
      },
      {
        icon: Users,
        text: "Create meaningful impact for both SaaS teams and developer communities",
      },
    ],
  },
};

const ContentBlock = ({
  data,
  index,
  lede,
}: {
  data: {
    title: string;
    icon: Icon;
    points: {
      icon: Icon;
      text: string;
    }[];
  };
  index: number;
  lede: string;
}) => {
  const reduceMotion = useReducedMotion();
  const [first, ...rest] = data.title.split(" ");
  // "Our Vision" -> accent the second word, keep "Our" in ink.
  const accent = rest.join(" ");
  const TileIcon = index === 0 ? Target : Rocket;

  return (
    <motion.article
      className="group relative isolate flex h-full flex-col overflow-hidden rounded-[22px] bg-[#f9f6f2] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_30px_60px_-44px_rgba(20,20,20,0.45)] ring-1 ring-inset ring-white/70 backdrop-blur-xl backdrop-saturate-150 md:p-9"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: 0.08 * index, ease: "easeOut" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 -z-10 size-[320px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(249,115,22,0.45), transparent)",
        }}
      />
      {/* 3D tile tucked into the card's corner */}
      <div className="pointer-events-none absolute right-7 top-7 w-[72px] rotate-[8deg] transition-transform duration-700 ease-out group-hover:-translate-y-1 group-hover:rotate-[2deg] md:right-9 md:top-9 md:w-[88px]">
        <Icon3D icon={TileIcon} className="w-full" />
      </div>
      <h3 className="text-[34px] font-medium leading-[1.05] tracking-[-0.045em] text-[#141414] md:text-[40px]">
        {first} <span style={{ color: PRINT }}>{accent}</span>
      </h3>
      <p className="mt-3 min-h-[3.1em] max-w-[420px] pr-24 text-[15px] leading-[1.55] text-[#141414]/70">
        {lede}
      </p>

      <div className="mt-7">
        <ul className="flex flex-col items-start gap-2.5">
          {data.points.map((point) => (
            <li key={point.text}>
              <span className="inline-flex items-center gap-2.5 rounded-full bg-[#141414]/[0.04] px-4 py-2 text-[13.5px] font-medium leading-snug text-[#141414] shadow-[inset_0_2px_6px_rgba(20,20,20,0.12),inset_0_1px_2px_rgba(20,20,20,0.08),inset_0_-1px_0_rgba(255,255,255,0.8)] backdrop-blur-md transition-colors duration-200 hover:bg-[#f97316]/10">
                {point.text}
                <span aria-hidden className="text-[#f97316]">
                  &rarr;
                </span>
              </span>
            </li>
          ))}
        </ul>
        {/* 3D tile, the same as the About hero */}
      </div>
    </motion.article>
  );
};

export const VisionMission = () => {
  return (
    <PaperSection tone="paper" className="py-10 md:py-14">
      <Container>
        <IndexBar index={1} name="Vision & mission" />
        <SectionHead
          title={
            <>
              What <Accent>Fuels Us?</Accent>
            </>
          }
          description="We help SaaS teams build developer trust through high-impact content and DevRel strategy that scales with their product."
        />

        <div className="relative isolate mt-10 grid grid-cols-1 gap-2 md:mt-12 md:grid-cols-2">
          <ContentBlock
            data={contentData.vision}
            index={0}
            lede="Clear, technical content and DevRel that developers value and trust."
          />
          <ContentBlock
            data={contentData.mission}
            index={1}
            lede="Turn technical complexity into developer-friendly storytelling that drives growth."
          />
        </div>
      </Container>
    </PaperSection>
  );
};
