import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  decodeText,
  parseCsv,
  readSheets,
  sniff,
} from "@/lib/internal/socials/sheets";

const encode = (text: string) => new TextEncoder().encode(text);

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** A zip of text files, stored or deflated (no CRCs: the reader doesn't check them). */
function zip(files: Record<string, string>, deflate: boolean) {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = encode(text);
    const data = deflate ? new Uint8Array(deflateRawSync(raw)) : raw;
    const nameBytes = encode(name);
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(8, deflate ? 8 : 0, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, raw.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    const entry = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(entry.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(10, deflate ? 8 : 0, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, raw.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    entry.set(nameBytes, 46);
    parts.push(local, data);
    central.push(entry);
    offset += local.length + data.length;
  }
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, central.length, true);
  ev.setUint16(10, central.length, true);
  ev.setUint32(
    12,
    central.reduce((sum, item) => sum + item.length, 0),
    true,
  );
  ev.setUint32(16, offset, true);
  return concat([...parts, ...central, end]);
}

function xlsx(deflate: boolean) {
  return zip(
    {
      "[Content_Types].xml": "<Types/>",
      "xl/workbook.xml": `<?xml version="1.0"?><workbook xmlns:r="r"><sheets><sheet name="ENGAGEMENT" sheetId="2" r:id="rId4"/><sheet name="FOLLOWERS" r:id="rId5" sheetId="5"/></sheets></workbook>`,
      "xl/_rels/workbook.xml.rels": `<Relationships><Relationship Id="rId4" Target="worksheets/sheet1.xml" Type="x"/><Relationship Target="/xl/worksheets/sheet2.xml" Id="rId5" Type="x"/></Relationships>`,
      "xl/sharedStrings.xml": `<sst><si><t>Date</t></si><si><r><t>Impr</t></r><r><t xml:space="preserve">essions</t></r></si><si><t>Total followers on 10/31/2026</t></si><si><t>Tom &amp; Jerry_x000D_</t></si></sst>`,
      "xl/worksheets/sheet1.xml": `<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>10/1/2026</t></is></c><c r="C3"><v>1234</v></c></row><row r="4"><c r="B4" t="s"><v>3</v></c><c r="C4" t="b"><v>1</v></c><c r="D4" s="2"/></row></sheetData></worksheet>`,
      "xl/worksheets/sheet2.xml": `<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>2</v></c><c r="B1" t="str"><v>15751</v></c></row></sheetData></worksheet>`,
    },
    deflate,
  );
}

// ---------------------------------------------------------------- a tiny .xls writer

function record(type: number, data: Uint8Array) {
  const head = new Uint8Array(4);
  new DataView(head.buffer).setUint16(0, type, true);
  new DataView(head.buffer).setUint16(2, data.length, true);
  return concat([head, data]);
}
const u16 = (value: number) => {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, value, true);
  return out;
};
const u32 = (value: number) => {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, true);
  return out;
};
const f64 = (value: number) => {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setFloat64(0, value, true);
  return out;
};
const latin = (text: string) =>
  new Uint8Array([...text].map((char) => char.charCodeAt(0)));
const wide = (text: string) =>
  concat([...text].map((char) => u16(char.charCodeAt(0))));
const bof = (kind: number) =>
  record(0x0809, concat([u16(0x0600), u16(kind), new Uint8Array(12)]));
const eof = () => record(0x000a, new Uint8Array());
/** An RK holding a whole number. */
const rk = (value: number) => ((value << 2) | 2) >>> 0;

type XlsSheet = { name: string; cells: Uint8Array[] };

/** A BIFF8 workbook stream: shared strings (one split across a CONTINUE), then sheets. */
function workbookStream(strings: string[], sheets: XlsSheet[]) {
  // Every string but the last in SST; the last split after 5 characters.
  const last = strings[strings.length - 1];
  const full = strings.slice(0, -1).map((text) => {
    const isWide = [...text].some((char) => char.charCodeAt(0) > 0xff);
    return concat([
      u16(text.length),
      new Uint8Array([isWide ? 1 : 0]),
      isWide ? wide(text) : latin(text),
    ]);
  });
  const sst = record(
    0x00fc,
    concat([
      u32(strings.length),
      u32(strings.length),
      ...full,
      u16(last.length),
      new Uint8Array([0]),
      latin(last.slice(0, 5)),
    ]),
  );
  // The rest of the split string comes back as 16-bit characters (flags byte 1).
  const more = record(
    0x003c,
    concat([new Uint8Array([1]), wide(last.slice(5))]),
  );

  const sheetStreams = sheets.map((sheet) =>
    concat([bof(0x10), ...sheet.cells, eof()]),
  );
  const bounds = sheets.map((sheet) =>
    record(
      0x0085,
      concat([
        u32(0),
        new Uint8Array([0, 0, sheet.name.length, 0]),
        latin(sheet.name),
      ]),
    ),
  );
  const globals = () => concat([bof(0x05), ...bounds, sst, more, eof()]);
  let offset = globals().length;
  sheets.forEach((_, index) => {
    // lbPlyPos: where the sheet's BOF starts.
    new DataView(bounds[index].buffer).setUint32(4, offset, true);
    offset += sheetStreams[index].length;
  });
  const stream = concat([globals(), ...sheetStreams]);
  // Over 4096 bytes, so it lives in normal sectors.
  return concat([stream, new Uint8Array(Math.max(0, 5000 - stream.length))]);
}

/** A compound file holding one stream called Workbook. */
function compoundFile(stream: Uint8Array) {
  const size = 512;
  const count = Math.ceil(stream.length / size);
  const directoryAt = count;
  const fatAt = count + 1;
  const header = new Uint8Array(size);
  const hv = new DataView(header.buffer);
  header.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  hv.setUint16(0x18, 0x3e, true);
  hv.setUint16(0x1a, 3, true);
  hv.setUint16(0x1c, 0xfffe, true);
  hv.setUint16(0x1e, 9, true);
  hv.setUint16(0x20, 6, true);
  hv.setUint32(0x2c, 1, true);
  hv.setUint32(0x30, directoryAt, true);
  hv.setUint32(0x38, 4096, true);
  hv.setUint32(0x3c, 0xfffffffe, true);
  hv.setUint32(0x44, 0xfffffffe, true);
  for (let index = 0; index < 109; index++)
    hv.setUint32(0x4c + index * 4, index === 0 ? fatAt : 0xffffffff, true);

  const body = new Uint8Array(count * size);
  body.set(stream);
  const directory = new Uint8Array(size);
  const dv = new DataView(directory.buffer);
  const entry = (
    index: number,
    name: string,
    type: number,
    start: number,
    length: number,
  ) => {
    const at = index * 128;
    directory.set(wide(name), at);
    dv.setUint16(at + 64, (name.length + 1) * 2, true);
    directory[at + 66] = type;
    for (const field of [68, 72, 76])
      dv.setUint32(at + field, 0xffffffff, true);
    dv.setUint32(at + 116, start, true);
    dv.setUint32(at + 120, length, true);
  };
  entry(0, "Root Entry", 5, 0xfffffffe, 0);
  entry(1, "Workbook", 2, 0, stream.length);
  const fat = new Uint8Array(size).fill(0xff);
  const fv = new DataView(fat.buffer);
  for (let index = 0; index < count; index++)
    fv.setUint32(index * 4, index === count - 1 ? 0xfffffffe : index + 1, true);
  fv.setUint32(directoryAt * 4, 0xfffffffe, true);
  fv.setUint32(fatAt * 4, 0xfffffffd, true);
  return concat([header, body, directory, fat]);
}

describe("reading export files", () => {
  it("tells the kinds of file apart", () => {
    expect(sniff(encode("Date,Impressions\n"))).toBe("text");
    expect(sniff(encode("  <html><table>"))).toBe("markup");
    expect(sniff(xlsx(false))).toBe("xlsx");
    expect(sniff(compoundFile(new Uint8Array(10)))).toBe("xls");
  });

  it("reads CSV with quotes, line breaks and other separators", () => {
    expect(
      parseCsv(
        'Date,"Post text",Impressions\r\n2026-10-01,"Hi, ""you""\nthere",1200\n\n',
      ),
    ).toEqual([
      ["Date", "Post text", "Impressions"],
      ["2026-10-01", 'Hi, "you"\nthere', "1200"],
    ]);
    expect(parseCsv("Date;Likes\n1/10/2026;4")).toEqual([
      ["Date", "Likes"],
      ["1/10/2026", "4"],
    ]);
    expect(parseCsv("Date\tLikes\n1/10/2026\t")).toEqual([
      ["Date", "Likes"],
      ["1/10/2026", null],
    ]);
  });

  it("decodes UTF-8 with a mark and UTF-16", () => {
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x41]))).toBe("A");
    expect(
      decodeText(new Uint8Array([0xff, 0xfe, 0x41, 0x00, 0x42, 0x00])),
    ).toBe("AB");
  });

  it("reads .xlsx, stored or compressed", async () => {
    for (const deflate of [false, true]) {
      const sheets = await readSheets(xlsx(deflate));
      expect(sheets.map((sheet) => sheet.name)).toEqual([
        "ENGAGEMENT",
        "FOLLOWERS",
      ]);
      expect(sheets[0].rows).toEqual([
        ["Date", "Impressions"],
        [],
        ["10/1/2026", null, 1234],
        [null, "Tom & Jerry\r", "TRUE"],
      ]);
      expect(sheets[1].rows).toEqual([
        ["Total followers on 10/31/2026", "15751"],
      ]);
    }
  });

  it("reads a zip of CSV files, like YouTube Studio's export", async () => {
    const sheets = await readSheets(
      zip(
        {
          "Table data.csv": "Content,Video title,Views\nTotal,,937",
          "Totals.csv": "Date,Views\n2026-11-01,20",
          "__MACOSX/._Totals.csv": "junk",
        },
        true,
      ),
    );
    expect(sheets).toEqual([
      {
        name: "Table data",
        rows: [
          ["Content", "Video title", "Views"],
          ["Total", null, "937"],
        ],
      },
      {
        name: "Totals",
        rows: [
          ["Date", "Views"],
          ["2026-11-01", "20"],
        ],
      },
    ]);
  });

  it("reads old .xls (BIFF8), with a shared string split across records", async () => {
    const strings = [
      "Date",
      "Organic followers",
      "Location",
      "Total followers",
      "Bengaluru – South",
      "10/01/2026",
      "Auto-invited followers",
    ];
    const s = (text: string) => strings.indexOf(text);
    const label = (row: number, column: number, text: string) =>
      record(0x00fd, concat([u16(row), u16(column), u16(0), u32(s(text))]));
    const file = compoundFile(
      workbookStream(strings, [
        {
          name: "New followers",
          cells: [
            label(0, 0, "Date"),
            label(0, 1, "Organic followers"),
            label(0, 2, "Auto-invited followers"),
            label(1, 0, "10/01/2026"),
            record(0x0203, concat([u16(1), u16(1), u16(0), f64(3.5)])),
            record(0x027e, concat([u16(1), u16(2), u16(0), u32(rk(7))])),
          ],
        },
        {
          name: "Location",
          cells: [
            label(0, 0, "Location"),
            label(0, 1, "Total followers"),
            label(1, 0, "Bengaluru – South"),
            record(
              0x00bd,
              concat([
                u16(1),
                u16(1),
                u16(0),
                u32(rk(120)),
                u16(0),
                u32(rk(-4)),
                u16(2),
              ]),
            ),
          ],
        },
      ]),
    );
    const sheets = await readSheets(file);
    expect(sheets).toEqual([
      {
        name: "New followers",
        rows: [
          ["Date", "Organic followers", "Auto-invited followers"],
          ["10/01/2026", 3.5, 7],
        ],
      },
      {
        name: "Location",
        rows: [
          ["Location", "Total followers"],
          ["Bengaluru – South", 120, -4],
        ],
      },
    ]);
  });

  it("reads tables saved as .xls web pages, and Excel 2003 XML", async () => {
    const page = await readSheets(
      encode(
        "<html><body><table><tr><th>Date</th><th>Page views</th></tr><tr><td>10/01/2026</td><td>1,204</td></tr></table></body></html>",
      ),
    );
    expect(page).toEqual([
      {
        name: "Table 1",
        rows: [
          ["Date", "Page views"],
          ["10/01/2026", "1,204"],
        ],
      },
    ]);
    const xml = await readSheets(
      encode(
        `<?xml version="1.0"?><Workbook><Worksheet ss:Name="Metrics"><Table><Row><Cell><Data ss:Type="String">Date</Data></Cell><Cell ss:Index="3"><Data ss:Type="Number">12</Data></Cell></Row></Table></Worksheet></Workbook>`,
      ),
    );
    expect(xml).toEqual([{ name: "Metrics", rows: [["Date", null, 12]] }]);
  });
});
