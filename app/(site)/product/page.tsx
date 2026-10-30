import { getTranslations } from "next-intl/server";
import { products } from "@/constants/products";
import ProductHero from "@/components/product/product-hero";
import RaahChapter from "@/components/product/raah-chapter";
import AssetSnipChapter from "@/components/product/assetsnip-chapter";
import WhyWeBuild from "@/components/product/why-we-build";
import NextProduct from "@/components/product/next-product";
import { PaperCta } from "@/components/paper/paper-sections";
import { softwareApplicationJsonLd } from "@/lib/seo";
import { PAPER_SCOPE } from "@/lib/paper";

export default async function ProductPage() {
  const t = await getTranslations("ProductPage.cta");
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
      <RaahChapter index={1} />
      <AssetSnipChapter index={2} />
      <WhyWeBuild index={3} />
      <NextProduct index={4} />
      <PaperCta index={5} title={t("title")} description={t("description")} />
    </main>
  );
}
