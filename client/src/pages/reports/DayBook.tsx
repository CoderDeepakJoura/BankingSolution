import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { BookOpen, FileSpreadsheet, FileText, Printer, Search } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayBookApi, { DayBook, DayBookEntry, DayBookGroup } from "../../services/reports/dayBookApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";
import DatePicker from "../../components/DatePicker";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Extract date part without any UTC conversion — avoids day-shift in UTC+5:30
const isoDatePart = (iso: string) => iso.split("T")[0];

const localDate = (iso: string) => {
  const [y, m, d] = isoDatePart(iso).split("-").map(Number);
  return new Date(y, m - 1, d); // local time — no UTC shift
};

const fmtDate = (iso: string) =>
  localDate(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });

const fmtShort = (iso: string) =>
  localDate(iso).toLocaleDateString("en-GB");

const fmtDateKey = (iso: string) => isoDatePart(iso);

const toInputDate = (iso: string) => isoDatePart(iso);

const particulars = (e: DayBookEntry, longNar: boolean) => {
  const base = `V.No.:- ${e.voucherNo} ${e.accountName} - ${e.accountIdentifier}`;
  return longNar && e.narration ? `${base}- ${e.narration}` : base;
};

// Group entries by date, preserving order
const groupByDate = (entries: DayBookEntry[]) => {
  const map = new Map<string, DayBookEntry[]>();
  for (const e of entries) {
    const key = fmtDateKey(e.voucherDate);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
};

// ── TD helpers for screen ─────────────────────────────────────────────────────
const TD = ({ children, className = "", colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) => (
  <td colSpan={colSpan} className={`border border-gray-400 px-2 py-1 text-xs ${className}`}>{children}</td>
);
const TH = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <th className={`border border-gray-400 px-2 py-1 text-xs font-bold bg-blue-100 text-gray-800 sticky top-0 z-10 ${className}`}>{children}</th>
);
// Sticky tfoot cell — always visible at bottom of scroll container
const TDF = ({ children, className = "", colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) => (
  <td colSpan={colSpan} className={`border border-gray-400 px-2 py-1 text-xs sticky bottom-0 z-10 ${className}`}>{children}</td>
);

// ── Screen: Combined LR table (both sides zipped so Total rows always align) ──
const LRCombinedScreen: React.FC<{
  data: DayBook;
  longNar: boolean;
  filterMode: "date" | "head";
}> = ({ data, longNar, filterMode }) => {
  const isHead = filterMode === "head";
  const colsPerSide = isHead ? 5 : 4;
  const empty: LRRow = { type: "empty", cells: Array<string>(colsPerSide).fill("") };

  const leftRows  = buildSideRows(data.receiptGroups,  "receipts", data, longNar, filterMode);
  const rightRows = buildSideRows(data.paymentGroups, "payments", data, longNar, filterMode);

  const leftTotal  = leftRows[leftRows.length - 1];
  const rightTotal = rightRows[rightRows.length - 1];
  const leftBody   = leftRows.slice(0, -1);
  const rightBody  = rightRows.slice(0, -1);
  const maxBodyLen = Math.max(leftBody.length, rightBody.length);

  const zipped: [LRRow, LRRow][] = [
    ...Array.from({ length: maxBodyLen }, (_, i): [LRRow, LRRow] => [leftBody[i] ?? empty, rightBody[i] ?? empty]),
    [leftTotal, rightTotal],
  ];

  const colAlignDate = ["text-center", "text-left", "text-right", "text-right"];
  const colAlignHead = ["text-center", "text-center", "text-left", "text-right", "text-right"];
  const colAlign = isHead ? colAlignHead : colAlignDate;

  const dateHeaders = ["SNo", "Particulars", "Amount", "Date Total"];
  const headHeaders = ["SNo", "Date", "Particulars", "Amount", "Head Amt."];
  const headers = isHead ? headHeaders : dateHeaders;

  const cellStyle = (row: LRRow, ci: number) => {
    const s = LR_STYLES[row.type] ?? LR_STYLES.data;
    return {
      backgroundColor: `rgb(${s.fillColor.join(",")})`,
      color: `rgb(${s.textColor.join(",")})`,
      fontWeight: s.fontStyle === "bold" ? "bold" : undefined,
    } as React.CSSProperties;
  };

  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>
          {headers.map(h => <TH key={`lh-${h}`} className={h === "Particulars" ? "text-left" : h === "SNo" || h === "Date" ? "text-center" : "text-right"}>{h}</TH>)}
          <th className="w-1 p-0 bg-gray-500 border-0" />
          {headers.map(h => <TH key={`rh-${h}`} className={h === "Particulars" ? "text-left" : h === "SNo" || h === "Date" ? "text-center" : "text-right"}>{h}</TH>)}
        </tr>
      </thead>
      <tbody>
        {zipped.map(([left, right], ri) => (
          <tr key={ri}>
            {left.cells.map((cell, ci) => (
              <td key={`l${ci}`}
                className={`border border-gray-400 px-2 py-1 text-xs ${colAlign[ci] ?? ""} ${left.type === "total" ? "border-t-2 border-t-gray-500" : ""}`}
                style={cellStyle(left, ci)}>
                {cell}
              </td>
            ))}
            <td className="w-1 p-0 border-0" style={{ backgroundColor: "#999" }} />
            {right.cells.map((cell, ci) => (
              <td key={`r${ci}`}
                className={`border border-gray-400 px-2 py-1 text-xs ${colAlign[ci] ?? ""} ${right.type === "total" ? "border-t-2 border-t-gray-500" : ""}`}
                style={cellStyle(right, ci)}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ── Screen: Simple format ─────────────────────────────────────────────────────
const SimpleTable: React.FC<{ data: DayBook; longNar: boolean }> = ({ data, longNar }) => {
  const rows: { entry: DayBookEntry; side: "Dr" | "Cr" }[] = [];
  data.paymentGroups.forEach((g) => g.entries.forEach((e) => rows.push({ entry: e, side: "Dr" })));
  data.receiptGroups.forEach((g) => g.entries.forEach((e) => rows.push({ entry: e, side: "Cr" })));
  rows.sort((a, b) => {
    const dateDiff = fmtDateKey(a.entry.voucherDate).localeCompare(fmtDateKey(b.entry.voucherDate));
    return dateDiff !== 0 ? dateDiff : a.entry.voucherNo - b.entry.voucherNo;
  });

  let sno = 0;
  let lastDate = "";

  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>
          <TH className="w-10 text-center">S.No</TH>
          <TH className="w-16 text-center">Vr.No</TH>
          <TH className="text-left">Particulars</TH>
          <TH className="w-28 text-right">Dr Amount</TH>
          <TH className="w-28 text-right">Cr Amount</TH>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ entry, side }, i) => {
          const dateKey = fmtDateKey(entry.voucherDate);
          const showDateRow = dateKey !== lastDate;
          if (showDateRow) lastDate = dateKey;
          sno++;
          return (
            <React.Fragment key={i}>
              {showDateRow && (
                <tr className="bg-yellow-50">
                  <TD colSpan={5} className="text-center font-semibold text-yellow-800 py-0.5">
                    {fmtDate(entry.voucherDate)}
                  </TD>
                </tr>
              )}
              <tr className="hover:bg-gray-50">
                <TD className="text-center">{sno}</TD>
                <TD className="text-center">{entry.voucherNo}</TD>
                <TD>{particulars(entry, longNar)}</TD>
                <TD className="text-right text-red-700">{side === "Dr" ? fmt(entry.amount) : ""}</TD>
                <TD className="text-right text-green-700">{side === "Cr" ? fmt(entry.amount) : ""}</TD>
              </tr>
            </React.Fragment>
          );
        })}
        <tr className="bg-gray-200 border-t-2 border-gray-500 font-bold">
          <TD colSpan={3} className="text-right font-bold">Total</TD>
          <TD className="text-right font-bold text-red-700">{fmt(data.totalPayments)}</TD>
          <TD className="text-right font-bold text-green-700">{fmt(data.totalReceipts)}</TD>
        </tr>
      </tbody>
    </table>
  );
};

// ── LR PDF: two-column zipped layout ─────────────────────────────────────────

interface LRRow { type: "header" | "date" | "data" | "ob" | "cb" | "total" | "empty"; cells: string[]; }

const buildSideRows = (
  groups: DayBookGroup[],
  side: "receipts" | "payments",
  data: DayBook,
  longNar: boolean,
  filterMode: "date" | "head",
): LRRow[] => {
  const rows: LRRow[] = [];
  const isHead = filterMode === "head";
  let sno = 0;

  if (side === "receipts") {
    rows.push({
      type: "ob",
      cells: isHead
        ? ["", "", `Opening Balance on ${fmtDate(data.fromDate)}`, fmt(data.openingBalance), ""]
        : ["", `Opening Balance on ${fmtDate(data.fromDate)}`, fmt(data.openingBalance), ""],
    });
  }

  if (!isHead) {
    const all = groups.flatMap(g => g.entries);
    all.sort((a, b) => {
      const dd = fmtDateKey(a.voucherDate).localeCompare(fmtDateKey(b.voucherDate));
      return dd !== 0 ? dd : a.voucherNo - b.voucherNo;
    });
    groupByDate(all).forEach(({ date, items }) => {
      const dateTotal = items.reduce((s, e) => s + e.amount, 0);
      rows.push({ type: "date", cells: ["", fmtDate(date), fmt(dateTotal), fmt(dateTotal)] });
      items.forEach(e => { sno++; rows.push({ type: "data", cells: [String(sno), particulars(e, longNar), fmt(e.amount), "—"] }); });
    });
  } else {
    const allEntries = groups.flatMap(g => g.entries);
    const headMap = new Map<number, { name: string; entries: DayBookEntry[] }>();
    for (const e of allEntries) {
      if (!headMap.has(e.accHeadCode)) headMap.set(e.accHeadCode, { name: e.accHeadName || "Unknown", entries: [] });
      headMap.get(e.accHeadCode)!.entries.push(e);
    }
    Array.from(headMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, { name, entries }]) => ({
        name, total: entries.reduce((s, e) => s + e.amount, 0),
        entries: [...entries].sort((a, b) => {
          const dd = fmtDateKey(a.voucherDate).localeCompare(fmtDateKey(b.voucherDate));
          return dd !== 0 ? dd : a.voucherNo - b.voucherNo;
        }),
      }))
      .forEach(({ name, total, entries }) => {
        rows.push({ type: "header", cells: ["", "", name, "", fmt(total)] });
        entries.forEach(e => { sno++; rows.push({ type: "data", cells: [String(sno), fmtShort(e.voucherDate), particulars(e, longNar), fmt(e.amount), "0.00"] }); });
      });
  }

  if (side === "payments") {
    rows.push({
      type: "cb",
      cells: isHead
        ? ["", "", "Closing Balance", fmt(data.closingBalance), ""]
        : ["", "Closing Balance", fmt(data.closingBalance), ""],
    });
  }

  const grandTotal = side === "receipts"
    ? data.openingBalance + data.totalReceipts
    : data.totalPayments + data.closingBalance;
  rows.push({
    type: "total",
    cells: isHead
      ? ["", "", "Total", fmt(grandTotal), fmt(grandTotal)]
      : ["", "Total", fmt(grandTotal), fmt(grandTotal)],
  });
  return rows;
};

const LR_STYLES: Record<string, { fillColor: [number,number,number]; textColor: [number,number,number]; fontStyle: "normal"|"bold" }> = {
  data:   { fillColor: [255,255,255], textColor: [0,0,0],       fontStyle: "normal" },
  date:   { fillColor: [254,252,232], textColor: [133,77,14],   fontStyle: "bold"   },
  header: { fillColor: [219,234,254], textColor: [30,64,175],   fontStyle: "bold"   },
  ob:     { fillColor: [254,242,242], textColor: [185,28,28],   fontStyle: "bold"   },
  cb:     { fillColor: [240,253,244], textColor: [22,101,52],   fontStyle: "bold"   },
  total:  { fillColor: [229,231,235], textColor: [17,24,39],    fontStyle: "bold"   },
  empty:  { fillColor: [255,255,255], textColor: [200,200,200], fontStyle: "normal" },
};

const exportDayBookLRPdf = (data: DayBook, longNar: boolean, filterMode: "date" | "head") => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth(); // 297
  const margin = 10;
  const isHead = filterMode === "head";
  const colsPerSide = isHead ? 5 : 4;   // columns on each side (excluding divider)
  const divCol = colsPerSide;            // divider column index
  let y = margin;

  // Report header
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text(data.branchName.toUpperCase(), pageWidth / 2, y + 5, { align: "center" });
  doc.setLineWidth(0.4); doc.line(margin, y + 6, pageWidth - margin, y + 6);
  y += 10;
  if (data.branchAddress) {
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(data.branchAddress, pageWidth / 2, y + 4, { align: "center" }); y += 7;
  }
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(`Day Book From: ${fmtDate(data.fromDate)} To ${fmtDate(data.toDate)}`, pageWidth / 2, y + 4, { align: "center" });
  y += 8;

  // Day label box (matches screen)
  const dayLabel = `DayBook on : ${fmtShort(data.fromDate)}${data.fromDate !== data.toDate ? " — " + fmtShort(data.toDate) : ""}`;
  doc.setFillColor(245, 245, 245); doc.setDrawColor(170, 170, 170);
  doc.rect(margin, y, pageWidth - margin * 2, 6, "FD");
  doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(50, 50, 50);
  doc.text(dayLabel, pageWidth / 2, y + 4, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 8;

  // Section labels (Receipts / Payments)
  const usable = pageWidth - margin * 2;
  const divW = 2; const sideW = (usable - divW) / 2;
  doc.setFillColor(30, 64, 175); doc.rect(margin, y, sideW, 6, "F");
  doc.setTextColor(255,255,255); doc.setFontSize(9); doc.setFont("helvetica","bold");
  doc.text("RECEIPTS", margin + sideW / 2, y + 4.2, { align: "center" });
  doc.setFillColor(159, 18, 57); doc.rect(margin + sideW + divW, y, sideW, 6, "F");
  doc.text("PAYMENTS", margin + sideW + divW + sideW / 2, y + 4.2, { align: "center" });
  doc.setTextColor(0,0,0); y += 7;

  // Build & zip rows — keep Total pinned to the last row on both sides
  const leftRows  = buildSideRows(data.receiptGroups, "receipts", data, longNar, filterMode);
  const rightRows = buildSideRows(data.paymentGroups, "payments", data, longNar, filterMode);
  const empty: LRRow = { type: "empty", cells: Array<string>(colsPerSide).fill("") };
  // Separate the final "total" row from the body rows on each side
  const leftTotal  = leftRows[leftRows.length - 1];
  const rightTotal = rightRows[rightRows.length - 1];
  const leftBody   = leftRows.slice(0, -1);
  const rightBody  = rightRows.slice(0, -1);
  const maxBodyLen = Math.max(leftBody.length, rightBody.length);
  const zipped: [LRRow, LRRow][] = [
    ...Array.from({ length: maxBodyLen }, (_, i): [LRRow, LRRow] => [leftBody[i] ?? empty, rightBody[i] ?? empty]),
    [leftTotal, rightTotal],  // both Totals always on the same last row
  ];

  // Column widths — total must equal usable (277mm)
  // Date-wise:  9+82+24+22.5 | 2 | 9+82+24+22.5  = 277
  // Head-wise:  9+17+72+22+17.5 | 2 | 9+17+72+22+17.5 = 277
  const dateColStyles: Record<number, object> = {
    0: { cellWidth: 9,    halign: "center" }, 1: { cellWidth: 82,   halign: "left"   },
    2: { cellWidth: 24,   halign: "right"  }, 3: { cellWidth: 22.5, halign: "right"  },
    4: { cellWidth: divW, halign: "center" },
    5: { cellWidth: 9,    halign: "center" }, 6: { cellWidth: 82,   halign: "left"   },
    7: { cellWidth: 24,   halign: "right"  }, 8: { cellWidth: 22.5, halign: "right"  },
  };
  const headColStyles: Record<number, object> = {
    0:  { cellWidth: 9,    halign: "center" }, 1:  { cellWidth: 17,   halign: "center" },
    2:  { cellWidth: 72,   halign: "left"   }, 3:  { cellWidth: 22,   halign: "right"  },
    4:  { cellWidth: 17.5, halign: "right"  },
    5:  { cellWidth: divW, halign: "center" },
    6:  { cellWidth: 9,    halign: "center" }, 7:  { cellWidth: 17,   halign: "center" },
    8:  { cellWidth: 72,   halign: "left"   }, 9:  { cellWidth: 22,   halign: "right"  },
    10: { cellWidth: 17.5, halign: "right"  },
  };
  const dateHead = ["SNo", "Particulars", "Amount", "Date Total", "", "SNo", "Particulars", "Amount", "Date Total"];
  const headHead = ["SNo", "Date", "Particulars", "Amount", "Head Amt.", "", "SNo", "Date", "Particulars", "Amount", "Head Amt."];

  autoTable(doc, {
    startY: y,
    head: [isHead ? headHead : dateHead],
    body: zipped.map(([l, r]) => [...l.cells, "", ...r.cells]),
    margin: { left: margin, right: margin },
    columnStyles: isHead ? headColStyles : dateColStyles,
    headStyles: { fillColor: [208,216,240], textColor: [0,0,0], fontStyle: "bold", halign: "center", fontSize: 7.5 },
    styles: { cellPadding: 1.2, fontSize: 7.5, overflow: "linebreak" },
    didParseCell: (h) => {
      if (h.section === "head") {
        if (h.column.index === divCol) { h.cell.styles.fillColor = [136,136,136] as any; h.cell.text = [""]; }
        return;
      }
      const [l, r] = zipped[h.row.index];
      const ci = h.column.index;
      if (ci === divCol) { h.cell.styles.fillColor = [180,180,180] as any; h.cell.text = [""]; return; }
      const row = ci < divCol ? l : r;
      const s = LR_STYLES[row.type] ?? LR_STYLES.data;
      h.cell.styles.fillColor = s.fillColor as any;
      h.cell.styles.textColor = s.textColor as any;
      h.cell.styles.fontStyle = s.fontStyle;
    },
    didDrawPage: (h) => {
      const pc = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7); doc.setFont("helvetica","normal");
      doc.text(`Page ${h.pageNumber} of ${pc}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 5, { align: "right" });
    },
  });

  doc.save(`DayBook_${fmtDateKey(data.fromDate)}_${fmtDateKey(data.toDate)}.pdf`);
};

// ── Export config builder (used by PDF + Excel) ───────────────────────────────
const buildExportConfig = (data: DayBook, longNar: boolean): ExportConfig => {
  const columns = [
    { header: "S.No",        widthRatio: 0.05, align: "center" as const },
    { header: "Date",        widthRatio: 0.11, align: "center" as const },
    { header: "V.No.",       widthRatio: 0.07, align: "center" as const },
    { header: "Particulars", widthRatio: 0.47, align: "left"   as const },
    { header: "Dr Amount",   widthRatio: 0.15, align: "right"  as const },
    { header: "Cr Amount",   widthRatio: 0.15, align: "right"  as const },
  ];

  const rows: ExportRow[] = [];
  let sno = 0;

  // Opening balance
  rows.push({
    style: "ob",
    spanFirst: 4,
    cells: [`Opening Balance on ${fmtDate(data.fromDate)}`, "", "", "", "", fmt(data.openingBalance)],
  });

  // Build receipt rows (Cr)
  data.receiptGroups.forEach((g) => {
    // spanFirst:5 → first 5 cols merged for label, col 6 (Cr Amount) holds group total
    rows.push({ style: "group", spanFirst: 5, cells: [`RECEIPTS — ${g.groupName}`, "", "", "", "", fmt(g.groupTotal)] });
    groupByDate(g.entries).forEach(({ date, items }) => {
      rows.push({ style: "date", spanFirst: 6, cells: [fmtDate(date), "", "", "", "", ""] });
      items.forEach((e) => {
        sno++;
        rows.push({
          style: "normal",
          cells: [String(sno), fmtDate(e.voucherDate), String(e.voucherNo), particulars(e, longNar), "", fmt(e.amount)],
        });
      });
    });
  });

  // Build payment rows (Dr)
  data.paymentGroups.forEach((g) => {
    // spanFirst:5 → first 5 cols merged for label, col 5 (Dr Amount) holds group total
    rows.push({ style: "group", spanFirst: 5, cells: [`PAYMENTS — ${g.groupName}`, "", "", "", fmt(g.groupTotal), ""] });
    groupByDate(g.entries).forEach(({ date, items }) => {
      rows.push({ style: "date", spanFirst: 6, cells: [fmtDate(date), "", "", "", "", ""] });
      items.forEach((e) => {
        sno++;
        rows.push({
          style: "normal",
          cells: [String(sno), fmtDate(e.voucherDate), String(e.voucherNo), particulars(e, longNar), fmt(e.amount), ""],
        });
      });
    });
  });

  // Closing balance
  rows.push({
    style: "cb",
    spanFirst: 4,
    cells: ["Closing Balance", "", "", "", "", fmt(data.closingBalance)],
  });

  // Totals
  rows.push({
    style: "total",
    spanFirst: 4,
    cells: ["Total", "", "", "", fmt(data.totalPayments), fmt(data.totalReceipts)],
  });

  return {
    meta: {
      title: data.branchName,
      subtitle: data.branchAddress,
      reportTitle: `Day Book From: ${fmtDate(data.fromDate)} To ${fmtDate(data.toDate)}`,
      fileName: `DayBook_${fmtDateKey(data.fromDate)}_${fmtDateKey(data.toDate)}`,
      landscape: true,
    },
    columns,
    rows,
  };
};

// ── Print HTML generator ──────────────────────────────────────────────────────
const buildPrintHTML = (
  data: DayBook,
  withLeftRight: boolean,
  longNar: boolean,
  filterMode: "date" | "head" = "head"
): string => {
  const par = (e: DayBookEntry) => {
    const base = `V.No.:- ${e.voucherNo} ${e.accountName} - ${e.accountIdentifier}`;
    return longNar && e.narration ? `${base}- ${e.narration}` : base;
  };

  const buildLRTable = (groups: DayBookGroup[], side: "receipts" | "payments"): string => {
    const total =
      side === "receipts"
        ? data.openingBalance + data.totalReceipts
        : data.totalPayments + data.closingBalance;

    let sno = 0;
    let rows = "";
    const isHead = filterMode === "head";
    // date mode = 4 cols, head mode = 5 cols (adds Date column)
    const spanAll = isHead ? 5 : 4;

    if (side === "receipts") {
      rows += isHead
        ? `<tr class="ob-row">
            <td class="sno"></td><td></td>
            <td>Opening Balance on ${fmtDate(data.fromDate)}</td>
            <td class="amt">${fmt(data.openingBalance)}</td><td class="amt"></td>
           </tr>`
        : `<tr class="ob-row">
            <td class="sno"></td>
            <td>Opening Balance on ${fmtDate(data.fromDate)}</td>
            <td class="amt">${fmt(data.openingBalance)}</td><td class="amt"></td>
           </tr>`;
    }

    if (!isHead) {
      // Date-wise: flatten + sort, one date header then entries
      const all = groups.flatMap((g) => g.entries);
      all.sort((a, b) => {
        const dd = fmtDateKey(a.voucherDate).localeCompare(fmtDateKey(b.voucherDate));
        return dd !== 0 ? dd : a.voucherNo - b.voucherNo;
      });
      groupByDate(all).forEach(({ date, items }) => {
        const dateTotal = items.reduce((s, e) => s + e.amount, 0);
        rows += `<tr class="date-row">
          <td class="sno"></td>
          <td>${fmtDate(date)}</td>
          <td class="amt">${fmt(dateTotal)}</td>
          <td class="amt">${fmt(dateTotal)}</td>
        </tr>`;
        items.forEach((e) => {
          sno++;
          rows += `<tr>
            <td class="sno">${sno}</td>
            <td>${par(e)}</td>
            <td class="amt">${fmt(e.amount)}</td>
            <td class="amt">—</td>
          </tr>`;
        });
      });
    } else {
      // Head-wise: flatten + group by accHeadCode, sort by headcode order
      const allEntries = groups.flatMap((g) => g.entries);
      const headMap = new Map<number, { name: string; entries: typeof allEntries }>();
      for (const e of allEntries) {
        if (!headMap.has(e.accHeadCode))
          headMap.set(e.accHeadCode, { name: e.accHeadName || "Unknown", entries: [] });
        headMap.get(e.accHeadCode)!.entries.push(e);
      }
      const headGroups = Array.from(headMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([, { name, entries }]) => ({
          name,
          total: entries.reduce((s, e) => s + e.amount, 0),
          entries: [...entries].sort((a, b) => {
            const dd = fmtDateKey(a.voucherDate).localeCompare(fmtDateKey(b.voucherDate));
            return dd !== 0 ? dd : a.voucherNo - b.voucherNo;
          }),
        }));

      headGroups.forEach(({ name, total, entries }) => {
        rows += `<tr class="group-row">
          <td colspan="4" style="font-weight:bold">${name}</td>
          <td class="amt">${fmt(total)}</td>
        </tr>`;
        entries.forEach((e) => {
          sno++;
          rows += `<tr>
            <td class="sno">${sno}</td>
            <td style="text-align:center;white-space:nowrap">${fmtShort(e.voucherDate)}</td>
            <td>${par(e)}</td>
            <td class="amt">${fmt(e.amount)}</td>
            <td class="amt">0.00</td>
          </tr>`;
        });
      });
    }

    if (side === "payments") {
      rows += isHead
        ? `<tr class="cb-row">
            <td class="sno"></td><td></td>
            <td>Closing Balance</td>
            <td class="amt">${fmt(data.closingBalance)}</td><td class="amt"></td>
           </tr>`
        : `<tr class="cb-row">
            <td class="sno"></td>
            <td>Closing Balance</td>
            <td class="amt">${fmt(data.closingBalance)}</td><td class="amt"></td>
           </tr>`;
    }

    rows += isHead
      ? `<tr class="total-row">
          <td class="sno"></td><td></td>
          <td>Total</td>
          <td class="amt">${fmt(total)}</td>
          <td class="amt">${fmt(total)}</td>
         </tr>`
      : `<tr class="total-row">
          <td class="sno"></td>
          <td>Total</td>
          <td class="amt">${fmt(total)}</td>
          <td class="amt">${fmt(total)}</td>
         </tr>`;

    const thead = isHead
      ? `<tr>
          <th style="width:28px">SNo</th>
          <th style="width:70px">Date</th>
          <th style="text-align:left">Particulars</th>
          <th style="width:90px">Amount</th>
          <th style="width:90px">Head Amt.</th>
         </tr>`
      : `<tr>
          <th style="width:28px">SNo</th>
          <th style="text-align:left">Particulars</th>
          <th style="width:90px">Amount</th>
          <th style="width:90px">Date Total</th>
         </tr>`;

    return `<table>
      <thead>${thead}</thead>
      <tbody>${rows}</tbody>
    </table>`;
  };

  const buildSimpleTable = (): string => {
    const rows: { entry: DayBookEntry; side: "Dr" | "Cr" }[] = [];
    data.paymentGroups.forEach((g) => g.entries.forEach((e) => rows.push({ entry: e, side: "Dr" })));
    data.receiptGroups.forEach((g) => g.entries.forEach((e) => rows.push({ entry: e, side: "Cr" })));
    rows.sort((a, b) => {
      const dd = fmtDateKey(a.entry.voucherDate).localeCompare(fmtDateKey(b.entry.voucherDate));
      return dd !== 0 ? dd : a.entry.voucherNo - b.entry.voucherNo;
    });

    let trs = "";
    let sno = 0;
    let lastDate = "";

    rows.forEach(({ entry, side }) => {
      const dateKey = fmtDateKey(entry.voucherDate);
      if (dateKey !== lastDate) {
        lastDate = dateKey;
        trs += `<tr class="date-row"><td colspan="5">${fmtDate(entry.voucherDate)}</td></tr>`;
      }
      sno++;
      trs += `<tr>
        <td style="text-align:center">${sno}</td>
        <td style="text-align:center">${entry.voucherNo}</td>
        <td>${par(entry)}</td>
        <td class="amt" style="color:${side === "Dr" ? "#900" : ""}">${side === "Dr" ? fmt(entry.amount) : ""}</td>
        <td class="amt" style="color:${side === "Cr" ? "#060" : ""}">${side === "Cr" ? fmt(entry.amount) : ""}</td>
      </tr>`;
    });

    trs += `<tr class="total-row">
      <td colspan="3" style="text-align:right">Total</td>
      <td class="amt">${fmt(data.totalPayments)}</td>
      <td class="amt">${fmt(data.totalReceipts)}</td>
    </tr>`;

    return `<table>
      <thead><tr>
        <th style="width:32px">S.No</th>
        <th style="width:48px">Vr.No</th>
        <th style="text-align:left">Particulars</th>
        <th style="width:90px">Dr Amount</th>
        <th style="width:90px">Cr Amount</th>
      </tr></thead>
      <tbody>${trs}</tbody>
    </table>`;
  };

  const bodyContent = withLeftRight
    ? `<table class="lr-outer">
        <tr>
          <td class="lr-cell">
            <div class="col-hdr receipts-hdr">Receipts</div>
            ${buildLRTable(data.receiptGroups, "receipts")}
          </td>
          <td class="lr-divider-cell"></td>
          <td class="lr-cell">
            <div class="col-hdr payments-hdr">Payments</div>
            ${buildLRTable(data.paymentGroups, "payments")}
          </td>
        </tr>
       </table>`
    : buildSimpleTable();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Day Book</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 12px; }

    .report-header { text-align:center; margin-bottom:10px; }
    .report-header h1 { font-size:14px; font-weight:bold; text-decoration:underline; text-transform:uppercase; }
    .report-header p  { font-size:11px; margin-top:2px; }
    .report-header h2 { font-size:12px; font-weight:bold; margin-top:6px; }

    .day-label { text-align:center; border:1px solid #aaa; background:#f5f5f5;
                 padding:3px; font-weight:bold; margin-bottom:6px; }

    .lr-outer        { width:100%; border-collapse:collapse; table-layout:fixed; }
    .lr-cell         { width:49.5%; vertical-align:top; padding:0; }
    .lr-divider-cell { width:1%; background:#888; padding:0; }

    .col-hdr { text-align:center; font-weight:bold; padding:4px;
               font-size:12px; border:1px solid #555; }
    .receipts-hdr { background:#1e40af; color:#fff; }
    .payments-hdr { background:#9f1239; color:#fff; }

    table { width:100%; border-collapse:collapse; }
    th { border:1px solid #666; padding:3px 4px; background:#d0d8f0;
         text-align:center; font-weight:bold; }
    td { border:1px solid #aaa; padding:2px 4px; vertical-align:top; }

    .date-row td  { background:#fefce8; color:#854d0e; font-weight:bold; text-align:center; font-size:10px; }
    .group-row td { background:#dbeafe; font-weight:bold; }
    .ob-row td    { background:#fef2f2; color:#b91c1c; font-weight:bold; }
    .cb-row td    { background:#f0fdf4; color:#166534; font-weight:bold; }
    .total-row td { background:#e5e7eb; font-weight:bold; border-top:2px solid #555; }
    .amt          { text-align:right; }
    .sno          { text-align:center; width:28px; }

    .summary { display:flex; gap:12px; justify-content:flex-end; margin-top:10px;
               flex-wrap:wrap; font-size:11px; }
    .summary-box { border:1px solid #ccc; padding:4px 10px; }
    .summary-box strong { font-weight:bold; }

    @media print {
      body { padding:6px; }
      @page { margin:10mm; size:A4 landscape; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${data.branchName}</h1>
    <p>${data.branchAddress}</p>
    <h2>Day Book From: ${fmtDate(data.fromDate)} To ${fmtDate(data.toDate)}</h2>
  </div>

  <div class="day-label">
    DayBook on : ${fmtShort(data.fromDate)}${data.fromDate !== data.toDate ? " — " + fmtShort(data.toDate) : ""}
  </div>

  ${bodyContent}

  <div class="summary">
    <div class="summary-box">Opening Balance: <strong>${fmt(data.openingBalance)}</strong></div>
    <div class="summary-box">Total Receipts: <strong>${fmt(data.totalReceipts)}</strong></div>
    <div class="summary-box">Total Payments: <strong>${fmt(data.totalPayments)}</strong></div>
    <div class="summary-box">Closing Balance: <strong>${fmt(data.closingBalance)}</strong></div>
  </div>
</body>
</html>`;
};

// ── Main Component ────────────────────────────────────────────────────────────
const DayBookPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();

  const workingDate = user.workingdate
    ? commonservice.parseWorkingDate(user.workingdate)
    : new Date().toISOString().split("T")[0];

  const [sessionMinDate, setSessionMinDate] = useState("");
  const [sessionMaxDate, setSessionMaxDate] = useState(workingDate);
  const [fromDate, setFromDate] = useState(workingDate);
  const [toDate, setToDate] = useState(workingDate);
  const [withLongNarration, setWithLongNarration] = useState(false);
  const [withLeftRight, setWithLeftRight] = useState(true);
  const [lrFilter, setLrFilter] = useState<"date" | "head">("date");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DayBook | null>(null);

  // Fetch session dates on mount to constrain date pickers
  useEffect(() => {
    if (!user.branchid) return;
    dayBookApi.getSessionDates(user.branchid).then((res) => {
      if (res.success && res.data) {
        const minD = toInputDate(res.data.fromDate);
        const maxD = workingDate < toInputDate(res.data.toDate)
          ? workingDate
          : toInputDate(res.data.toDate);
        setSessionMinDate(minD);
        setSessionMaxDate(maxD);
        // Clamp current dates within session
        if (fromDate < minD) setFromDate(minD);
        if (toDate < minD) setToDate(minD);
      }
    }).catch(() => {/* silently ignore — date pickers still work without bounds */});
  }, [user.branchid]);

  const handleShow = async () => {
    if (!fromDate || !toDate) {
      Swal.fire("Validation", "Please select both From Date and To Date.", "warning");
      return;
    }
    if (fromDate > toDate) {
      Swal.fire("Validation", "From Date cannot be after To Date.", "warning");
      return;
    }
    if (sessionMinDate && fromDate < sessionMinDate) {
      Swal.fire("Validation", "From Date is before the current session start date.", "warning");
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const res = await dayBookApi.getDayBook(user.branchid, fromDate, toDate);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        Swal.fire("Error", res.message || "Failed to load day book.", "error");
      }
    } catch (e: any) {
      Swal.fire("Error", e?.message || "Unable to reach server.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = () => {
    if (!data) return;
    if (withLeftRight) {
      exportDayBookLRPdf(data, withLongNarration, lrFilter);
    } else {
      exportToPdf(buildExportConfig(data, withLongNarration));
    }
  };

  const handleExportExcel = () => {
    if (!data) return;
    exportToExcel(buildExportConfig(data, withLongNarration));
  };

  const handlePrint = () => {
    if (!data) return;
    const html = buildPrintHTML(data, withLeftRight, withLongNarration, lrFilter);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">

            {/* ── Form Card ── */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Day Book</h2>
                  <p className="text-sm text-gray-600">View all transactions for a date range</p>
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-wrap items-end gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={fromDate}
                      onChange={setFromDate}
                      min={sessionMinDate || undefined}
                      max={sessionMaxDate}
                      workingDate={workingDate}
                      className="px-3 py-2 border-2 border-gray-200 rounded-lg w-44"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={toDate}
                      onChange={setToDate}
                      min={sessionMinDate || undefined}
                      max={sessionMaxDate}
                      workingDate={workingDate}
                      className="px-3 py-2 border-2 border-gray-200 rounded-lg w-44"
                    />
                  </div>
                  {sessionMinDate && (
                    <div className="text-xs text-gray-500 pb-1">
                      Session: {fmtDate(sessionMinDate)} — {fmtDate(sessionMaxDate)}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-0.5">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={withLongNarration}
                        onChange={(e) => setWithLongNarration(e.target.checked)}
                        className="w-4 h-4 accent-blue-600"
                      />
                      With Long Narration
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={withLeftRight}
                        onChange={(e) => setWithLeftRight(e.target.checked)}
                        className="w-4 h-4 accent-blue-600"
                      />
                      With Left Right Format
                    </label>
                    {withLeftRight && (
                      <div className="flex items-center gap-1 bg-gray-100 border border-gray-300 rounded-lg p-1 text-xs">
                        <button
                          onClick={() => setLrFilter("date")}
                          className={`px-3 py-1 rounded-md font-semibold transition-all ${
                            lrFilter === "date"
                              ? "bg-blue-600 text-white shadow"
                              : "text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Date Wise
                        </button>
                        <button
                          onClick={() => setLrFilter("head")}
                          className={`px-3 py-1 rounded-md font-semibold transition-all ${
                            lrFilter === "head"
                              ? "bg-blue-600 text-white shadow"
                              : "text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Head Wise
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 pb-0.5">
                    <button
                      onClick={handleShow}
                      disabled={loading}
                      className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 shadow-sm"
                    >
                      {loading
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Search className="w-4 h-4" />}
                      {loading ? "Loading..." : "Show"}
                    </button>
                    {data && (
                      <>
                        <button
                          onClick={handlePrint}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
                        >
                          <Printer className="w-4 h-4" />
                          Print
                        </button>
                        <button
                          onClick={handleExportPdf}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
                        >
                          <FileText className="w-4 h-4" />
                          PDF
                        </button>
                        <button
                          onClick={handleExportExcel}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          Excel
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => navigate("/dashboard")}
                      className="px-5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg border border-gray-300 transition-all"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <p className="text-xs text-blue-600 font-medium mt-3 text-right">
                  Fields marked with * are mandatory
                </p>
              </div>
            </div>

            {/* ── Report ── */}
            {data && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Report header */}
                <div className="text-center py-4 border-b border-gray-200 px-4 bg-gray-50">
                  <h1 className="text-base font-bold uppercase underline tracking-wide text-gray-900">
                    {data.branchName}
                  </h1>
                  <p className="text-sm text-gray-600 mt-0.5">{data.branchAddress}</p>
                  <h2 className="text-sm font-bold text-gray-800 mt-2">
                    Day Book From: {fmtDate(data.fromDate)} To {fmtDate(data.toDate)}
                  </h2>
                </div>

                <div className="p-4">
                  {/* Day label */}
                  <div className="text-center border border-gray-400 bg-gray-100 py-1.5 mb-3 text-sm font-semibold text-gray-800 rounded">
                    DayBook on : {fmtShort(data.fromDate)}
                    {data.fromDate !== data.toDate && ` — ${fmtShort(data.toDate)}`}
                  </div>

                  {withLeftRight ? (
                    /* ── Left / Right ── */
                    <div className="border border-gray-400 rounded overflow-hidden">
                      <div className="flex">
                        <div className="flex-1 text-center bg-blue-700 text-white font-bold py-1.5 text-sm tracking-wide">
                          Receipts
                        </div>
                        <div className="w-1 bg-gray-500" />
                        <div className="flex-1 text-center bg-rose-700 text-white font-bold py-1.5 text-sm tracking-wide">
                          Payments
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-[65vh] overflow-x-auto">
                        <LRCombinedScreen
                          data={data}
                          longNar={withLongNarration}
                          filterMode={lrFilter}
                        />
                      </div>
                    </div>
                  ) : (
                    /* ── Simple / sequential ── */
                    <div className="border border-gray-400 rounded overflow-hidden overflow-y-auto max-h-[65vh] overflow-x-auto">
                      <SimpleTable data={data} longNar={withLongNarration} />
                    </div>
                  )}

                  {/* Summary bar */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {[
                      { label: "Opening Balance", value: data.openingBalance, color: "blue" },
                      { label: "Total Receipts",  value: data.totalReceipts,  color: "green" },
                      { label: "Total Payments",  value: data.totalPayments,  color: "red" },
                      { label: "Closing Balance", value: data.closingBalance, color: "purple" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-lg px-4 py-2.5 flex flex-col`}>
                        <span className="text-xs text-gray-500">{label}</span>
                        <span className={`font-bold text-${color}-700 text-base`}>₹{fmt(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      }
    />
  );
};

export default DayBookPage;
