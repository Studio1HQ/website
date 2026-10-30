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
      className="group relative isolate flex h-full flex-col overflow-hidden rounded-[16px] bg-[#f9f6f2] p-7 text-[#141414] shadow-[inset_0_1px_0_#fff,0_20px_40px_-34px_rgba(20,20,20,0.4)] ring-1 ring-inset ring-[#141414]/[0.06] md:p-9"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: 0.08 * index, ease: "easeOut" }}
    >
      {/* Header: the 3D tile beside the title and lede */}
      <div className="flex items-start gap-5">
        <div className="mt-0.5 w-14 shrink-0 transition-transform duration-700 ease-out group-hover:-translate-y-0.5 md:w-16">
          <Icon3D icon={TileIcon} className="w-full" />
        </div>
        <div>
          <h3 className="text-[30px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[36px]">
            {first} <span style={{ color: PRINT }}>{accent}</span>
          </h3>
          <p className="mt-2 max-w-[420px] text-[14.5px] leading-[1.55] text-[#141414]/60">
            {lede}
          </p>
        </div>
      </div>

      {/* Points: engraved tiles, two across */}
      <ul className="mt-8 grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
        {data.points.map((point, i) => {
          const PointIcon = point.icon;
          const last =
            i === data.points.length - 1 && data.points.length % 2 === 1;
          return (
            <li
              key={point.text}
              className={
                "group/tile flex items-start gap-3 rounded-[12px] bg-[#f1ece4] p-4 shadow-[inset_0_2px_6px_rgba(20,20,20,0.08),inset_0_1px_2px_rgba(20,20,20,0.06),inset_0_-1px_0_rgba(255,255,255,0.8)] transition-colors duration-300 hover:bg-white" +
                (last ? " sm:col-span-2" : "")
              }
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-white text-[#f97316] shadow-[0_4px_10px_-6px_rgba(20,20,20,0.35)] transition-colors duration-300 group-hover/tile:bg-[#f97316] group-hover/tile:text-white">
                <PointIcon weight="bold" className="size-4" />
              </span>
              <span className="pt-[7px] text-[14px] font-medium leading-[18px] tracking-[-0.01em] text-[#141414]/85">
                {point.text}
              </span>
            </li>
          );
        })}
      </ul>
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

        <div className="relative isolate mt-10 grid grid-cols-1 gap-3 md:mt-12 md:grid-cols-2">
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
