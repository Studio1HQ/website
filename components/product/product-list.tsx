"use client";

import ProductCard, {
  type ProductCardData,
} from "@/components/product/product-card";
import { motion, useReducedMotion } from "motion/react";
import { containerVariants } from "@/lib/animations";

export default function ProductList({
  products,
}: {
  products: ProductCardData[];
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="mx-auto flex w-full min-w-0 flex-col gap-2"
      initial={reduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.name}
          product={product}
          index={index}
          reverse={index % 2 === 1}
        />
      ))}
    </motion.div>
  );
}
