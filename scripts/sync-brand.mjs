// Builds the Studio1 brand page (the "assets" repo: Studio1 Sans, the design
// system and downloads) and publishes it at /brand on this site, unchanged.
//
//   node scripts/sync-brand.mjs "../../fantastic 4/assets"
//
// Run it again whenever the assets repo changes.
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const source = path.resolve(process.argv[2] ?? "../assets");
const out = path.resolve("public/brand");
const BASE = "/brand/";

if (!existsSync(path.join(source, "package.json"))) {
  console.error(`No assets repo at ${source}`);
  process.exit(1);
}

execSync(`npx vite build --base ${BASE} --outDir "${out}" --emptyOutDir`, {
  cwd: source,
  stdio: "inherit",
  env: { ...process.env, SITE_URL: "https://www.studio1hq.com/brand" },
});

// Vite prefixes the base on assets it bundles, but not on plain links to
// files in public/ (downloads, manifest icons). Point those at /brand too.
const html = path.join(out, "index.html");
writeFileSync(
  html,
  readFileSync(html, "utf8").replaceAll(
    'href="/downloads/',
    `href="${BASE}downloads/`,
  ),
);
const manifest = path.join(out, "site.webmanifest");
writeFileSync(
  manifest,
  readFileSync(manifest, "utf8")
    .replaceAll('"src": "/', `"src": "${BASE}`)
    .replace('"start_url": "/"', `"start_url": "${BASE}"`),
);

// The main site has its own robots.txt and sitemap.
for (const file of ["robots.txt", "sitemap.xml"]) {
  rmSync(path.join(out, file), { force: true });
}

// The design system's source of truth, for people and AI tools to read.
cpSync(path.join(source, "design-system"), path.join(out, "design-system"), {
  recursive: true,
});

console.log(`Brand page published to ${path.relative(process.cwd(), out)}`);
