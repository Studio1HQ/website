"use client";

import { Container, Rise } from "@/components/home/ui";
import { CELL, MUTED, PaperSection } from "@/components/paper/paper-sections";
import {
  PaperChip,
  ServiceHead,
} from "@/components/pages/shared/paper-service-kit";
import { PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";

const formats = [
  {
    number: "01",
    meta: "Tutorials",
    title: "Long-form tutorials",
    detail:
      "Step-by-step videos that walk developers through a real workflow in your product.",
  },
  {
    number: "02",
    meta: "Demos",
    title: "Product deep dives",
    detail:
      "Feature demos and architecture explainers for people deciding whether to adopt you.",
  },
  {
    number: "03",
    meta: "Shorts",
    title: "Shorts and cutdowns",
    detail:
      "Short clips from the long videos, made to get new viewers into the full watch.",
  },
  {
    number: "04",
    meta: "Series",
    title: "Channel series",
    detail:
      "A repeating show with a clear topic each episode, so people know when to come back.",
  },
];

export default function Formats({ index = 5 }: { index?: number }) {
  return (
    <PaperSection id="formats" tone="paper" className="scroll-mt-28">
      <Container>
        <ServiceHead
          index={index}
          name="Formats"
          title="The videos we make most often"
          description="Pick what fits your product and audience. We can support scripting, editing, packaging, and upload-ready assets."
        />

        <ul
          role="list"
          aria-label="Video formats"
          className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        >
          {formats.map((format, position) => (
            <li key={format.title} className="min-w-0">
              <Rise delay={position * 0.06} className="h-full">
                <div
                  className={cn("flex h-full min-h-[260px] flex-col p-6", CELL)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="text-[40px] font-medium leading-none tabular-nums tracking-[-0.05em]"
                      style={{ color: PRINT }}
                    >
                      {format.number}
                    </span>
                    <PaperChip>{format.meta}</PaperChip>
                  </div>
                  <h3 className="mt-auto pt-10 text-[20px] font-medium tracking-[-0.03em] md:text-[22px]">
                    {format.title}
                  </h3>
                  <p className={cn("mt-2.5 text-[15px] leading-[1.6]", MUTED)}>
                    {format.detail}
                  </p>
                </div>
              </Rise>
            </li>
          ))}
        </ul>
      </Container>
    </PaperSection>
  );
}
