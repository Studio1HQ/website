"use client";
import React from "react";
import { SectionIntro } from "@/components/home/ui";
import { ProcessScroller } from "@/components/sections/process-scroller";
import { devRelAsServiceProcess } from "@/data/service-processes";
import {
  serviceProcessInnerClassName,
  serviceProcessOuterClassName,
} from "@/components/pages/shared/service-hero-layout";

export default function Process() {
  return (
    <div
      id="process"
      className={`${serviceProcessOuterClassName} mt-12 pt-12 pb-6 sm:pt-10 sm:pb-8`}
    >
      <div
        className={`${serviceProcessInnerClassName} flex flex-col items-center`}
      >
        <ProcessScroller
          steps={devRelAsServiceProcess}
          heading={
            <SectionIntro
              title="How We Deliver"
              accent="Developer-First DevRel"
              description="A proven process designed for fast-moving product teams and developer-focused startups."
            />
          }
        />
      </div>
    </div>
  );
}
