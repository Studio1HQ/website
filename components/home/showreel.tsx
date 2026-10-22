"use client";

import Image from "next/image";
import { Marquee } from "@/components/ui/marquee";
import { trustedbyLogo } from "@/constants/data";
import { cn } from "@/lib/utils";
import { whiteLogo } from "@/lib/white-logos";
import { Container, LinedLabel, Rise } from "./ui";

/** Real Studio1 work, split into columns that drift in opposite directions. */
const COLUMNS = [
  [
    "/case-studies/jozu/kubecon-jozu-booth.webp",
    "/case-studies/tensorlake/Toon-blog.webp",
    "/case-studies/nebius/workshop-dublin-poster.webp",
  ],
  [
    "/case-studies/brightdata/brightdata-homepage.webp",
    "/case-studies/nebius/meetup-talk.webp",
    "/case-studies/corsair/slideflow-demo.webp",
  ],
  [
    "/case-studies/jozu/devfest-jozu-booth.webp",
    "/case-studies/tensorlake/tensorlake-home.webp",
    "/case-studies/nebius/workshop-dublin-recap.webp",
  ],
  [
    "/case-studies/corsair/corsair-homepage.webp",
    "/case-studies/jozu/kubecon-jozu-team.webp",
    "/case-studies/brightdata/docs-deep-research-architecture.webp",
  ],
];

export default function Showreel() {
  return (
    <section
      className="relative text-white"
      style={{
        background:
          "linear-gradient(180deg, #1c0d07 0%, #4a1a0a 30%, #9a3412 70%, #c2410c 100%)",
      }}
    >
      <Container className="pb-24 pt-6 md:pb-32">
        <Rise>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-black shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10 sm:aspect-[16/10] lg:aspect-[16/8]">
            <div className="absolute inset-0 grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4">
              {COLUMNS.map((column, index) => (
                <div
                  key={index}
                  className={cn(
                    "relative overflow-hidden",
                    index === 2 && "hidden sm:block",
                    index === 3 && "hidden lg:block",
                  )}
                >
                  <Marquee
                    vertical
                    fade={false}
                    repeat={3}
                    reverse={index % 2 === 1}
                    className="h-full p-0 [--duration:46s] [--gap:0.75rem]"
                  >
                    {column.map((src) => (
                      <div
                        key={src}
                        className="relative aspect-[4/3] w-full overflow-hidden rounded-xl"
                      >
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes="(min-width:1024px) 320px, 50vw"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </Marquee>
                </div>
              ))}
            </div>
            {/* Vignette */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.65)_100%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent"
            />
          </div>
        </Rise>

        <Rise className="mt-16 md:mt-20">
          <LinedLabel>Trusted by 35+ devtool and SaaS teams</LinedLabel>
        </Rise>

        <div className="mt-10 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <Marquee
            fade={false}
            pauseOnHover
            className="[--duration:60s] [--gap:0rem]"
          >
            {trustedbyLogo.map((item) => {
              const { src, filter } = whiteLogo(item);
              return (
                <div
                  key={item.name}
                  className="flex h-12 w-44 items-center justify-center opacity-80 transition-opacity duration-300 hover:opacity-100"
                >
                  {item.showNameBeside ? (
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "relative size-8 shrink-0",
                          item.className,
                        )}
                      >
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes="40px"
                          className={cn("object-contain", filter)}
                        />
                      </div>
                      <span className="truncate text-[17px] font-medium tracking-[-0.03em]">
                        {item.name}
                      </span>
                    </div>
                  ) : (
                    <Image
                      src={src}
                      alt={item.name}
                      width={220}
                      height={72}
                      sizes="150px"
                      className={cn(
                        "h-auto max-h-8 w-auto max-w-36 object-contain",
                        filter,
                      )}
                      style={{ width: "auto", height: "auto" }}
                    />
                  )}
                </div>
              );
            })}
          </Marquee>
        </div>
      </Container>
    </section>
  );
}
