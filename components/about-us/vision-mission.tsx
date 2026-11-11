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
        text: "Content written by engineers who use the product",
      },
      {
        icon: Lightbulb,
        text: "Code samples tested before they ship",
      },
      {
        icon: TrendUp,
        text: "Measure developer adoption, not just reach",
      },
      {
        icon: Users,
        text: "Build transparent, long-term partnerships",
      },
      {
        icon: Globe,
        text: "Docs and DX that get developers to a first success",
      },
    ],
  },
  mission: {
    title: "Our Mission",
    icon: Flag,
    points: [
      {
        icon: Rocket,
        text: "Run launches developers can try on day one",
      },
      {
        icon: HandHeart,
        text: "Tie every piece of content to a growth goal",
      },
      {
        icon: Heart,
        text: "Show up in developer communities, online and at events",
      },
      {
        icon: Globe,
        text: "Build programs that keep working after launch",
      },
      {
        icon: Users,
        text: "Do work that helps both devtool teams and the developer communities they serve",
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
  const SecondIcon = index === 0 ? Lightbulb : Flag;

  return (
    <motion.article
      className="group relative isolate flex h-full flex-col overflow-hidden rounded-[6px] bg-white p-7 text-[#141414] shadow-[0_1px_0_rgba(27,23,20,0.06)] ring-1 ring-inset ring-[#141414]/[0.07] md:p-9"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: 0.08 * index, ease: "easeOut" }}
    >
      {/* Header: two printed tiles resting on a tabbed panel */}
      <div className="relative pt-14">
        <div className="absolute left-4 top-0 z-[2] flex items-end">
          <span className="block w-16 -rotate-6 transition-transform duration-700 ease-out group-hover:-translate-y-1 group-hover:-rotate-[9deg] md:w-[72px]">
            <Icon3D icon={TileIcon} className="w-full" />
          </span>
          <span className="-ml-3 mb-[-6px] block w-14 rotate-[8deg] transition-transform duration-700 ease-out group-hover:-translate-y-0.5 group-hover:rotate-[11deg] md:w-16">
            <Icon3D icon={SecondIcon} ink className="w-full" />
          </span>
        </div>
        <div className="relative rounded-[6px] rounded-tl-none bg-[#f4efe7] p-6 pt-10">
          {/* The tab the tiles sit on */}
          <span className="absolute -top-5 left-0 h-5 w-[46%] rounded-t-[6px] bg-[#f4efe7]" />
          <h3 className="text-[30px] font-medium leading-[1.05] tracking-[-0.045em] md:text-[36px]">
            {first} <span style={{ color: PRINT }}>{accent}</span>
          </h3>
          <div className="my-4 h-px bg-[#141414]/10" />
          <p className="max-w-[440px] text-[14.5px] leading-[1.55] text-[#141414]/60">
            {lede}
          </p>
        </div>
      </div>

      {/* Points: paper tiles, two across */}
      <ul className="mt-8 grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
        {data.points.map((point, i) => {
          const PointIcon = point.icon;
          const last =
            i === data.points.length - 1 && data.points.length % 2 === 1;
          return (
            <li
              key={point.text}
              className={
                "group/tile flex items-start gap-3 rounded-[6px] bg-[#f4efe7] p-4 ring-1 ring-inset ring-[#141414]/[0.08] transition-colors duration-300 hover:bg-white" +
                (last ? " sm:col-span-2" : "")
              }
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-white text-[#f97316] ring-1 ring-inset ring-[#141414]/[0.07] transition-colors duration-300 group-hover/tile:bg-[#f97316] group-hover/tile:text-white">
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
              Our Vision and <Accent>Mission</Accent>
            </>
          }
          description="We help devtool, AI, and open-source teams earn developer trust with technical content and DevRel programs that grow with the product."
        />

        <div className="relative isolate mt-10 grid grid-cols-1 gap-3 md:mt-12 md:grid-cols-2">
          <ContentBlock
            data={contentData.vision}
            index={0}
            lede="Technical content and DevRel that engineers write, test, and stand behind."
          />
          <ContentBlock
            data={contentData.mission}
            index={1}
            lede="Help devtool, AI, and open-source teams turn product depth into developer adoption."
          />
        </div>
      </Container>
    </PaperSection>
  );
};
