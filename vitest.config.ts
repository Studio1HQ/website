import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** `pnpm test`: unit tests next to their sources (*.test.ts). */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["{app,lib,components}/**/*.test.ts"],
  },
});
