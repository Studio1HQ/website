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
        <IndexBar index={4} name="Partnered companies" />
        <SectionHead
          title={
            <>
              Partnered <Accent>Companies</Accent>
            </>
          }
          description="We empower tech brands to build thriving developer communities through DevRel and high-impact content."
        />

        <div className="relative">
          <div
            className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-3 md:mt-12 md:grid-cols-4 lg:grid-cols-5"
            style={{
              maskImage:
                "linear-gradient(to top, transparent 0px, black 220px)",
              WebkitMaskImage:
                "linear-gradient(to top, transparent 0px, black 220px)",
            }}
          >
            {/* Full rows only (5 across), so the fade ends cleanly */}
            {companies
              .slice(0, companies.length - (companies.length % 5))
              .map((item, index) => {
                const logoVariant =
                  "logoVariant" in item ? item.logoVariant : undefined;
                const logoClassName =
                  "logoClassName" in item ? item.logoClassName : undefined;
                const logoImageClassName = cn(
                  logoVariant === "wide"
                    ? "object-contain mix-blend-multiply"
                    : "rounded-lg object-contain mix-blend-multiply",
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
        </div>

        {/* The list fades out, then invites the next partner */}
        <div className="relative mt-4 flex flex-col items-center text-center">
          <p className="text-[26px] font-medium leading-[1.1] tracking-[-0.04em] text-[#141414] md:text-[34px]">
            Your company could be <Accent>next</Accent>
          </p>
          <p className="mt-2 max-w-[440px] text-[15px] leading-[1.6] text-[#141414]/60">
            Collaborate with Studio1 on content, docs and DevRel that developers
            trust.
          </p>
          <a
            href="https://cal.com/studio1/collab"
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-6 inline-flex h-12 items-center gap-3 rounded-full bg-[#141414] py-1.5 pl-6 pr-1.5 text-[15px] font-medium text-[#f4efe7] shadow-[0_14px_30px_-16px_rgba(20,20,20,0.6)] transition-transform duration-300 hover:-translate-y-0.5"
          >
            Book a call
            <span className="flex size-9 items-center justify-center rounded-full bg-[#f97316] text-white transition-transform duration-300 group-hover:rotate-45">
              <ArrowUpRight weight="bold" className="size-4" />
            </span>
          </a>
        </div>
      </Container>
    </PaperSection>
  );
};
