import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RowStyle =
  | "normal"    // plain data row
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
  group:    { fillColor: [219, 234, 254], textColor: [30, 64, 175],    fontStyle: "bold"   },
  date:     { fillColor: [254, 252, 232], textColor: [133, 77, 14],    fontStyle: "bold"   },
  ob:       { fillColor: [254, 242, 242], textColor: [185, 28, 28],    fontStyle: "bold"   },
  cb:       { fillColor: [240, 253, 244], textColor: [22, 101, 52],    fontStyle: "bold"   },
  subtotal: { fillColor: [243, 244, 246], textColor: [55, 65, 81],     fontStyle: "bold"   },
  total:    { fillColor: [229, 231, 235], textColor: [17, 24, 39],     fontStyle: "bold"   },
};

export function exportToPdf(config: ExportConfig): void {
  const { meta, columns, rows } = config;
  const orientation = meta.landscape ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

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

  // Build autoTable body
  const body: Parameters<typeof autoTable>[1]["body"] = rows.map((row) => {
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

  // Header rows
  wsData.push([meta.title]);
  if (meta.subtitle) wsData.push([meta.subtitle]);
  wsData.push([meta.reportTitle]);
  wsData.push([]); // blank separator

  // Column headers
  wsData.push(columns.map((c) => c.header));

  // Data rows — flatten colspan rows by repeating the merged value
  rows.forEach((row) => {
    if (row.spanFirst && row.spanFirst > 1) {
      const label = row.cells.slice(0, row.spanFirst).join(" ").trim() || row.cells[0];
      const rest = row.cells.slice(row.spanFirst);
      wsData.push([label, ...Array(row.spanFirst - 1).fill(""), ...rest]);
    } else {
      wsData.push(row.cells);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths (approximate character widths)
  ws["!cols"] = columns.map((col) => ({
    wch: col.widthRatio ? Math.round(col.widthRatio * 120) : 20,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${meta.fileName}.xlsx`);
}
