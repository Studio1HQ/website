/**
 * CSV cells for the dashboard's exports. Form answers are untrusted, so a
 * cell that a spreadsheet would run as a formula (it starts with = + - @, a
 * tab or a carriage return) gets a leading apostrophe, which makes it plain
 * text. Lists are joined with "; ".
 */
export function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  let cell = Array.isArray(value)
    ? value.join("; ")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  return /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

/** Rows as CSV text: a header line, CRLF line ends, and a BOM so Excel reads UTF-8. */
export function toCsv(columns: string[], rows: Record<string, unknown>[]) {
  const lines = [
    columns.map(csvCell).join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
}
