"use client";
import { companies } from "@/data/companies";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { Container } from "@/components/home/ui";
import {
  Accent,
  IndexBar,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";
import { cn } from "@/lib/utils";

/**
 * The paper sheet is always light, so theme-dependent logo tweaks from the
 * data (`dark:` classes) are dropped and the light logo is always shown.
 */
function lightOnly(className?: string) {
  return className
    ?.split(/\s+/)
    .filter((name) => name && !name.startsWith("dark:"))
    .join(" ");
}

export const Companies = () => {
  return (
    <PaperSection tone="paper" className="pb-20 pt-10 md:pb-24 md:pt-14">
      <Container>
        <IndexBar index={3} name="Partnered companies" />
        <SectionHead
          title={
            <>
              Partnered <Accent>Companies</Accent>
            </>
          }
          description="We empower tech brands to build thriving developer communities through DevRel and high-impact content."
        />

        <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-3 md:mt-12 md:grid-cols-4 lg:grid-cols-5">
          {companies.map((item, index) => {
            const logoVariant =
              "logoVariant" in item ? item.logoVariant : undefined;
            const logoClassName =
              "logoClassName" in item ? item.logoClassName : undefined;
            const logoImageClassName = cn(
              logoVariant === "wide"
                ? "object-contain"
                : "rounded-lg object-contain",
              lightOnly(logoClassName),
            );

            return (
              <Link
                href={item.href}
                key={`${item.name}-${index}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex h-full w-full flex-col items-center justify-center gap-3 rounded-[6px] bg-[#f8f6f2] px-3 pb-5 pt-6 shadow-[inset_0_5px_14px_rgba(20,20,20,0.13),inset_2px_0_8px_rgba(20,20,20,0.05),inset_0_1px_3px_rgba(20,20,20,0.12),inset_0_-2px_0_#fff,0_1px_0_#fff] transition-colors duration-300 hover:bg-white sm:pb-6 sm:pt-7"
              >
                <ArrowUpRight
                  aria-hidden
                  weight="bold"
                  className="absolute right-3 top-3 size-3.5 text-[#141414]/25 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#f97316]"
                />
                <div
                  className={
                    logoVariant === "wide"
                      ? "relative h-12 w-28 shrink-0 sm:h-14 sm:w-36"
                      : "relative size-12 shrink-0 sm:size-14"
                  }
                >
                  <Image
                    className={logoImageClassName}
                    src={item.image}
                    fill
                    sizes={logoVariant === "wide" ? "144px" : "56px"}
                    alt={item.name}
                  />
                </div>
                <div className="line-clamp-2 text-center text-[14px] font-medium leading-snug tracking-[-0.01em] text-[#141414]">
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </PaperSection>
  );
};
