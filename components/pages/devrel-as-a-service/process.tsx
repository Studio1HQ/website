"use client";

import { Container } from "@/components/home/ui";
import { PaperSection } from "@/components/paper/paper-sections";
import { PaperServiceProcess } from "@/components/pages/shared/paper-service-kit";
import { devRelAsServiceProcess } from "@/data/service-processes";

export default function Process({ index = 4 }: { index?: number }) {
  return (
    <PaperSection id="process" tone="paper" className="scroll-mt-28">
      <Container>
        <PaperServiceProcess
          index={index}
          steps={devRelAsServiceProcess}
          title="How We Deliver"
          accent="Developer-First DevRel"
          description="A proven process designed for fast-moving product teams and developer-focused startups."
        />
      </Container>
    </PaperSection>
  );
}
