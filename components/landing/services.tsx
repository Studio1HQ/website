"use client";
import { Pen, Users } from "@phosphor-icons/react";
import Link from "next/link";
import { motion } from "motion/react";
import { staggerChildren, serviceItemVariants } from "@/lib/animations";
import { Num } from "@/components/ui/num";
import { Badge } from "../ui/badge";
import { SectionEyebrow } from "./section-eyebrow";
import {
  elevatedCardShadow,
  servicesCenterGlow,
  servicesSectionGlowBottom,
  servicesSectionGlowTop,
  serviceCardHoverGlow,
} from "@/lib/shadows";
import { HeroStatsStrip } from "@/components/ui/hero-stats-strip";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function Services() {
  const t = useTranslations("HomeServices");

  return (
    <>
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerChildren}
        id="services"
        className=" mb-28 px-4 pt-4 md:pt-6 pb-20 relative"
      >
        <div className={servicesSectionGlowBottom}></div>
        <div className={servicesSectionGlowTop}></div>
        <motion.div
          variants={serviceItemVariants}
          className="w-full z-[20] mb-12 md:mb-16"
        >
          <HeroStatsStrip
            highlightValues
            className="max-w-5xl"
            stats={[
              { value: "3M+", label: t("stats.views") },
              { value: "35+", label: t("stats.companies") },
              { value: "40+", label: t("stats.events") },
            ]}
          />
        </motion.div>
        <motion.div
          variants={serviceItemVariants}
          className="flex flex-col z-[20] items-center gap-4 justify-center"
        >
          <SectionEyebrow>{t("eyebrow")}</SectionEyebrow>
          <div className="text-5xl max-sm:text-4xl font-normal text-center">
            {t("title")}
          </div>
          <p className="text-center text-base max-sm:text-sm mt-2 max-w-2xl">
            {t("description")}
          </p>
        </motion.div>
        <div className="flex flex-col max-w-7xl mx-auto">
          <motion.div
            variants={serviceItemVariants}
            className="flex relative items-center gap-[2%] w-full mt-20 justify-center md:-space-x-20 flex-col md:flex-row md:pb-20"
          >
            <Link
              href={"/technical-content-marketing"}
              className={cn(
                "border-2 dark:border transition-all duration-700 hover:-translate-y-4 h-[30rem] relative w-full max-w-[23rem] group rounded-[6px] overflow-hidden flex flex-col items-start bg-background/80 backdrop-blur-md justify-start p-8 mb-8 md:mb-0",
                elevatedCardShadow,
              )}
            >
              <div className="absolute top-[-23rem] z-[101] delay-100 rotate-45 left-[-2rem] group-hover:top-[15rem] group-hover:left-[20rem] transition-all blur-[3em] duration-700 rounded-md h-[40rem] bg-white/50 opacity-30 w-[5rem] backdrop-blur-md"></div>

              <div className={serviceCardHoverGlow}></div>

              <div className="flex-1 flex items-start justify-between w-full">
                <div className="flex items-center bg-accent dark:bg-accent/50 justify-center size-16 p-3 rounded-[6px]">
                  <Pen className="size-10" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 flex-wrap">
                  <Badge className="w-fit bg-accent text-foreground">
                    <Num>3M+</Num> {t("cards.content.badgeOne")}
                  </Badge>
                  <Badge className="w-fit bg-accent text-foreground">
                    <Num>30+</Num> {t("cards.content.badgeTwo")}
                  </Badge>
                </div>
                <p className="text-4xl font-light text-left">
                  <span className="text-transparent bg-clip-text bg-gradient-to-br font-extrabold from-white via-primary/80 to-white dark:from-white dark:via-primary/80 dark:to-white">
                    {t("cards.content.titleStrong")}
                  </span>{" "}
                  {t("cards.content.titleRest")}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("cards.content.description")}
                </p>
              </div>
            </Link>

            <Link
              href={"/developer-relations-growth-campaigns"}
              className={cn(
                "border-2 dark:border transition-all duration-700 hover:translate-y-4 relative overflow-hidden group flex flex-col items-start p-8 bg-background/80 backdrop-blur-2xl h-[30rem] w-full  max-w-[23rem] md:translate-y-20 rounded-[6px]",
                elevatedCardShadow,
              )}
            >
              <div className="absolute top-[-23rem] z-[101] rotate-45 delay-100 left-[-2rem] group-hover:top-[15rem] group-hover:left-[20rem] transition-all blur-[3em] duration-700 rounded-md h-[40rem] bg-white/50 opacity-30 w-[5rem] backdrop-blur-md"></div>

              <div className={serviceCardHoverGlow}></div>

              <div className="flex-1 flex items-start justify-between w-full">
                <div className="flex items-center bg-accent dark:bg-accent/50 justify-center size-16 p-3 rounded-[6px]">
                  <Users className="size-10" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 flex-wrap">
                  <Badge className="w-fit bg-accent text-foreground">
                    <Num>10+</Num> {t("cards.growth.badgeOne")}
                  </Badge>
                  <Badge className="w-fit bg-accent text-foreground">
                    <Num>5+</Num> {t("cards.growth.badgeTwo")}
                  </Badge>
                </div>
                <p className="text-4xl font-light text-left">
                  <span className="text-transparent bg-clip-text bg-gradient-to-br font-extrabold from-white via-primary/80 to-white dark:from-white dark:via-primary/80 dark:to-white">
                    {t("cards.growth.titleStrong")}
                  </span>{" "}
                  {t("cards.growth.titleRest")}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("cards.growth.description")}
                </p>
              </div>
            </Link>
            <div className={servicesCenterGlow}></div>
          </motion.div>
        </div>
      </motion.section>
    </>
  );
}
