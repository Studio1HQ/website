"use client";

import { Container, Rise } from "@/components/home/ui";
import { CELL, MUTED, PaperSection } from "@/components/paper/paper-sections";
import { ServiceHead } from "@/components/pages/shared/paper-service-kit";
import { INK, PRINT } from "@/lib/paper";
import { cn } from "@/lib/utils";
import {
  IconCalendarEvent,
  IconListCheck,
  IconMessageCircle,
} from "@tabler/icons-react";

const loop = [
  {
    icon: IconCalendarEvent,
    title: "Plan the topic flow",
    body: "Decide the topic, demo path, supporting assets, and publish sequence before production starts.",
  },
  {
    icon: IconListCheck,
    title: "Ship with context",
    body: "Package the video with the right title, description, chapters, links, and supporting posts.",
  },
  {
    icon: IconMessageCircle,
    title: "Use product questions",
    body: "Developer questions, release notes, and product feedback help decide what the next video should explain.",
  },
];

export default function Cadence({ index = 6 }: { index?: number }) {
  return (
    <PaperSection id="process" tone="paper" className="scroll-mt-28">
      <Container>
        <ServiceHead
          index={index}
          name="Video workflow"
          title="Repeatable video work beats"
          accent="one-off drops"
          description="We turn product topics into clear videos, supporting clips, and publish-ready assets when your team needs them."
        />

        <ol className="mt-10 grid gap-2 md:grid-cols-3">
          {loop.map((step, position) => (
            <li key={step.title} className="relative">
              <Rise delay={position * 0.08} className="h-full">
                <div
                  className={cn(
                    "flex h-full flex-col items-start p-6 md:p-7",
                    CELL,
                  )}
                >
                  <span
                    className="flex size-12 items-center justify-center text-[#f4efe7]"
                    style={{ background: position === 0 ? PRINT : INK }}
                  >
                    <step.icon
                      className="size-6"
                      stroke={1.6}
                      aria-hidden="true"
                    />
                  </span>
                  <p
                    className="mt-6 text-[13px] font-medium"
                    style={{ color: PRINT }}
                  >
                    Step {position + 1}
                  </p>
                  <h3 className="mt-1.5 text-[22px] font-medium tracking-[-0.035em]">
                    {step.title}
                  </h3>
                  <p className={cn("mt-3 text-[15px] leading-[1.6]", MUTED)}>
                    {step.body}
                  </p>
                </div>
              </Rise>
            </li>
          ))}
        </ol>
      </Container>
    </PaperSection>
  );
}
