"use client";

import ProductCard, {
  type ProductCardData,
} from "@/components/product/product-card";
import { motion } from "motion/react";
import { containerVariants } from "@/lib/animations";

export default function ProductList({ products }: { products: ProductCardData[] }) {
  return (
    <motion.div
      className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-5 sm:gap-6 md:gap-8"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.name}
          product={product}
          reverse={index % 2 === 1}
        />
      ))}
    </motion.div>
  );
}
