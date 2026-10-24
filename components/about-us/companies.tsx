"use client";
import { companies } from "@/data/companies";
import Image from "next/image";
import { motion } from "motion/react";
import Link from "next/link";
import { SectionIntro } from "@/components/home/ui";
import { cn } from "@/lib/utils";

export const Companies = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="relative"
    >
      <div className="pb-24 pt-8 md:pb-32">
        <SectionIntro
          className="mb-14 md:mb-16"
          title="Partnered"
          accent="Companies"
          description="We empower tech brands to build thriving developer communities through DevRel and high-impact content."
        />

        <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {companies.map((item, index) => {
            const logoVariant =
              "logoVariant" in item ? item.logoVariant : undefined;
            const logoDarkImage =
              "logoDarkImage" in item ? item.logoDarkImage : undefined;
            const logoClassName =
              "logoClassName" in item ? item.logoClassName : undefined;
            const logoImageClassName = cn(
              logoVariant === "wide"
                ? "object-contain dark:brightness-125"
                : "rounded-lg object-contain",
              logoClassName,
            );

            return (
              <Link
                href={item.href}
                key={`${item.name}-${index}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <div
                  className="s1-glass-card flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[18px] px-3 py-5 transition-transform duration-300 group-hover:-translate-y-1 sm:py-6"
                >
                  <div
                    className={
                      logoVariant === "wide"
                        ? "relative h-12 w-28 shrink-0 sm:h-14 sm:w-36"
                        : "relative size-12 shrink-0 sm:size-14"
                    }
                  >
                    {logoDarkImage ? (
                      <>
                        <Image
                          className={cn(logoImageClassName, "dark:hidden")}
                          src={item.image}
                          fill
                          sizes={logoVariant === "wide" ? "144px" : "56px"}
                          alt={item.name}
                        />
                        <Image
                          className={cn(logoImageClassName, "hidden dark:block")}
                          src={logoDarkImage}
                          fill
                          sizes={logoVariant === "wide" ? "144px" : "56px"}
                          alt={item.name}
                        />
                      </>
                    ) : (
                      <Image
                        className={logoImageClassName}
                        src={item.image}
                        fill
                        sizes={logoVariant === "wide" ? "144px" : "56px"}
                        alt={item.name}
                      />
                    )}
                  </div>
                  <div className="line-clamp-2 text-center text-sm font-medium leading-snug text-[var(--home-ink)]">
                    {item.name}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
