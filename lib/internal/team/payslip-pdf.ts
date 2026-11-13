import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { COMPANY } from "@/lib/internal/team/company";
import { amountInWords } from "@/lib/internal/team/payroll-math";
import { daysInMonth, monthLabel, sumLines, type PayLine, type Payslip } from "@/lib/internal/team/shared";
import { STUDIO1_LOGO } from "@/lib/internal/team/studio1-logo";

/**
 * The payslip PDF, laid out like Zoho's free payslip generator: employer,
 * month, employee summary, net pay, earnings and deductions side by side,
 * reimbursements, total net payable and the amount in words. Studio1 Sans,
 * A4, Studio1 orange as the one accent. No bank details. Server only.
 *
 * The fonts are read from app/fonts at request time; next.config.ts traces
 * them into every /internal/** function (outputFileTracingIncludes).
 */

export type PayslipPdfInput = Pick<
  Payslip,
  | "name"
  | "email"
  | "employee_code"
  | "designation"
  | "joined_on"
  | "month"
  | "paid_days"
  | "lop_days"
  | "earnings"
  | "deductions"
  | "reimbursement"
  | "net"
> & {
  /** When it was paid out (the day it was emailed); left off drafts. */
  payDate?: string | null;
};

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const CONTENT = PAGE.width - MARGIN * 2;
/** Baseline of the footer line; its rule sits 18pt above. */
const FOOTER_TOP = PAGE.height - MARGIN + 6;

const hex = (value: string): RGB =>
  rgb(parseInt(value.slice(1, 3), 16) / 255, parseInt(value.slice(3, 5), 16) / 255, parseInt(value.slice(5, 7), 16) / 255);

const INK = hex("#1c1917");
const INK_2 = hex("#44403c");
const MUTED = hex("#78716c");
const FAINT = hex("#a8a29e");
const LINE = hex("#e7e5e4");
const SUNKEN = hex("#faf9f7");
const ACCENT = hex("#ea580c");
const ACCENT_SOFT = hex("#fff7ed");
const ACCENT_LINE = hex("#fed7aa");

let fontFiles: Promise<{ regular: Buffer; medium: Buffer }> | null = null;

function loadFonts() {
  fontFiles ??= Promise.all([
    readFile(path.join(process.cwd(), "app/fonts/Studio1Sans-Regular.ttf")),
    readFile(path.join(process.cwd(), "app/fonts/Studio1Sans-Medium.ttf")),
  ]).then(([regular, medium]) => ({ regular, medium }));
  // A failed read shouldn't stick: try again on the next payslip.
  fontFiles.catch(() => {
    fontFiles = null;
  });
  return fontFiles;
}

const rupeeFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹45,000.00 */
export function rupees(amount: number) {
  return rupeeFormat.format(Number.isFinite(amount) ? amount : 0);
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function shortDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return "—";
  // Timestamps (the pay date) are shown on their IST day.
  if (value.length !== 10) {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(date);
  }
  return dateFormat.format(date);
}

function days(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** The name for the download: "Payslip-Priya-Sharma-Nov-2026.pdf". */
export function payslipFileName(slip: Pick<Payslip, "name" | "email" | "month">) {
  const who = (slip.name || slip.email.split("@")[0])
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `Payslip-${who || "employee"}-${monthLabel(slip.month, true).replace(" ", "-")}.pdf`;
}

/* --------------------------------------------------------------- drawing */

type Fonts = { regular: PDFFont; medium: PDFFont };

class Canvas {
  constructor(
    readonly page: PDFPage,
    readonly fonts: Fonts,
  ) {}

  /** PDF y for a distance from the top of the page. */
  y(top: number) {
    return PAGE.height - top;
  }

  /** Cuts text down to fit, with an ellipsis. */
  fit(value: string, font: PDFFont, size: number, width: number) {
    if (font.widthOfTextAtSize(value, size) <= width) return value;
    let text = value;
    while (text.length > 1 && font.widthOfTextAtSize(`${text}…`, size) > width) text = text.slice(0, -1);
    return `${text.trimEnd()}…`;
  }

  /** Splits text into lines no wider than `width`. */
  wrap(value: string, font: PDFFont, size: number, width: number) {
    const lines: string[] = [];
    let line = "";
    for (const word of value.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(next, size) > width) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  /** Text whose baseline sits `top` points from the top of the page. */
  text(
    value: string,
    x: number,
    top: number,
    options: { size?: number; font?: "regular" | "medium"; color?: RGB; align?: "left" | "right" | "center"; maxWidth?: number } = {},
  ) {
    const size = options.size ?? 9.5;
    const font = this.fonts[options.font ?? "regular"];
    const content = options.maxWidth ? this.fit(value, font, size, options.maxWidth) : value;
    const width = font.widthOfTextAtSize(content, size);
    const left = options.align === "right" ? x - width : options.align === "center" ? x - width / 2 : x;
    this.page.drawText(content, { x: left, y: this.y(top), size, font, color: options.color ?? INK });
  }

  line(x1: number, top1: number, x2: number, top2: number, color = LINE, thickness = 0.75) {
    this.page.drawLine({ start: { x: x1, y: this.y(top1) }, end: { x: x2, y: this.y(top2) }, color, thickness });
  }

  /** An SVG path, scaled from its own units, with its origin at (x, top). */
  path(d: string, x: number, top: number, scale: number, color: RGB) {
    this.page.drawSvgPath(d, { x, y: this.y(top), scale, color });
  }

  rect(x: number, top: number, width: number, height: number, color: RGB) {
    this.page.drawRectangle({ x, y: this.y(top + height), width, height, color });
  }

  /** A rounded box: fill, border, or both. */
  box(
    x: number,
    top: number,
    width: number,
    height: number,
    options: { fill?: RGB; border?: RGB; radius?: number; borderWidth?: number },
  ) {
    const r = Math.min(options.radius ?? 6, width / 2, height / 2);
    const w = width;
    const h = height;
    const path = `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
    this.page.drawSvgPath(path, {
      x,
      y: this.y(top),
      color: options.fill,
      borderColor: options.border,
      borderWidth: options.border ? (options.borderWidth ?? 0.75) : 0,
    });
  }
}

/* ---------------------------------------------------------------- layout */

/** The payslip as PDF bytes. */
export async function payslipPdf(slip: PayslipPdfInput): Promise<Uint8Array> {
  const files = await loadFonts();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  // Whole fonts: @pdf-lib/fontkit's subsetting drops most of Studio1 Sans's glyphs.
  const fonts: Fonts = {
    regular: await pdf.embedFont(files.regular),
    medium: await pdf.embedFont(files.medium),
  };
  const month = monthLabel(slip.month);
  const person = slip.name || slip.email;
  pdf.setTitle(`Payslip for ${month} – ${person}`);
  pdf.setAuthor(COMPANY.legalName);
  pdf.setCreator("Studio1 dashboard");
  pdf.setProducer("Studio1 dashboard");
  pdf.setCreationDate(new Date());

  const page = pdf.addPage([PAGE.width, PAGE.height]);
  const c = new Canvas(page, fonts);
  const right = MARGIN + CONTENT;

  /* Header: the Studio1 logo and the employer on the left, the month on the right. */
  const logoHeight = 24;
  for (const part of [STUDIO1_LOGO.mark, STUDIO1_LOGO.wordmark]) {
    c.path(part.d, MARGIN, MARGIN, logoHeight / STUDIO1_LOGO.height, hex(part.color));
  }
  let top = MARGIN + logoHeight + 22;
  c.text(COMPANY.legalName, MARGIN, top, { size: 11, font: "medium", maxWidth: CONTENT - 200 });
  top += 15;
  c.text(COMPANY.website, MARGIN, top, { size: 9, color: MUTED });
  for (const line of COMPANY.address.filter(Boolean)) {
    top += 12.5;
    c.text(line, MARGIN, top, { size: 9, color: MUTED, maxWidth: CONTENT - 200 });
  }
  c.text("Payslip for the month of", right, MARGIN + 3, { size: 9, color: MUTED, align: "right" });
  c.text(month, right, MARGIN + 21, { size: 15, font: "medium", align: "right" });

  top += 20;
  c.line(MARGIN, top, right, top);

  /* Employee summary, and the net pay card beside it. */
  top += 26;
  c.text("EMPLOYEE SUMMARY", MARGIN, top, { size: 7.5, font: "medium", color: MUTED });
  const lastDay = daysInMonth(slip.month);
  const rows: [string, string][] = [
    ["Employee name", person],
    ["Employee ID", slip.employee_code || "—"],
    ["Designation", slip.designation || "—"],
    ["Date of joining", shortDate(slip.joined_on)],
    ["Pay period", `1–${lastDay} ${monthLabel(slip.month, true)}`],
    ...(slip.payDate ? ([["Pay date", shortDate(slip.payDate)]] as [string, string][]) : []),
  ];
  const summaryTop = top + 20;
  const labelWidth = 96;
  const cardWidth = 196;
  const summaryWidth = CONTENT - cardWidth - 24;
  rows.forEach(([label, value], index) => {
    const rowTop = summaryTop + index * 19;
    c.text(label, MARGIN, rowTop, { size: 9.5, color: MUTED });
    c.text(":", MARGIN + labelWidth, rowTop, { size: 9.5, color: FAINT });
    c.text(value, MARGIN + labelWidth + 10, rowTop, {
      size: 9.5,
      font: "medium",
      maxWidth: summaryWidth - labelWidth - 10,
    });
  });

  const cardLeft = right - cardWidth;
  const cardTop = top - 8;
  const cardHeight = 112;
  c.box(cardLeft, cardTop, cardWidth, cardHeight, { fill: ACCENT_SOFT, border: ACCENT_LINE, radius: 8 });
  c.rect(cardLeft + 16, cardTop + 22, 3, 30, ACCENT);
  c.text(rupees(slip.net), cardLeft + 27, cardTop + 40, { size: 19, font: "medium", maxWidth: cardWidth - 40 });
  c.text("Total net pay", cardLeft + 27, cardTop + 54, { size: 9, color: MUTED });
  c.line(cardLeft + 16, cardTop + 70, cardLeft + cardWidth - 16, cardTop + 70, ACCENT_LINE);
  c.text("Paid days", cardLeft + 16, cardTop + 88, { size: 9, color: MUTED });
  c.text(days(slip.paid_days), cardLeft + cardWidth / 2 - 8, cardTop + 88, { size: 9, font: "medium", align: "right" });
  c.text("LOP days", cardLeft + cardWidth / 2 + 8, cardTop + 88, { size: 9, color: MUTED });
  c.text(days(slip.lop_days), cardLeft + cardWidth - 16, cardTop + 88, { size: 9, font: "medium", align: "right" });

  top = Math.max(summaryTop + (rows.length - 1) * 19, cardTop + cardHeight) + 30;

  /* Earnings and deductions, side by side. */
  const half = CONTENT / 2;
  const headHeight = 26;
  const count = Math.max(slip.earnings.length, slip.deductions.length, 1);
  // Long slips get tighter rows so everything stays above the footer rule:
  // rows share whatever the blocks under the table leave over.
  const wordsLabel = "Amount in words : ";
  const words = amountInWords(slip.net);
  const wordsWidth = fonts.regular.widthOfTextAtSize(wordsLabel, 9) + fonts.medium.widthOfTextAtSize(words, 9);
  const wordsLines = wordsWidth <= CONTENT ? [] : c.wrap(words, fonts.medium, 9, CONTENT);
  const below = 16 + (slip.reimbursement > 0 ? 56 : 0) + 52 + 20 + 14 * wordsLines.length + 20;
  const room = FOOTER_TOP - 18 - below - top - headHeight - 12 - 28;
  const rowHeight = Math.max(13, Math.min(22, Math.floor(room / count)));
  const tableHeight = headHeight + count * rowHeight + 12 + 28;
  const tableTop = top;
  c.box(MARGIN, tableTop, CONTENT, headHeight + 6, { fill: SUNKEN, radius: 8 });
  c.rect(MARGIN + 0.5, tableTop + headHeight, CONTENT - 1, 7, hex("#ffffff"));
  c.line(MARGIN, tableTop + headHeight, right, tableTop + headHeight);

  const head = (label: string, x: number, align: "left" | "right" = "left") =>
    c.text(label, x, tableTop + 16.5, { size: 7.5, font: "medium", color: MUTED, align });
  head("EARNINGS", MARGIN + 14);
  head("AMOUNT", MARGIN + half - 14, "right");
  head("DEDUCTIONS", MARGIN + half + 14);
  head("AMOUNT", right - 14, "right");

  const column = (lines: readonly PayLine[], left: number) => {
    lines.forEach((line, index) => {
      const rowTop = tableTop + headHeight + 16 + index * rowHeight;
      c.text(line.label, left + 14, rowTop, { size: 9.5, color: INK_2, maxWidth: half - 120 });
      c.text(rupees(line.amount), left + half - 14, rowTop, { size: 9.5, align: "right" });
    });
    if (lines.length === 0) {
      c.text("None", left + 14, tableTop + headHeight + 16, { size: 9.5, color: FAINT });
    }
  };
  column(slip.earnings, MARGIN);
  column(slip.deductions, MARGIN + half);

  const totalTop = tableTop + headHeight + count * rowHeight + 12;
  c.line(MARGIN, totalTop, right, totalTop);
  c.text("Gross earnings", MARGIN + 14, totalTop + 18, { size: 9.5, font: "medium" });
  c.text(rupees(sumLines(slip.earnings)), MARGIN + half - 14, totalTop + 18, { size: 9.5, font: "medium", align: "right" });
  c.text("Total deductions", MARGIN + half + 14, totalTop + 18, { size: 9.5, font: "medium" });
  c.text(rupees(sumLines(slip.deductions)), right - 14, totalTop + 18, { size: 9.5, font: "medium", align: "right" });
  c.line(MARGIN + half, tableTop, MARGIN + half, tableTop + tableHeight);
  c.box(MARGIN, tableTop, CONTENT, tableHeight, { border: LINE, radius: 8 });

  top = tableTop + tableHeight + 16;

  /* Reimbursements, when there are any. */
  if (slip.reimbursement > 0) {
    const height = 40;
    c.box(MARGIN, top, CONTENT, height, { border: LINE, radius: 8 });
    c.text("Reimbursements", MARGIN + 14, top + 17, { size: 9.5, font: "medium" });
    c.text("Approved expense claims, paid with this salary", MARGIN + 14, top + 30, { size: 8.5, color: MUTED });
    c.text(rupees(slip.reimbursement), right - 14, top + 24, { size: 9.5, font: "medium", align: "right" });
    top += height + 16;
  }

  /* Total net payable and the amount in words. */
  const netHeight = 52;
  c.box(MARGIN, top, CONTENT, netHeight, { fill: SUNKEN, border: LINE, radius: 8 });
  c.text("TOTAL NET PAYABLE", MARGIN + 16, top + 22, { size: 10, font: "medium" });
  c.text(
    slip.reimbursement > 0
      ? "Gross earnings − Total deductions + Reimbursements"
      : "Gross earnings − Total deductions",
    MARGIN + 16,
    top + 37,
    { size: 8.5, color: MUTED },
  );
  c.text(rupees(slip.net), right - 16, top + 32, { size: 15, font: "medium", align: "right" });
  top += netHeight + 20;

  if (wordsLines.length === 0) {
    c.text(words, right, top, { size: 9, font: "medium", align: "right" });
    c.text(wordsLabel, right - fonts.medium.widthOfTextAtSize(words, 9), top, { size: 9, color: MUTED, align: "right" });
  } else {
    c.text(wordsLabel.trim(), right, top, { size: 9, color: MUTED, align: "right" });
    wordsLines.forEach((line, index) => {
      c.text(line, right, top + 14 * (index + 1), { size: 9, font: "medium", align: "right" });
    });
  }

  /* Footer. */
  c.line(MARGIN, FOOTER_TOP - 18, right, FOOTER_TOP - 18);
  c.text("This is a system-generated payslip and needs no signature.", PAGE.width / 2, FOOTER_TOP, {
    size: 8.5,
    color: FAINT,
    align: "center",
  });

  return pdf.save();
}
