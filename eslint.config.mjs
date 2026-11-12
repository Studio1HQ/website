import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * `pnpm lint`. Next 16 dropped `next lint`, so ESLint runs directly with
 * Next's own rules (React, hooks, accessibility basics, Core Web Vitals) and
 * its TypeScript rules. The rule choices below carry over from the old
 * .eslintrc.json, which ESLint 9 no longer reads.
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      // React Compiler advice. The site doesn't use the compiler, and calling
      // Date.now() in a server page is fine, so these only warn.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      // Some plain <a> links to site pages are deliberate (full page loads,
      // the screen-reader overview on the home page); worth a look, not a block.
      "@next/next/no-html-link-for-pages": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      // `_name` marks a value that is deliberately unused.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Static content: lists of <p> lines in page data. Keys there only
    // matter in development warnings.
    files: ["data/**"],
    rules: { "react/jsx-key": "warn" },
  },
  {
    // Node scripts run outside Next and may use require().
    files: ["scripts/**", "*.config.{js,cjs,mjs}"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    // Served as is (Decap's admin bundle, embeds, downloads).
    "public/**",
    // Tool folders and old material, not part of the site.
    ".claude/**",
    ".agents/**",
    ".commandcode/**",
    ".gstack/**",
    ".pnpm-store/**",
    "archive/**",
    "claude-audit/**",
    "brand/**",
  ]),
]);
