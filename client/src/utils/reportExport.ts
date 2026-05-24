import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RowStyle =
  | "normal"    // plain data row
  | "info"      // report details block rendered above the table in PDF
  | "group"     // account-type group header (blue)
  | "date"      // date sub-header (yellow)
  | "ob"        // opening balance (red tint)
  | "cb"        // closing balance (green tint)
  | "subtotal"  // group subtotal
  | "total";    // grand total (dark)

export interface ExportColumn {
  header: string;
  /** Fractional share of table width for PDF (e.g. 0.05). Leave undefined for auto. */
  widthRatio?: number;
  align?: "left" | "center" | "right";
}

export interface ExportRow {
  style?: RowStyle;
  cells: string[];
  /** If set, first N cells are merged into one spanning cell (PDF only). */
  spanFirst?: number;
}

export interface ReportMeta {
  /** Primary heading — usually branch/society name */
  title: string;
  /** Secondary heading — address etc. */
  subtitle?: string;
  /** Report name line — e.g. "Day Book From: 01 Jan 2025 To 31 Jan 2025" */
  reportTitle: string;
  /** File name without extension */
  fileName: string;
  landscape?: boolean;
  /** Paper size — defaults to "a4". Use "a3" for very wide reports (16+ columns). */
  paperSize?: "a4" | "a3";
}

export interface ExportConfig {
  meta: ReportMeta;
  columns: ExportColumn[];
  rows: ExportRow[];
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

const PDF_STYLES: Record<
  RowStyle,
  { fillColor: [number, number, number]; textColor: [number, number, number]; fontStyle: "normal" | "bold" }
> = {
  normal:   { fillColor: [255, 255, 255], textColor: [0, 0, 0],       fontStyle: "normal" },
  info:     { fillColor: [219, 234, 254], textColor: [30, 64, 175],    fontStyle: "bold"   },
  group:    { fillColor: [219, 234, 254], textColor: [30, 64, 175],    fontStyle: "bold"   },
  date:     { fillColor: [254, 252, 232], textColor: [133, 77, 14],    fontStyle: "bold"   },
  ob:       { fillColor: [254, 242, 242], textColor: [185, 28, 28],    fontStyle: "bold"   },
  cb:       { fillColor: [240, 253, 244], textColor: [22, 101, 52],    fontStyle: "bold"   },
  subtotal: { fillColor: [243, 244, 246], textColor: [55, 65, 81],     fontStyle: "bold"   },
  total:    { fillColor: [229, 231, 235], textColor: [17, 24, 39],     fontStyle: "bold"   },
};

const parseInfoPairs = (infoRows: ExportRow[]): { label: string; value: string }[] =>
  infoRows
    .flatMap((row) => row.cells.flatMap((cell) => cell.split("|")))
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const sep = part.indexOf(":");
      if (sep === -1) return { label: "Detail", value: part };
      return {
        label: part.slice(0, sep).trim(),
        value: part.slice(sep + 1).trim(),
      };
    })
    .filter(({ value }) => value.length > 0);

const buildInfoGridRows = (
  pairs: { label: string; value: string }[],
  pairColumns: number
): string[][] => {
  const rows: string[][] = [];
  for (let i = 0; i < pairs.length; i += pairColumns) {
    const row: string[] = [];
    pairs.slice(i, i + pairColumns).forEach(({ label, value }) => {
      row.push(label, value);
    });
    while (row.length < pairColumns * 2) row.push("");
    rows.push(row);
  }
  return rows;
};

export function exportToPdf(config: ExportConfig): void {
  const { meta, columns, rows } = config;
  const orientation = meta.landscape ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, unit: "mm", format: meta.paperSize ?? "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let y = margin;

  // Header block
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(meta.title.toUpperCase(), pageWidth / 2, y + 5, { align: "center" });
  doc.setLineWidth(0.4);
  doc.line(margin, y + 6, pageWidth - margin, y + 6);
  y += 10;

  if (meta.subtitle) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(meta.subtitle, pageWidth / 2, y + 4, { align: "center" });
    y += 7;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(meta.reportTitle, pageWidth / 2, y + 4, { align: "center" });
  y += 10;

  const tableRows = rows.filter((row) => row.style !== "info");
  const infoRows = rows.filter((row) => row.style === "info");

  if (infoRows.length > 0) {
    const infoPairs = parseInfoPairs(infoRows);
    const pairColumns = meta.landscape ? 3 : 2;
    const infoBody = buildInfoGridRows(infoPairs, pairColumns);
    const labelWidth = (pageWidth - margin * 2) * (meta.landscape ? 0.105 : 0.15);
    const valueWidth = ((pageWidth - margin * 2) - labelWidth * pairColumns) / pairColumns;
    const infoColumnStyles: Record<number, { cellWidth: number }> = {};

    for (let i = 0; i < pairColumns; i++) {
      infoColumnStyles[i * 2] = { cellWidth: labelWidth };
      infoColumnStyles[i * 2 + 1] = { cellWidth: valueWidth };
    }

    autoTable(doc, {
      startY: y,
      body: infoBody,
      margin: { left: margin, right: margin },
      theme: "grid",
      columnStyles: infoColumnStyles,
      styles: {
        cellPadding: { top: 1.4, right: 1.8, bottom: 1.4, left: 1.8 },
        fontSize: 7.5,
        lineColor: [203, 213, 225],
        lineWidth: 0.15,
        overflow: "linebreak",
        valign: "middle",
      },
      didParseCell: (data) => {
        const isLabel = data.column.index % 2 === 0;
        data.cell.styles.fillColor = isLabel ? [241, 245, 249] : [255, 255, 255];
        data.cell.styles.textColor = isLabel ? [100, 116, 139] : [15, 23, 42];
        data.cell.styles.fontStyle = isLabel ? "bold" : "normal";
      },
    });

    y = ((doc as any).lastAutoTable?.finalY ?? y) + 4;
  }

  // Build autoTable body
  const body: Parameters<typeof autoTable>[1]["body"] = tableRows.map((row) => {
    const style = PDF_STYLES[row.style ?? "normal"];

    if (row.spanFirst && row.spanFirst > 1) {
      // Merge first N cells into a single colspan cell
      const merged = row.cells.slice(0, row.spanFirst).join(" ").trim() || row.cells[0];
      const rest = row.cells.slice(row.spanFirst);
      return [
        {
          content: merged,
          colSpan: row.spanFirst,
          styles: {
            halign: "center" as const,
            fillColor: style.fillColor,
            textColor: style.textColor,
            fontStyle: style.fontStyle,
            fontSize: 8,
          },
        },
        ...rest.map((cell, ci) => ({
          content: cell,
          styles: {
            halign: (columns[row.spanFirst! + ci]?.align ?? "left") as "left" | "center" | "right",
            fillColor: style.fillColor,
            textColor: style.textColor,
            fontStyle: style.fontStyle,
            fontSize: 8,
          },
        })),
      ];
    }

    return row.cells.map((cell, ci) => ({
      content: cell,
      styles: {
        halign: (columns[ci]?.align ?? "left") as "left" | "center" | "right",
        fillColor: style.fillColor,
        textColor: style.textColor,
        fontStyle: style.fontStyle,
        fontSize: 8,
      },
    }));
  });

  // Column widths
  const usable = pageWidth - margin * 2;
  const columnStyles: Record<number, { cellWidth: number }> = {};
  columns.forEach((col, i) => {
    if (col.widthRatio !== undefined) {
      columnStyles[i] = { cellWidth: usable * col.widthRatio };
    }
  });

  autoTable(doc, {
    startY: y,
    head: [columns.map((c) => c.header)],
    body,
    margin: { left: margin, right: margin },
    columnStyles,
    headStyles: {
      fillColor: [208, 216, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      fontSize: 8,
    },
    styles: { cellPadding: 1.5, fontSize: 8, overflow: "linebreak" },
    didDrawPage: (data) => {
      // Page number footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - margin,
        doc.internal.pageSize.getHeight() - 5,
        { align: "right" }
      );
    },
  });

  doc.save(`${meta.fileName}.pdf`);
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export function exportToExcel(config: ExportConfig): void {
  const { meta, columns, rows } = config;

  const wsData: (string | number)[][] = [];
  const rowStyles: (RowStyle | "title" | "subtitle" | "reportTitle" | "header" | "blank")[] = [];
  const columnCount = Math.max(columns.length, 1);
  const merges: XLSX.Range[] = [];
  const mergeAcross = (rowIndex: number) => {
    if (columnCount > 1) {
      merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: columnCount - 1 } });
    }
  };
  const pushRow = (
    values: (string | number)[],
    style: RowStyle | "title" | "subtitle" | "reportTitle" | "header" | "blank",
    merge = false
  ) => {
    const rowIndex = wsData.length;
    wsData.push(values);
    rowStyles.push(style);
    if (merge) mergeAcross(rowIndex);
    return rowIndex;
  };

  pushRow([meta.title], "title", true);
  if (meta.subtitle) pushRow([meta.subtitle], "subtitle", true);
  pushRow([meta.reportTitle], "reportTitle", true);
  pushRow([], "blank");

  const infoRows = rows.filter((row) => row.style === "info");
  if (infoRows.length > 0) {
    const infoPairs = parseInfoPairs(infoRows);
    const pairColumns = Math.max(1, Math.min(meta.landscape ? 3 : 2, Math.floor(columnCount / 2) || 1));
    buildInfoGridRows(infoPairs, pairColumns).forEach((row) => {
      pushRow(row, "info");
    });
    pushRow([], "blank");
  }

  const headerRowIndex = pushRow(columns.map((c) => c.header), "header");

  rows.filter((row) => row.style !== "info").forEach((row) => {
    if (row.spanFirst && row.spanFirst > 1) {
      const label = row.cells.slice(0, row.spanFirst).join(" ").trim() || row.cells[0];
      const rest = row.cells.slice(row.spanFirst);
      pushRow([label, ...Array(row.spanFirst - 1).fill(""), ...rest], row.style ?? "normal");
    } else {
      pushRow(row.cells, row.style ?? "normal");
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = columns.map((col) => ({
    wch: col.widthRatio ? Math.max(10, Math.round(col.widthRatio * 120)) : 20,
  }));
  ws["!merges"] = merges;
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIndex, c: 0 },
      e: { r: Math.max(headerRowIndex, wsData.length - 1), c: columnCount - 1 },
    }),
  };

  const border = {
    top: { style: "thin", color: { rgb: "CBD5E1" } },
    bottom: { style: "thin", color: { rgb: "CBD5E1" } },
    left: { style: "thin", color: { rgb: "CBD5E1" } },
    right: { style: "thin", color: { rgb: "CBD5E1" } },
  };
  const excelStyles: Record<string, any> = {
    title: { font: { bold: true, sz: 16, color: { rgb: "0F172A" } }, alignment: { horizontal: "center" } },
    subtitle: { font: { sz: 10, color: { rgb: "475569" } }, alignment: { horizontal: "center", wrapText: true } },
    reportTitle: { font: { bold: true, sz: 12, color: { rgb: "1E293B" } }, alignment: { horizontal: "center", wrapText: true } },
    header: {
      fill: { fgColor: { rgb: "1E293B" } },
      font: { bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border,
    },
    normal: { alignment: { vertical: "center", wrapText: true }, border },
    info: {
      fill: { fgColor: { rgb: "DBEAFE" } },
      font: { bold: true, color: { rgb: "1E40AF" } },
      alignment: { vertical: "center", wrapText: true },
      border,
    },
    group: {
      fill: { fgColor: { rgb: "DBEAFE" } },
      font: { bold: true, color: { rgb: "1E40AF" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border,
    },
    date: {
      fill: { fgColor: { rgb: "FEF3C7" } },
      font: { bold: true, color: { rgb: "92400E" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border,
    },
    ob: {
      fill: { fgColor: { rgb: "FEE2E2" } },
      font: { bold: true, color: { rgb: "B91C1C" } },
      alignment: { vertical: "center", wrapText: true },
      border,
    },
    cb: {
      fill: { fgColor: { rgb: "DCFCE7" } },
      font: { bold: true, color: { rgb: "166534" } },
      alignment: { vertical: "center", wrapText: true },
      border,
    },
    subtotal: {
      fill: { fgColor: { rgb: "F1F5F9" } },
      font: { bold: true, color: { rgb: "334155" } },
      alignment: { vertical: "center", wrapText: true },
      border,
    },
    total: {
      fill: { fgColor: { rgb: "E2E8F0" } },
      font: { bold: true, color: { rgb: "0F172A" } },
      alignment: { vertical: "center", wrapText: true },
      border,
    },
  };

  rowStyles.forEach((styleName, rowIndex) => {
    if (styleName === "blank") return;
    const style = excelStyles[styleName] ?? excelStyles.normal;
    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      if (!ws[address]) ws[address] = { t: "s", v: "" };
      ws[address].s = style;
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${meta.fileName}.xlsx`);
}
