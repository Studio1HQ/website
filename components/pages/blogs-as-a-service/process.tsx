"use client";
import React from "react";
import { SectionIntro } from "@/components/home/ui";
import { ProcessScroller } from "@/components/sections/process-scroller";
import { blogAsServiceProcess } from "@/data/service-processes";
import {
  serviceProcessInnerClassName,
  serviceProcessOuterClassName,
} from "@/components/pages/shared/service-hero-layout";

export default function Process() {
  return (
    <div
      id="process"
      className={`${serviceProcessOuterClassName} pt-10 pb-6 sm:pt-8 sm:pb-8`}
    >
      <div
        className={`${serviceProcessInnerClassName} flex flex-col items-center`}
      >
        <ProcessScroller
          steps={blogAsServiceProcess}
          heading={
            <SectionIntro
              title="How We Deliver"
              accent="Developer-First Content"
              description="A transparent, collaborative content process built for fast-moving SaaS and devtool teams."
            />
          }
        />
      </div>
    </div>
  );
}
