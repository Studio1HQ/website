"use client";

import { Container, Rise, SectionIntro } from "@/components/home/ui";
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

export default function Cadence() {
  return (
    <section id="process" className="relative scroll-mt-28 py-24 md:py-32">
      <Container>
        <Rise>
          <SectionIntro
            eyebrow="Video workflow"
            title="Repeatable video work beats"
            accent="one-off drops"
            description="We turn product topics into clear videos, supporting clips, and publish-ready assets when your team needs them."
          />
        </Rise>

        <ol className="mt-14 grid gap-5 md:mt-16 md:grid-cols-3">
          {loop.map((step, index) => (
            <li key={step.title}>
              <Rise delay={index * 0.08} className="h-full">
                <div className="s1-glass-card flex h-full flex-col rounded-[24px] p-7 md:p-8">
                  <span className="s1-glass-dark flex size-14 items-center justify-center rounded-full text-white">
                    <step.icon className="size-6" stroke={1.6} aria-hidden="true" />
                  </span>
                  <p className="mt-5 text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--home-ink-soft)]">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-2 text-[22px] font-medium tracking-[-0.03em] text-[var(--home-ink)]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.6] text-[var(--home-ink-soft)]">{step.body}</p>
                </div>
              </Rise>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
