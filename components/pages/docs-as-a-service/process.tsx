"use client";

import { Container } from "@/components/home/ui";
import { PaperSection } from "@/components/paper/paper-sections";
import { PaperServiceProcess } from "@/components/pages/shared/paper-service-kit";
import { docsAsServiceProcess } from "@/data/service-processes";

export default function Process({ index = 4 }: { index?: number }) {
  return (
    <PaperSection id="process" tone="paper" className="scroll-mt-28">
      <Container>
        <PaperServiceProcess
          index={index}
          steps={docsAsServiceProcess}
          title="How We Deliver"
          accent="Developer-First Docs"
          description="A structured audit-to-implementation process built for fast-moving product and platform teams."
        />
      </Container>
    </PaperSection>
  );
}
