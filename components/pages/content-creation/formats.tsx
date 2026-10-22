"use client";

import { Container, Rise, SectionIntro } from "@/components/home/ui";

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

export default function Formats() {
  return (
    <section id="formats" className="relative scroll-mt-28 py-24 md:py-32">
      <Container>
        <Rise>
          <SectionIntro
            eyebrow="Formats"
            title="The videos we make most often"
            description="Pick what fits your product and audience. We can support scripting, editing, packaging, and upload-ready assets."
          />
        </Rise>

        <ul
          role="list"
          aria-label="Video formats"
          className="mt-14 grid gap-5 sm:grid-cols-2 md:mt-16"
        >
          {formats.map((format, index) => (
            <li key={format.title} className="min-w-0">
              <Rise delay={index * 0.06} className="h-full">
                <div className="s1-glass-card flex h-full flex-col rounded-[24px] p-7">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-numeric text-[44px] font-medium leading-none tracking-[-0.04em] text-primary tabular-nums">
                      {format.number}
                    </span>
                    <span className="rounded-full border border-[var(--home-line)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--home-ink-soft)]">
                      {format.meta}
                    </span>
                  </div>
                  <h3 className="mt-10 text-[22px] font-medium tracking-[-0.03em] text-[var(--home-ink)]">
                    {format.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.6] text-[var(--home-ink-soft)]">
                    {format.detail}
                  </p>
                </div>
              </Rise>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
