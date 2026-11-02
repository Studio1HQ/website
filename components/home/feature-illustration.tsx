"use client";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@wrksz/themes/client";
import UserAvatarCollection from "@/components/landing/user-avatar-collection";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { CollaborationIllustration } from "@/components/collaboration-illustration";
import SupportIllustration from "@/components/support-illustration";
import DarkExpertiseIllustration from "@/components/ui/svgs/dark-expertise-illustration";
import LightExpertiseIllustration from "@/components/ui/svgs/light-expertise-illustration";
import DisplayCards from "@/components/landing/display-cards";
import { BarChart, PenTool, Users } from "lucide-react";
import { ComparisonMetric } from "@/components/comparison-metric";
import { Num } from "@/components/ui/num";

interface FeatureIllustrationProps {
  title: string;
  /** Render theme-aware artwork in its dark variant (for always-dark sections). */
  forceDark?: boolean;
}

function ExpertiseIllustration({
  className,
  forceDark = false,
}: {
  className: string;
  forceDark?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render a placeholder with the same dimensions during SSR to avoid layout shift
  if (!mounted) {
    return <div className={className} />;
  }

  return forceDark || resolvedTheme === "dark" ? (
    <DarkExpertiseIllustration className={className} />
  ) : (
    <LightExpertiseIllustration className={className} />
  );
}

const defaultCards = [
  {
    icon: <BarChart className="size-4 text-primary" />, // Analytics & growth
    title: "Community Growth",
    description: "1500+ developers engaged through our initiatives",
    date: "Updated Weekly",
    iconClassName: "text-primary",
    titleClassName:
      "text-primary transition-colors duration-300 hover:text-primary",
    className:
      "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    icon: <PenTool className="size-4 text-primary" />, // Content & writing
    title: "Content Impact",
    description: "2M+ content views and growing",
    date: "Quick Insights",
    iconClassName: "text-primary",
    titleClassName:
      "text-primary transition-colors duration-300 hover:text-primary",
    className:
      "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    icon: <Users className="size-4 text-primary" />, // DevRel success
    title: "DevRel Success",
    description: "35+ partnerships & collaborations",
    date: "Updated", // replaced with month/year in ResultsFeatureCards
    iconClassName: "text-primary",
    titleClassName:
      "text-primary transition-colors duration-300 hover:text-primary",
    className:
      "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10",
  },
];

function ResultsFeatureCards() {
  const cards = useMemo(() => {
    const monthYear = new Date().toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
    return defaultCards.map((card, index) =>
      index === 2
        ? { ...card, date: `Updated ${monthYear}` }
        : card,
    );
  }, []);

  return <DisplayCards cards={cards} />;
}

export function FeatureIllustration({
  title,
  forceDark = false,
}: FeatureIllustrationProps) {
  const normalizedTitle = title.toLowerCase();

  switch (normalizedTitle) {
    case "quality":
      return (
        <ComparisonMetric className="absolute bottom-[0rem] md:bottom-[-3rem] left-1/2 -translate-x-1/2 size-[12rem] md:size-[22rem]" />
        // <SemiCircularGraph className="absolute bottom-[-5rem] md:bottom-[-5rem] left-1/2 -translate-x-1/2 size-[12rem] md:size-[22rem]" />
      );
    case "experience":
      return (
        <div className="absolute flex flex-col items-center justify-center bottom-[2rem] left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2">
            <NumberTicker
              value={2000}
              className="whitespace-pre-wrap text-8xl font-medium tracking-tighter text-primary dark:text-primary"
            />
            <p className="text-6xl font-medium font-numeric tabular-nums tracking-tighter text-primary">
              <Num>k+</Num>
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            Total content views
          </div>
        </div>
      );
    case "expertise":
      return (
        <ExpertiseIllustration
          forceDark={forceDark}
          className="absolute bottom-[-5rem] md:-bottom-[5rem] left-1/2 size-80 -translate-x-1/2"
        />
      );
    case "support":
      return (
        <SupportIllustration className="absolute bottom-14 left-1/2 w-full -translate-x-1/2" />
      );
    case "results":
      return (
        // <Graph className="absolute bottom-[-3rem] left-1/2 -translate-x-1/2 size-60" />
        <div className="absolute bottom-[-3rem] left-1/2 -translate-x-1/2 size-60 max-w-3xl">
          <ResultsFeatureCards />
        </div>
      );
    case "collaboration":
      return (
        <CollaborationIllustration className="absolute bottom-[3rem] left-1/2 w-full -translate-x-1/2" />
      );
    case "testimonials":
      return <UserAvatarCollection />;
    default:
      return null;
  }
}
