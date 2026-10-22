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
import { motion } from "motion/react";
import { Rise, SectionIntro } from "@/components/home/ui";
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

const cardSurface =
  "s1-glass-card group relative h-full rounded-[24px] p-7 md:p-9";

const ContentBlock = ({
  data,
  index,
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
}) => {
  const HeaderIcon = data.icon;

  return (
    <motion.article
      className={cardSurface}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: 0.08 * index, ease: "easeOut" }}
    >

      <div className="relative z-[1] flex h-full flex-col gap-7">
        <header className="flex items-center gap-3.5">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-lg",
              "s1-glass-dark rounded-2xl text-white",
              "transition-transform duration-500 ease-out group-hover:scale-110",
              "motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            )}
            aria-hidden
          >
            <HeaderIcon weight="regular" className="size-6" />
          </span>
          <h3 className="text-[26px] font-medium tracking-[-0.035em] text-[var(--home-ink)]">
            {data.title}
          </h3>
        </header>

        <div className="h-px w-full bg-[var(--home-line)]" />

        <ul className="flex flex-col gap-4">
          {data.points.map((point, pointIndex) => {
            const PointIcon = point.icon;
            return (
              <motion.li
                key={point.text}
                className="flex items-start gap-3"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: 0.1 + pointIndex * 0.04,
                  duration: 0.35,
                  ease: "easeOut",
                }}
              >
                <PointIcon
                  weight="regular"
                  className="mt-0.5 size-[1.125rem] shrink-0 text-primary"
                  aria-hidden
                />
                <p className="text-[15px] leading-relaxed text-[var(--home-ink-soft)]">
                  {point.text}
                </p>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </motion.article>
  );
};

export const VisionMission = () => {
  return (
    <section className="relative py-24 md:py-32">
      <Rise>
        <SectionIntro
          title="What"
          accent="Fuels Us?"
          description="We help SaaS teams build developer trust through high-impact content and DevRel strategy that scales with their product."
        />
      </Rise>

      <div className="mx-auto mt-14 grid max-w-[1100px] grid-cols-1 gap-5 md:mt-16 md:grid-cols-2">
        <ContentBlock data={contentData.vision} index={0} />
        <ContentBlock data={contentData.mission} index={1} />
      </div>
    </section>
  );
};
