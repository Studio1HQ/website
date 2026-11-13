import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/internal/csv";

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("Priya Sharma")).toBe("Priya Sharma");
    expect(csvCell(42)).toBe("42");
    expect(csvCell(true)).toBe("true");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("stops a spreadsheet running a cell as a formula", () => {
    expect(csvCell("=HYPERLINK(\"https://evil.example\")")).toBe("\"'=HYPERLINK(\"\"https://evil.example\"\")\"");
    expect(csvCell("+1+1")).toBe("'+1+1");
    expect(csvCell("-2+3")).toBe("'-2+3");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("\t=1+1")).toBe("'\t=1+1");
    expect(csvCell("\r=1+1")).toBe("\"'\r=1+1\"");
  });

  it("checks a list after joining it", () => {
    expect(csvCell(["=1+1", "b"])).toBe("'=1+1; b");
    expect(csvCell(["a", "b"])).toBe("a; b");
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("Pune, India")).toBe("\"Pune, India\"");
    expect(csvCell("she said \"hi\"")).toBe("\"she said \"\"hi\"\"\"");
    expect(csvCell("line one\nline two")).toBe("\"line one\nline two\"");
  });

  it("writes an object as JSON, not [object Object]", () => {
    expect(csvCell({ a: 1 })).toBe("\"{\"\"a\"\":1}\"");
  });
});

describe("toCsv", () => {
  it("writes a header, one line per row and a BOM", () => {
    const csv = toCsv(["name", "=note"], [{ name: "Priya", "=note": "ok" }, { name: "Amit" }]);
    expect(csv).toBe("﻿name,'=note\r\nPriya,ok\r\nAmit,\r\n");
  });
});
