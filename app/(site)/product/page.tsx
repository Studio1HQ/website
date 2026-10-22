import { products } from "@/constants/products";
import ProductHero from "@/components/product/product-hero";
import ProductList from "@/components/product/product-list";
import ProductPipelineCard from "@/components/product/product-pipeline-card";
import { softwareApplicationJsonLd } from "@/lib/seo";

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
    <main className="relative overflow-x-clip bg-[var(--home-cream)] text-[var(--home-ink)]">
      {productSchemas.map((schema) => (
        <script
          key={schema.name as string}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <ProductHero />

      <section className="relative px-4 pb-24 sm:px-6 md:pb-32 lg:px-8">
        <div className="mx-auto -mt-16 max-w-[1300px] md:-mt-20">
          <ProductList products={shipped} />
          <div className="mt-5 sm:mt-6 md:mt-8">
            <ProductPipelineCard />
          </div>
        </div>
      </section>
    </main>
  );
}
