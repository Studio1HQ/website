/**
 * Reads a spreadsheet file into plain rows, with no library: CSV (or tab-
 * or semicolon-separated), Excel .xlsx, old Excel .xls (what LinkedIn Page
 * analytics exports), and a web-page table saved as .xls. Every cell comes
 * back as text, a number, or null; working out what the columns mean is
 * lib/internal/socials/import.ts's job.
 *
 * Runs in the browser (the file never leaves it) and in Node for the tests:
 * it only needs DecompressionStream, Blob and Response.
 */

export type Cell = string | number | null;
export type Sheet = { name: string; rows: Cell[][] };

/** The kinds of file this reads, from the first bytes. */
export function sniff(bytes: Uint8Array): "xlsx" | "xls" | "markup" | "text" {
  if (
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  )
    return "xlsx";
  const cfb = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  if (cfb.every((byte, index) => bytes[index] === byte)) return "xls";
  const head = decodeText(bytes.subarray(0, 2048))
    .replace(/^\s+/, "")
    .slice(0, 400)
    .toLowerCase();
  if (
    head.startsWith("<") &&
    /<(table|html|workbook|\?xml|!doctype)/.test(head)
  )
    return "markup";
  return "text";
}

/** Every sheet in the file, in order. Throws when it can't be read. */
export async function readSheets(bytes: Uint8Array): Promise<Sheet[]> {
  switch (sniff(bytes)) {
    case "xlsx": {
      // A zip: an Excel workbook, or a folder of CSV files (YouTube Studio's export).
      const csvs = await unzip(
        bytes,
        (name) => /\.(csv|tsv|txt)$/i.test(name) && !/^__MACOSX\//.test(name),
      );
      if (csvs.size)
        return [...csvs].map(([name, data]) => ({
          name: name.replace(/^.*\//, "").replace(/\.\w+$/, ""),
          rows: parseCsv(decodeText(data)),
        }));
      return readXlsx(bytes);
    }
    case "xls":
      return readXls(bytes);
    case "markup":
      return readMarkup(decodeText(bytes));
    default:
      return [{ name: "Sheet1", rows: parseCsv(decodeText(bytes)) }];
  }
}

/** UTF-8, or UTF-16 when the file starts with its byte-order mark. */
export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe)
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff)
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  return new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, "");
}

// ---------------------------------------------------------------- CSV

/**
 * Rows of a CSV file. Quotes may hold commas, quotes ("") and line breaks.
 * The separator is whichever of comma, tab and semicolon the first line
 * uses most.
 */
export function parseCsv(text: string): Cell[][] {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const outside = firstLine.replace(/"[^"]*"/g, "");
  const counts = [",", "\t", ";"].map(
    (sep) => [sep, outside.split(sep).length - 1] as const,
  );
  const separator = counts.reduce((best, item) =>
    item[1] > best[1] ? item : best,
  )[0];

  const rows: Cell[][] = [];
  let row: Cell[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index++;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"' && field === "") quoted = true;
    else if (char === separator) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows
    .map((cells) =>
      cells.map((cell) =>
        typeof cell === "string" && cell.trim() === "" ? null : cell,
      ),
    )
    .filter((cells) => cells.some((cell) => cell !== null));
}

// ---------------------------------------------------------------- XML bits

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** XML and HTML entities, and Excel's _x000D_ escapes. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
      if (name[0] === "#") {
        const code =
          name[1] === "x" || name[1] === "X"
            ? parseInt(name.slice(2), 16)
            : parseInt(name.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000
          ? String.fromCodePoint(code)
          : whole;
      }
      return NAMED[name.toLowerCase()] ?? whole;
    })
    .replace(/_x([0-9A-F]{4})_/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

function attributes(tag: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    found[match[1]] = decodeEntities(match[3] ?? match[4] ?? "");
  }
  return found;
}

/** "AB12" → 27 (0-based column). */
function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? "";
  let index = 0;
  for (const letter of letters)
    index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

function textOf(xml: string): string {
  // Phonetic runs (<rPh>) aren't part of the text.
  const plain = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  return [...plain.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
    .map((match) => decodeEntities(match[1]))
    .join("");
}

/** Fills the gaps a sparse sheet leaves (rows and cells it skipped) and drops trailing blanks. */
function trimRows(rows: Cell[][]): Cell[][] {
  // Array.from visits holes, which .map would skip.
  const filled = Array.from(rows, (row: Cell[] | undefined) => {
    const copy = Array.from(row ?? [], (cell) => cell ?? null);
    while (copy.length && copy[copy.length - 1] === null) copy.pop();
    return copy;
  });
  while (filled.length && !filled[filled.length - 1].length) filled.pop();
  return filled;
}

// ---------------------------------------------------------------- XLSX

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data.slice()])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** A zip's files by name (only the ones `want` keeps), unpacked. */
export async function unzip(
  bytes: Uint8Array,
  want: (name: string) => boolean,
): Promise<Map<string, Uint8Array>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (
    let at = bytes.length - 22;
    at >= Math.max(0, bytes.length - 65_557);
    at--
  ) {
    if (view.getUint32(at, true) === 0x06054b50) {
      end = at;
      break;
    }
  }
  if (end < 0) throw new Error("not a zip file");
  const entries = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files = new Map<string, Uint8Array>();
  const names = new TextDecoder("utf-8");
  for (let index = 0; index < entries && at + 46 <= bytes.length; index++) {
    if (view.getUint32(at, true) !== 0x02014b50) break;
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extra = view.getUint16(at + 30, true);
    const comment = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = names.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extra + comment;
    if (!want(name) || local + 30 > bytes.length) continue;
    const start =
      local +
      30 +
      view.getUint16(local + 26, true) +
      view.getUint16(local + 28, true);
    const data = bytes.subarray(start, start + size);
    if (method === 0) files.set(name, data);
    else if (method === 8) files.set(name, await inflateRaw(data));
  }
  return files;
}

async function readXlsx(bytes: Uint8Array): Promise<Sheet[]> {
  const files = await unzip(bytes, (name) =>
    /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/i.test(
      name,
    ),
  );
  const text = (name: string) => {
    const found = [...files.entries()].find(
      ([key]) => key.toLowerCase() === name.toLowerCase(),
    );
    return found ? new TextDecoder("utf-8").decode(found[1]) : "";
  };
  const workbook = text("xl/workbook.xml");
  if (!workbook) throw new Error("not an Excel workbook");

  const targets = new Map<string, string>();
  for (const match of text("xl/_rels/workbook.xml.rels").matchAll(
    /<Relationship\b[^>]*>/g,
  )) {
    const attrs = attributes(match[0]);
    if (attrs.Id && attrs.Target) {
      const target = attrs.Target.replace(/^\//, "");
      targets.set(attrs.Id, target.startsWith("xl/") ? target : `xl/${target}`);
    }
  }
  const shared = [
    ...text("xl/sharedStrings.xml").matchAll(
      /<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g,
    ),
  ].map((match) => (match[1] === undefined ? "" : textOf(match[1])));

  const sheets: Sheet[] = [];
  for (const match of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const attrs = attributes(match[0]);
    const id =
      attrs["r:id"] ??
      Object.entries(attrs).find(([key]) => key.endsWith(":id"))?.[1];
    const path = id ? targets.get(id) : undefined;
    const xml = path ? text(path) : "";
    if (!xml) continue;
    sheets.push({
      name: attrs.name ?? `Sheet${sheets.length + 1}`,
      rows: xlsxRows(xml, shared),
    });
  }
  return sheets;
}

function xlsxRows(xml: string, shared: string[]): Cell[][] {
  const rows: Cell[][] = [];
  let next = 0;
  for (const rowMatch of xml.matchAll(
    /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g,
  )) {
    const rowNumber = Number(attributes(`<x ${rowMatch[1]}>`).r);
    const index =
      Number.isInteger(rowNumber) && rowNumber > 0 ? rowNumber - 1 : next;
    next = index + 1;
    const cells: Cell[] = [];
    let column = 0;
    for (const cell of (rowMatch[2] ?? "").matchAll(
      /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
    )) {
      const attrs = attributes(`<x ${cell[1]}>`);
      if (attrs.r) column = columnIndex(attrs.r);
      const body = cell[2] ?? "";
      const raw = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
      let value: Cell = null;
      if (attrs.t === "s")
        value = raw === undefined ? null : (shared[Number(raw)] ?? null);
      else if (attrs.t === "inlineStr") value = textOf(body);
      else if (attrs.t === "str" || attrs.t === "e")
        value = raw === undefined ? null : decodeEntities(raw);
      else if (attrs.t === "b") value = raw === "1" ? "TRUE" : "FALSE";
      else if (raw !== undefined && raw.trim() !== "") {
        const number = Number(raw);
        value = Number.isFinite(number) ? number : decodeEntities(raw);
      }
      cells[column] = value === "" ? null : value;
      column++;
    }
    rows[index] = cells;
  }
  return trimRows(rows);
}

// ---------------------------------------------------------------- XLS (BIFF8)

const END_OF_CHAIN = 0xfffffffe;
const FREE = 0xffffffff;

/** The streams in an old Office file (a "compound file"), by name. */
export function readCompoundFile(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sectorSize = 1 << view.getUint16(0x1e, true);
  const miniSize = 1 << view.getUint16(0x20, true);
  const fatCount = view.getUint32(0x2c, true);
  const firstDirectory = view.getUint32(0x30, true);
  const miniCutoff = view.getUint32(0x38, true);
  const firstMiniFat = view.getUint32(0x3c, true);
  let difatSector = view.getUint32(0x44, true);
  if (sectorSize !== 512 && sectorSize !== 4096)
    throw new Error("not a compound file");
  const sector = (n: number) =>
    bytes.subarray((n + 1) * sectorSize, (n + 2) * sectorSize);
  const perSector = sectorSize / 4;

  const fatSectors: number[] = [];
  for (let index = 0; index < 109 && fatSectors.length < fatCount; index++) {
    const value = view.getUint32(0x4c + index * 4, true);
    if (value !== FREE) fatSectors.push(value);
  }
  for (
    let guard = 0;
    difatSector !== END_OF_CHAIN && difatSector !== FREE && guard < 10_000;
    guard++
  ) {
    const data = new DataView(sector(difatSector).slice().buffer);
    for (
      let index = 0;
      index < perSector - 1 && fatSectors.length < fatCount;
      index++
    ) {
      const value = data.getUint32(index * 4, true);
      if (value !== FREE) fatSectors.push(value);
    }
    difatSector = data.getUint32((perSector - 1) * 4, true);
  }
  const fat: number[] = [];
  for (const n of fatSectors) {
    const data = new DataView(sector(n).slice().buffer);
    for (let index = 0; index < perSector; index++)
      fat.push(data.getUint32(index * 4, true));
  }

  const chain = (start: number, table: number[]) => {
    const list: number[] = [];
    const seen = new Set<number>();
    for (
      let n = start;
      n !== END_OF_CHAIN && n !== FREE && n < table.length && !seen.has(n);
      n = table[n]
    ) {
      seen.add(n);
      list.push(n);
    }
    return list;
  };
  const join = (parts: Uint8Array[]) => {
    const out = new Uint8Array(
      parts.reduce((sum, part) => sum + part.length, 0),
    );
    let at = 0;
    for (const part of parts) {
      out.set(part, at);
      at += part.length;
    }
    return out;
  };
  const read = (start: number) => join(chain(start, fat).map(sector));

  const directory = read(firstDirectory);
  const dir = new DataView(
    directory.buffer,
    directory.byteOffset,
    directory.byteLength,
  );
  const entries: { name: string; type: number; start: number; size: number }[] =
    [];
  for (let at = 0; at + 128 <= directory.length; at += 128) {
    const length = Math.min(dir.getUint16(at + 64, true), 64);
    const name = new TextDecoder("utf-16le").decode(
      directory.subarray(at, at + Math.max(0, length - 2)),
    );
    entries.push({
      name,
      type: directory[at + 66],
      start: dir.getUint32(at + 116, true),
      size: dir.getUint32(at + 120, true),
    });
  }
  const root = entries[0];
  const miniStream = root ? read(root.start) : new Uint8Array();
  const miniFat: number[] = [];
  if (firstMiniFat !== END_OF_CHAIN && firstMiniFat !== FREE) {
    const data = read(firstMiniFat);
    const mini = new DataView(data.buffer, data.byteOffset, data.byteLength);
    for (let at = 0; at + 4 <= data.length; at += 4)
      miniFat.push(mini.getUint32(at, true));
  }

  const streams = new Map<string, Uint8Array>();
  for (const entry of entries) {
    if (entry.type !== 2) continue;
    const data =
      entry.size < miniCutoff
        ? join(
            chain(entry.start, miniFat).map((n) =>
              miniStream.subarray(n * miniSize, (n + 1) * miniSize),
            ),
          )
        : read(entry.start);
    streams.set(entry.name, data.subarray(0, entry.size));
  }
  return streams;
}

/** Reads across a record and the CONTINUE records after it. */
class Segments {
  private index = 0;
  private at = 0;
  private readonly parts: Uint8Array[];
  constructor(parts: Uint8Array[]) {
    this.parts = parts;
  }
  private ensure() {
    while (
      this.index < this.parts.length &&
      this.at >= this.parts[this.index].length
    ) {
      this.index++;
      this.at = 0;
    }
    if (this.index >= this.parts.length) throw new Error("ran out of data");
  }
  /** At the end of a part (where a split string's next flags byte sits). */
  atBoundary() {
    return (
      this.index < this.parts.length && this.at >= this.parts[this.index].length
    );
  }
  u8() {
    this.ensure();
    return this.parts[this.index][this.at++];
  }
  u16() {
    return this.u8() | (this.u8() << 8);
  }
  u32() {
    return (this.u16() | (this.u16() << 16)) >>> 0;
  }
  skip(count: number) {
    for (let left = count; left > 0;) {
      this.ensure();
      const take = Math.min(left, this.parts[this.index].length - this.at);
      this.at += take;
      left -= take;
    }
  }
  /** `count` characters; a split continues with a fresh flags byte. */
  chars(count: number, wide: boolean) {
    let text = "";
    for (let index = 0; index < count; index++) {
      if (this.atBoundary()) wide = (this.u8() & 1) === 1;
      text += String.fromCharCode(wide ? this.u16() : this.u8());
    }
    return text;
  }
}

/** XLUnicodeRichExtendedString, as the shared strings hold them. */
function richString(reader: Segments): string {
  const count = reader.u16();
  const flags = reader.u8();
  const runs = flags & 0x08 ? reader.u16() : 0;
  const extended = flags & 0x04 ? reader.u32() : 0;
  const text = reader.chars(count, (flags & 1) === 1);
  reader.skip(runs * 4 + extended);
  return text;
}

/** XLUnicodeString (LABEL, STRING): a 16-bit length, flags, characters. */
function plainString(data: Uint8Array, at: number, shortLength = false) {
  const count = shortLength ? data[at] : data[at] | (data[at + 1] << 8);
  const flagsAt = at + (shortLength ? 1 : 2);
  const wide = (data[flagsAt] & 1) === 1;
  let text = "";
  for (let index = 0; index < count; index++) {
    const position = flagsAt + 1 + index * (wide ? 2 : 1);
    if (position >= data.length) break;
    text += String.fromCharCode(
      wide ? data[position] | (data[position + 1] << 8) : data[position],
    );
  }
  return text;
}

function rkNumber(rk: number): number {
  let value: number;
  if (rk & 2) value = (rk | 0) >> 2;
  else {
    const buffer = new DataView(new ArrayBuffer(8));
    buffer.setUint32(4, (rk & 0xfffffffc) >>> 0, true);
    value = buffer.getFloat64(0, true);
  }
  return rk & 1 ? value / 100 : value;
}

type BiffRecord = { type: number; data: Uint8Array; offset: number };

function records(stream: Uint8Array, from = 0): BiffRecord[] {
  const list: BiffRecord[] = [];
  for (let at = from; at + 4 <= stream.length;) {
    const type = stream[at] | (stream[at + 1] << 8);
    const length = stream[at + 2] | (stream[at + 3] << 8);
    list.push({
      type,
      data: stream.subarray(at + 4, at + 4 + length),
      offset: at,
    });
    at += 4 + length;
  }
  return list;
}

const BOF = 0x0809;
const EOF = 0x000a;
const CONTINUE = 0x003c;

function readXls(bytes: Uint8Array): Sheet[] {
  const streams = readCompoundFile(bytes);
  const stream = streams.get("Workbook") ?? streams.get("Book");
  if (!stream) throw new Error("no workbook in this file");
  const all = records(stream);

  const strings: string[] = [];
  const sheets: { name: string; offset: number }[] = [];
  for (let index = 0; index < all.length; index++) {
    const record = all[index];
    if (record.type === EOF) break;
    if (record.type === 0x0085) {
      const data = record.data;
      const offset =
        (data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24)) >>> 0;
      if (data[5] === 0)
        sheets.push({ name: plainString(data, 6, true), offset });
    } else if (record.type === 0x00fc) {
      const parts = [record.data];
      while (all[index + 1]?.type === CONTINUE) parts.push(all[++index].data);
      const reader = new Segments(parts);
      reader.u32();
      const unique = reader.u32();
      try {
        for (let n = 0; n < unique; n++) strings.push(richString(reader));
      } catch {
        // A short table: keep what was read.
      }
    }
  }

  return sheets.map(({ name, offset }) => {
    const rows: Cell[][] = [];
    const put = (row: number, column: number, value: Cell) => {
      (rows[row] ??= [])[column] = value;
    };
    let pendingFormula: [number, number] | null = null;
    for (const { type, data } of records(stream, offset).slice(1)) {
      if (type === EOF || type === BOF) break;
      const u16 = (at: number) => data[at] | (data[at + 1] << 8);
      const u32 = (at: number) => (u16(at) | (u16(at + 2) << 16)) >>> 0;
      const float = (at: number) =>
        new DataView(data.slice(at, at + 8).buffer).getFloat64(0, true);
      switch (type) {
        case 0x00fd: // LABELSST
          put(u16(0), u16(2), strings[u32(6)] ?? null);
          break;
        case 0x0204: // LABEL
        case 0x00d6: // RSTRING
          put(u16(0), u16(2), plainString(data, 6));
          break;
        case 0x0203: // NUMBER
          put(u16(0), u16(2), float(6));
          break;
        case 0x027e: // RK
          put(u16(0), u16(2), rkNumber(u32(6)));
          break;
        case 0x00bd: {
          // MULRK
          const row = u16(0);
          const first = u16(2);
          const count = (data.length - 6) / 6;
          for (let n = 0; n < count; n++)
            put(row, first + n, rkNumber(u32(4 + n * 6 + 2)));
          break;
        }
        case 0x0006: {
          // FORMULA: a number, or a string in the STRING record after it.
          if (data[12] === 0xff && data[13] === 0xff) {
            if (data[6] === 0) pendingFormula = [u16(0), u16(2)];
            else if (data[6] === 1)
              put(u16(0), u16(2), data[8] ? "TRUE" : "FALSE");
          } else put(u16(0), u16(2), float(6));
          break;
        }
        case 0x0207: // STRING
          if (pendingFormula)
            put(pendingFormula[0], pendingFormula[1], plainString(data, 0));
          pendingFormula = null;
          break;
      }
    }
    return {
      name,
      rows: trimRows(rows).map((row) =>
        row.map((cell) =>
          typeof cell === "string" && cell.trim() === "" ? null : cell,
        ),
      ),
    };
  });
}

// ---------------------------------------------------------------- HTML / SpreadsheetML

function readMarkup(text: string): Sheet[] {
  // Excel 2003 XML (SpreadsheetML).
  if (/<Workbook\b/i.test(text) && /<Worksheet\b/i.test(text)) {
    return [
      ...text.matchAll(
        /<(?:ss:)?Worksheet\b([^>]*)>([\s\S]*?)<\/(?:ss:)?Worksheet>/gi,
      ),
    ].map((sheet, index) => {
      const name = attributes(`<x ${sheet[1]}>`);
      const rows: Cell[][] = [];
      for (const row of sheet[2].matchAll(
        /<(?:ss:)?Row\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:ss:)?Row>)/gi,
      )) {
        const cells: Cell[] = [];
        let column = 0;
        for (const cell of (row[1] ?? "").matchAll(
          /<(?:ss:)?Cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:ss:)?Cell>)/gi,
        )) {
          const attrs = attributes(`<x ${cell[1]}>`);
          const at = Number(attrs["ss:Index"] ?? attrs.Index);
          if (Number.isInteger(at) && at > 0) column = at - 1;
          const data = (cell[2] ?? "").match(
            /<(?:ss:)?Data\b([^>]*)>([\s\S]*?)<\/(?:ss:)?Data>/i,
          );
          const kind = data
            ? attributes(`<x ${data[1]}>`)["ss:Type"]
            : undefined;
          const raw = data
            ? decodeEntities(data[2].replace(/<[^>]+>/g, ""))
            : "";
          cells[column++] =
            raw === ""
              ? null
              : kind === "Number" && Number.isFinite(Number(raw))
                ? Number(raw)
                : raw;
        }
        rows.push(cells);
      }
      return {
        name: name["ss:Name"] ?? name.Name ?? `Sheet${index + 1}`,
        rows: trimRows(rows),
      };
    });
  }
  // A web page's tables, as some exports save them under .xls.
  return [...text.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(
    (table, index) => {
      const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(
        (row) =>
          [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
            (cell): Cell => {
              const value = decodeEntities(
                cell[1].replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, ""),
              ).trim();
              return value === "" ? null : value;
            },
          ),
      );
      return { name: `Table ${index + 1}`, rows: trimRows(rows) };
    },
  );
}
