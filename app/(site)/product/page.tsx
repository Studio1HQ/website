import { products } from "@/constants/products";
import ProductHero from "@/components/product/product-hero";
import ProductList from "@/components/product/product-list";
import ProductPipelineCard from "@/components/product/product-pipeline-card";
import { Container } from "@/components/home/ui";
import { PaperSection } from "@/components/paper/paper-sections";
import { softwareApplicationJsonLd } from "@/lib/seo";
import { PAPER_SCOPE } from "@/lib/paper";

const shipped = products
  .filter((p) => p.status !== "upcoming")
  .map(
    ({
      name,
      tagline,
      description,
      highlights,
      url,
      category,
      statusLabel,
      media,
    }) => ({
      name,
      tagline,
      description,
      highlights,
      url,
      category,
      statusLabel,
      media,
    }),
  );

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
          <ProductList products={shipped} />
          <div className="mt-2">
            <ProductPipelineCard />
          </div>
        </Container>
      </PaperSection>
    </main>
  );
}
