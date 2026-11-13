import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** `pnpm test`: unit tests next to their sources (*.test.ts). */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // `server-only` throws outside a server build; tests get an empty module.
      "server-only": fileURLToPath(new URL("./lib/test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["{app,lib,components}/**/*.test.ts"],
  },
});
