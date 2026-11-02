"use client";

import { Container } from "@/components/home/ui";
import { PaperSection } from "@/components/paper/paper-sections";
import { PaperServiceProcess } from "@/components/pages/shared/paper-service-kit";
import { blogAsServiceProcess } from "@/data/service-processes";

export default function Process({ index = 4 }: { index?: number }) {
  return (
    <PaperSection id="process" tone="paper" className="scroll-mt-28">
      <Container>
        <PaperServiceProcess
          index={index}
          steps={blogAsServiceProcess}
          title="How We Deliver"
          accent="Developer-First Content"
          description="A transparent, collaborative content process built for fast-moving SaaS and devtool teams."
        />
      </Container>
    </PaperSection>
  );
}
