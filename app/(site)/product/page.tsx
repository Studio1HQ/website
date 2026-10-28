import { products } from "@/constants/products";
import ProductHero from "@/components/product/product-hero";
import ProductShowcase from "@/components/product/product-showcase";
import ProductPipelineCard from "@/components/product/product-pipeline-card";
import { Container } from "@/components/home/ui";
import { PaperCta, PaperSection } from "@/components/paper/paper-sections";
import { softwareApplicationJsonLd } from "@/lib/seo";
import { PAPER_SCOPE } from "@/lib/paper";

export default function ProductPage() {
  const productSchemas = products
    .filter((p) => p.status !== "upcoming")
    .map((product) =>
      softwareApplicationJsonLd({
        name: product.name,
        description: product.description,
        url: product.url,
        category: product.category,
        statusLabel: product.statusLabel,
      }),
    );

  return (
    <main className="relative overflow-x-clip" style={PAPER_SCOPE}>
      {productSchemas.map((schema) => (
        <script
          key={schema.name as string}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <ProductHero />

      <PaperSection tone="paper" className="pb-24 pt-4 md:pb-32 md:pt-6">
        <Container>
          <ProductShowcase />
          <div className="mt-3">
            <ProductPipelineCard />
          </div>
        </Container>
      </PaperSection>
      <PaperCta />
    </main>
  );
}
