// Packs the Studio1 Connect browser extension (extension/connect).
//
//   pnpm extension:zip    public/downloads/studio1-connect.zip, the file the
//                         dashboard's Connections page offers. Everything sits
//                         in one studio1-connect/ folder, so it unzips tidily
//                         for "Load unpacked" (Chrome, Edge, Brave, Arc).
//   pnpm extension:store  extension/dist/studio1-connect-<version>-store.zip,
//                         the file to upload to the Chrome Web Store:
//                         manifest.json at the top of the zip (the store
//                         refuses it in a folder), and without the local dev
//                         addresses (localhost, dashboard.localhost), so the
//                         store build asks for the live dashboard only.
//
// Run the first after changing the extension. Before each store upload, raise
// "version" in extension/connect/manifest.json: the store needs it higher
// than the last one it accepted. A plain zip (stored, not compressed): no
// dependencies, and the files are small.

import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SOURCE = join(ROOT, "extension", "connect");
const STORE = process.argv.includes("--store");

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

/** True for an address only a local dev server answers. */
const isLocal = (pattern) => /^https?:\/\/([a-z0-9-]+\.)*localhost(:\d+)?\//i.test(pattern);

/** The store's manifest: the same, minus the local dev addresses. */
function storeManifest(source) {
  const manifest = JSON.parse(source);
  if (manifest.host_permissions) manifest.host_permissions = manifest.host_permissions.filter((pattern) => !isLocal(pattern));
  for (const script of manifest.content_scripts ?? []) script.matches = script.matches.filter((pattern) => !isLocal(pattern));
  return Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
}

/** 1 Jan 1980, the earliest valid zip date: a fixed one keeps builds identical, and an all-zero date trips some unzip tools. */
const DOS_DATE = (0 << 9) | (1 << 5) | 1;

function zip(entries) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(0, 10); // time: midnight
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, nameBytes, data);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(0, 12);
    header.writeUInt16LE(DOS_DATE, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(data.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(nameBytes.length, 28);
    header.writeUInt32LE(offset, 42);
    central.push(header, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, ...central, end]);
}

const version = JSON.parse(readFileSync(join(SOURCE, "manifest.json"), "utf8")).version;
const folder = STORE ? "" : "studio1-connect/";
const entries = files(SOURCE)
  .sort()
  .map((path) => {
    const name = relative(SOURCE, path).split(sep).join("/");
    const data = readFileSync(path);
    return { name: `${folder}${name}`, data: STORE && name === "manifest.json" ? storeManifest(data.toString("utf8")) : data };
  });

const outDir = STORE ? join(ROOT, "extension", "dist") : join(ROOT, "public", "downloads");
const out = join(outDir, STORE ? `studio1-connect-${version}-store.zip` : "studio1-connect.zip");
mkdirSync(outDir, { recursive: true });
writeFileSync(out, zip(entries));
console.log(`${relative(ROOT, out)}: ${entries.length} files, version ${version}`);
