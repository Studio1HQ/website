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
import { Container } from "@/components/home/ui";
import {
  Accent,
  IndexBar,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";
import { INK, PRINT } from "@/lib/paper";
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

/** Paper card: white sheet, hairline ring, a soft lift on hover. */
const cardSurface = cn(
  "group relative isolate h-full overflow-hidden rounded-[6px] bg-white p-7 shadow-[inset_0_1px_0_#fff] ring-1 ring-inset ring-[#141414]/[0.08] transition-[transform,box-shadow,background-color] duration-500 ease-out hover:-translate-y-1 hover:bg-white hover:shadow-[inset_0_1px_0_#fff,0_24px_40px_-28px_rgba(20,20,20,0.45)] motion-reduce:transform-none md:p-9",
);

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
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      className={cardSurface}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: 0.08 * index, ease: "easeOut" }}
    >
      {/* Orange hairline along the top edge */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${PRINT}, transparent)`,
        }}
      />

      <div className="relative z-10 flex h-full flex-col gap-7">
        <header className="flex items-center gap-3.5">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-[6px] text-[#f4efe7] transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            style={{ background: index === 1 ? PRINT : INK }}
            aria-hidden
          >
            <HeaderIcon weight="regular" className="size-6" />
          </span>
          <h3 className="text-[24px] font-medium tracking-[-0.035em] text-[#141414] md:text-[28px]">
            {data.title}
          </h3>
          <span
            aria-hidden
            className="ml-auto text-[28px] font-medium leading-none tracking-[-0.05em] tabular-nums text-[#141414]/20 md:text-[34px]"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        </header>

        <ul className="flex flex-col border-t border-[#141414]/[0.12]">
          {data.points.map((point, pointIndex) => {
            const PointIcon = point.icon;
            return (
              <motion.li
                key={point.text}
                className="flex items-start gap-3 border-b border-[#141414]/[0.08] py-3.5 last:border-b-0 last:pb-0"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: 0.1 + pointIndex * 0.04,
                  duration: 0.35,
                  ease: "easeOut",
                }}
              >
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-[#fbfaf7] shadow-[inset_0_2px_5px_rgba(20,20,20,0.10),inset_0_1px_1px_rgba(20,20,20,0.08),inset_0_-1px_0_#fff,0_1px_0_rgba(255,255,255,0.95)]"
                >
                  <PointIcon
                    weight="duotone"
                    className="size-4"
                    style={{ color: PRINT }}
                  />
                </span>
                <p className="pt-0.5 text-[15px] leading-relaxed text-[#141414]/[0.68]">
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

        <div className="mt-10 grid grid-cols-1 gap-2 md:mt-12 md:grid-cols-2">
          <ContentBlock data={contentData.vision} index={0} />
          <ContentBlock data={contentData.mission} index={1} />
        </div>
      </Container>
    </PaperSection>
  );
};
